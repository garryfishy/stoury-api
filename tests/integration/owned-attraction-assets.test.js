const path = require("path");
const { spawnSync } = require("child_process");
const request = require("supertest");
const { app } = require("./helpers/app");
const { authHeader, registerAndLogin } = require("./helpers/auth");
const {
  cleanupTestArtifacts,
  closeTestDb,
  db,
  ensureTestDbReady,
} = require("./helpers/db");
const { loadSeedData } = require("./helpers/seed-data");
const {
  buildManualTripPayload,
  buildPrimaryBaliItineraryPayload,
} = require("./helpers/builders");
const { googlePlacesClient } = require("../../src/services/google-places");

const repoRoot = path.resolve(__dirname, "../..");
const OWNED_ASSET_URL_PATTERN =
  /^http:\/\/localhost:3000\/assets\/attractions\/[^/]+\/.+-(thumbnail|main)\.svg$/;
const SAMPLE_SLUGS = ["tanah-lot", "barelang-bridge", "prambanan-temple"];

const parseBackfillSummary = (output) => {
  const summaryMatch = String(output || "").match(/\{\s*"generatedFiles"[\s\S]*\}\s*$/);

  if (!summaryMatch) {
    throw new Error(`Unable to parse backfill summary from output:\n${output}`);
  }

  return JSON.parse(summaryMatch[0]);
};

const runBackfill = (args = []) => {
  const result = spawnSync(
    process.execPath,
    ["scripts/backfill-owned-attraction-assets.js", "--env", "test", ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `Backfill failed with status ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    summary: parseBackfillSummary(result.stdout),
  };
};

const findActiveAttractionsBySlug = async (slugs) => {
  const records = await Promise.all(
    slugs.map((slug) =>
      db.Attraction.findOne({
        where: {
          slug,
          isActive: true,
        },
      })
    )
  );

  return Object.fromEntries(records.map((record) => [record.slug, record]));
};

describe("owned attraction assets integration", () => {
  let seedData;

  beforeAll(async () => {
    await ensureTestDbReady();
    await cleanupTestArtifacts();
    runBackfill(["--force"]);
    seedData = await loadSeedData();
  });

  beforeEach(async () => {
    await cleanupTestArtifacts();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cleanupTestArtifacts();
  });

  afterAll(async () => {
    await cleanupTestArtifacts();
    await closeTestDb();
  });

  test("backfill populates active attractions with managed owned asset URLs in the DB", async () => {
    const attractions = await db.Attraction.findAll({
      where: {
        isActive: true,
      },
      order: [["slug", "ASC"]],
    });

    expect(attractions.length).toBeGreaterThanOrEqual(72);
    expect(
      attractions.every(
        (attraction) =>
          OWNED_ASSET_URL_PATTERN.test(String(attraction.thumbnailImageUrl || "")) &&
          OWNED_ASSET_URL_PATTERN.test(String(attraction.mainImageUrl || "")) &&
          attraction.metadata?.assetSource?.provider === "stoury" &&
          attraction.metadata?.assetSource?.strategy === "generated_svg_v1"
      )
    ).toBe(true);

    const samples = await findActiveAttractionsBySlug(SAMPLE_SLUGS);

    expect(samples["tanah-lot"]).toMatchObject({
      thumbnailImageUrl:
        "http://localhost:3000/assets/attractions/bali/tanah-lot-thumbnail.svg",
      mainImageUrl: "http://localhost:3000/assets/attractions/bali/tanah-lot-main.svg",
    });
    expect(samples["barelang-bridge"]).toMatchObject({
      thumbnailImageUrl:
        "http://localhost:3000/assets/attractions/batam/barelang-bridge-thumbnail.svg",
      mainImageUrl:
        "http://localhost:3000/assets/attractions/batam/barelang-bridge-main.svg",
    });
    expect(samples["prambanan-temple"]).toMatchObject({
      thumbnailImageUrl:
        "http://localhost:3000/assets/attractions/yogyakarta/prambanan-temple-thumbnail.svg",
      mainImageUrl:
        "http://localhost:3000/assets/attractions/yogyakarta/prambanan-temple-main.svg",
    });
  });

  test("detail, list, dashboard, and itinerary surfaces return the DB-backed asset URLs without using Google photo fetch", async () => {
    const textSearchSpy = jest
      .spyOn(googlePlacesClient, "textSearch")
      .mockRejectedValue(
        new Error("textSearch should not run during normal attraction presentation")
      );
    const getPlaceDetailsSpy = jest
      .spyOn(googlePlacesClient, "getPlaceDetails")
      .mockRejectedValue(
        new Error("getPlaceDetails should not run during normal attraction presentation")
      );
    const getPlacePhotoSpy = jest
      .spyOn(googlePlacesClient, "getPlacePhoto")
      .mockRejectedValue(
        new Error("getPlacePhoto should not run during normal attraction presentation")
      );
    const samples = await findActiveAttractionsBySlug(SAMPLE_SLUGS);

    const detailResponse = await request(app).get("/api/attractions/tanah-lot");

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.thumbnailImageUrl).toBe(
      samples["tanah-lot"].thumbnailImageUrl
    );
    expect(detailResponse.body.data.mainImageUrl).toBe(samples["tanah-lot"].mainImageUrl);

    const destinationListResponse = await request(app)
      .get(`/api/destinations/${seedData.destinations.bali.id}/attractions`)
      .query({ limit: 50 });

    expect(destinationListResponse.status).toBe(200);
    expect(destinationListResponse.body.data.items.length).toBeGreaterThan(0);

    const destinationAttractions = await db.Attraction.findAll({
      where: {
        destinationId: seedData.destinations.bali.id,
        isActive: true,
      },
    });
    const destinationAttractionsBySlug = new Map(
      destinationAttractions.map((attraction) => [attraction.slug, attraction])
    );

    expect(
      destinationListResponse.body.data.items.every((item) => {
        const attraction = destinationAttractionsBySlug.get(item.slug);

        return (
          attraction &&
          item.thumbnailImageUrl === attraction.thumbnailImageUrl &&
          item.mainImageUrl === attraction.mainImageUrl
        );
      })
    ).toBe(true);

    const dashboardResponse = await request(app).get("/api/dashboard/home");

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.data.featured.length).toBeGreaterThan(0);
    expect(
      dashboardResponse.body.data.featured.every((item) => {
        const attraction = seedData.attractions[item.slug];
        return attraction && item.thumbnailImageUrl === attraction.thumbnailImageUrl;
      })
    ).toBe(true);

    const auth = await registerAndLogin(request, app, {
      label: "owned-assets",
    });
    const tripResponse = await request(app)
      .post("/api/trips")
      .set(authHeader(auth.accessToken))
      .send(
        buildManualTripPayload({
          destinationId: seedData.destinations.bali.id,
          startDate: "2027-03-01",
          endDate: "2027-03-02",
        })
      );

    expect(tripResponse.status).toBe(201);

    const saveItineraryResponse = await request(app)
      .put(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken))
      .send(buildPrimaryBaliItineraryPayload(seedData));

    expect(saveItineraryResponse.status).toBe(200);

    const itineraryResponse = await request(app)
      .get(`/api/trips/${tripResponse.body.data.id}/itinerary`)
      .set(authHeader(auth.accessToken));

    expect(itineraryResponse.status).toBe(200);
    expect(
      itineraryResponse.body.data.days.every((day) =>
        day.items.every((item) => {
          const attraction = seedData.attractions[item.attraction.slug];

          return (
            attraction &&
            item.attraction.thumbnailImageUrl === attraction.thumbnailImageUrl &&
            item.attraction.mainImageUrl === attraction.mainImageUrl
          );
        })
      )
    ).toBe(true);

    expect(textSearchSpy).not.toHaveBeenCalled();
    expect(getPlaceDetailsSpy).not.toHaveBeenCalled();
    expect(getPlacePhotoSpy).not.toHaveBeenCalled();
  });

  test("rerunning the backfill skips already-managed attraction rows", async () => {
    const before = await findActiveAttractionsBySlug(SAMPLE_SLUGS);
    const beforeAssetTimestamps = Object.fromEntries(
      Object.entries(before).map(([slug, attraction]) => [
        slug,
        attraction.metadata?.assetSource?.updatedAt || null,
      ])
    );

    const rerun = runBackfill();
    const after = await findActiveAttractionsBySlug(SAMPLE_SLUGS);

    expect(rerun.summary).toMatchObject({
      generatedFiles: 0,
      skipped: 72,
      updated: 0,
      env: "test",
      strategy: "generated_svg_v1",
    });
    expect(
      Object.entries(after).every(([slug, attraction]) => {
        const beforeAttraction = before[slug];
        return (
          attraction.thumbnailImageUrl === beforeAttraction.thumbnailImageUrl &&
          attraction.mainImageUrl === beforeAttraction.mainImageUrl &&
          attraction.metadata?.assetSource?.updatedAt === beforeAssetTimestamps[slug]
        );
      })
    ).toBe(true);
  });
});
