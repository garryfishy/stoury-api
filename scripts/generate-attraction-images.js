#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const parseArgs = (argv) => {
  const options = {
    applyDb: false,
    baseUrl: null,
    destination: null,
    dryRun: false,
    env: process.env.NODE_ENV || "development",
    force: false,
    limit: null,
    manifestPath: path.join(
      process.cwd(),
      "scripts",
      "generated",
      "attraction-images.json"
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--env" && argv[index + 1]) {
      options.env = String(argv[index + 1]).trim();
      index += 1;
      continue;
    }

    if (token === "--base-url" && argv[index + 1]) {
      options.baseUrl = String(argv[index + 1]).trim();
      index += 1;
      continue;
    }

    if (token === "--destination" && argv[index + 1]) {
      options.destination = String(argv[index + 1]).trim().toLowerCase();
      index += 1;
      continue;
    }

    if (token === "--limit" && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      options.limit = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      index += 1;
      continue;
    }

    if (token === "--manifest" && argv[index + 1]) {
      options.manifestPath = path.resolve(String(argv[index + 1]).trim());
      index += 1;
      continue;
    }

    if (token === "--apply-db") {
      options.applyDb = true;
      continue;
    }

    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token === "--force") {
      options.force = true;
    }
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
process.env.NODE_ENV = options.env;

const env = require("../src/config/env");
const { getDb } = require("../src/database/db-context");
const { readRecordValue } = require("../src/utils/model-helpers");
const { attractions: seededAttractions, destinations: seededDestinations } = require(
  "../src/database/seeders/data/catalog"
);

const WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php";
const ASSET_PROVIDER = "wikimedia_commons";
const ASSET_STRATEGY = "commons_search_v1";
const ASSET_BASE_PATH = "/assets/attractions";

const getPublicBaseUrl = () =>
  String(options.baseUrl || env.OPENAPI_SERVER_URL || `http://localhost:${env.PORT}`).replace(
    /\/$/,
    ""
  );

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildAssetRelativePath = (destinationSlug, attractionSlug, variant, extension) =>
  path.join(
    "attractions",
    destinationSlug,
    `${attractionSlug}-${variant}.${extension}`
  );

const buildPublicAssetUrl = (destinationSlug, attractionSlug, variant, extension) =>
  `${getPublicBaseUrl()}${ASSET_BASE_PATH}/${destinationSlug}/${attractionSlug}-${variant}.${extension}`;

const createSeedDestinationMap = () =>
  new Map(
    seededDestinations.map((destination) => [
      slugify(destination.slug || destination.name),
      {
        id: destination.slug || destination.name,
        ...destination,
      },
    ])
  );

const isGooglePhotoUrl = (value) =>
  /googleapis\.com\/maps\/api\/place\/photo|googleusercontent\.com/i.test(
    String(value || "")
  );

const isGeneratedPhotoEndpointUrl = (value) =>
  /\/api\/attractions\/[^/]+\/photo\?variant=(thumbnail|main)/.test(String(value || ""));

const isSvgAssetUrl = (value) => /\.svg(?:\?|$)/i.test(String(value || ""));

const shouldReplaceAttractionImages = (attraction) => {
  if (options.force) {
    return true;
  }

  const thumbnailImageUrl = readRecordValue(attraction, ["thumbnailImageUrl"], null);
  const mainImageUrl = readRecordValue(attraction, ["mainImageUrl"], null);
  const metadata = readRecordValue(attraction, ["metadata"], {}) || {};

  return (
    !thumbnailImageUrl ||
    !mainImageUrl ||
    isGooglePhotoUrl(thumbnailImageUrl) ||
    isGooglePhotoUrl(mainImageUrl) ||
    isGeneratedPhotoEndpointUrl(thumbnailImageUrl) ||
    isGeneratedPhotoEndpointUrl(mainImageUrl) ||
    isSvgAssetUrl(thumbnailImageUrl) ||
    isSvgAssetUrl(mainImageUrl) ||
    metadata?.assetSource?.provider === "stoury"
  );
};

const inferExtension = ({ mimeType, directImageUrl }) => {
  const mime = String(mimeType || "").toLowerCase();

  if (mime === "image/jpeg") {
    return "jpg";
  }

  if (mime === "image/png") {
    return "png";
  }

  if (mime === "image/webp") {
    return "webp";
  }

  const pathname = (() => {
    try {
      return new URL(String(directImageUrl || "")).pathname;
    } catch (_error) {
      return "";
    }
  })();
  const extension = path.extname(pathname).replace(/^\./, "").toLowerCase();

  return extension || "jpg";
};

const fetchJson = async (url, params) => {
  const requestUrl = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      requestUrl.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikimedia request failed with HTTP ${response.status}`);
  }

  return response.json();
};

const searchCommonsFile = async (query) => {
  const data = await fetchJson(WIKIMEDIA_API_URL, {
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: 6,
    gsrlimit: 5,
    prop: "info",
    inprop: "url",
    origin: "*",
  });

  const pages = Object.values(data?.query?.pages || {});

  if (!pages.length) {
    return null;
  }

  const [firstPage] = pages.sort((left, right) => {
    const leftIndex = Number(left?.index || 0);
    const rightIndex = Number(right?.index || 0);
    return leftIndex - rightIndex;
  });

  return firstPage?.title || null;
};

const getDirectFileInfo = async (fileTitle) => {
  const data = await fetchJson(WIKIMEDIA_API_URL, {
    action: "query",
    format: "json",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    origin: "*",
  });

  const pages = Object.values(data?.query?.pages || {});

  if (!pages.length) {
    return null;
  }

  const [firstPage] = pages;
  const imageInfo = firstPage?.imageinfo?.[0];

  if (!imageInfo?.url) {
    return null;
  }

  const extMetadata = imageInfo.extmetadata || {};

  return {
    sourcePageUrl:
      imageInfo.descriptionurl ||
      `https://commons.wikimedia.org/wiki/${encodeURIComponent(
        String(fileTitle || "").replace(/ /g, "_")
      )}`,
    directImageUrl: imageInfo.url,
    mimeType: imageInfo.mime || null,
    licenseLabel:
      stripHtml(extMetadata.LicenseShortName?.value) ||
      stripHtml(extMetadata.License?.value) ||
      null,
    licenseUrl:
      stripHtml(extMetadata.LicenseUrl?.value) ||
      stripHtml(extMetadata.UsageTerms?.value) ||
      null,
    authorName:
      stripHtml(extMetadata.Artist?.value) ||
      stripHtml(extMetadata.Credit?.value) ||
      null,
    credit: stripHtml(extMetadata.Credit?.value) || null,
    attributionRequired:
      String(extMetadata.AttributionRequired?.value || "").trim().toLowerCase() === "true",
  };
};

const downloadImage = async (imageUrl) => {
  const response = await fetch(imageUrl, {
    headers: {
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Image download failed with HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

const writeBinaryFile = async (relativePath, bytes) => {
  const outputPath = path.join(process.cwd(), "src", "public", relativePath);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, bytes);

  return outputPath;
};

const main = async () => {
  const db = getDb();

  try {
    const dbAttractions = await db.Attraction.findAll({
      where: {
        isActive: true,
      },
      order: [["slug", "ASC"]],
    });
    let selectedAttractions;

    if (dbAttractions.length) {
      const destinationIds = [
        ...new Set(
          dbAttractions
            .map((attraction) => readRecordValue(attraction, ["destinationId"], null))
            .filter(Boolean)
        ),
      ];
      const destinations = await db.Destination.findAll({
        where: {
          id: destinationIds,
        },
      });
      const destinationById = new Map(
        destinations.map((destination) => [readRecordValue(destination, ["id"]), destination])
      );

      selectedAttractions = dbAttractions
        .map((attraction) => ({
          attraction,
          destination:
            destinationById.get(readRecordValue(attraction, ["destinationId"], null)) || null,
          isDbRecord: true,
        }))
        .filter(({ attraction, destination }) => destination && shouldReplaceAttractionImages(attraction));
    } else {
      const seededDestinationMap = createSeedDestinationMap();

      selectedAttractions = seededAttractions.map((attraction) => ({
        attraction,
        destination:
          seededDestinationMap.get(
            slugify(readRecordValue(attraction, ["destinationSlug"], ""))
          ) || null,
        isDbRecord: false,
      }));
    }

    if (!selectedAttractions.length) {
      throw new Error(
        `No attractions were available from the ${options.env} database or curated seed catalog.`
      );
    }

    selectedAttractions = selectedAttractions
      .filter(({ destination }) => destination)
      .filter(({ attraction, destination }) => {
        if (!options.destination) {
          return true;
        }

        return (
          slugify(readRecordValue(destination, ["slug"], "")) === options.destination ||
          slugify(readRecordValue(attraction, ["slug"], "")) === options.destination
        );
      })
      .slice(0, options.limit || Number.MAX_SAFE_INTEGER);

    const results = [];

    for (const { attraction, destination, isDbRecord } of selectedAttractions) {
      const attractionName = readRecordValue(attraction, ["name"], "Attraction");
      const attractionSlug = slugify(readRecordValue(attraction, ["slug"], attractionName));
      const destinationName = readRecordValue(destination, ["name"], "Destination");
      const destinationSlug = slugify(readRecordValue(destination, ["slug"], destinationName));
      const query = `${attractionName} ${destinationName} Indonesia`;
      const item = {
        id: readRecordValue(attraction, ["id"]),
        slug: readRecordValue(attraction, ["slug"], attractionSlug),
        city: destinationName,
        destinationSlug,
        name: attractionName,
        query,
      };

      try {
        const fileTitle = await searchCommonsFile(query);

        if (!fileTitle) {
          item.error = "No Wikimedia Commons file found";
          results.push(item);
          console.log(`MISS ${destinationSlug} / ${attractionSlug}: no file found`);
          continue;
        }

        const fileInfo = await getDirectFileInfo(fileTitle);

        if (!fileInfo?.directImageUrl) {
          item.error = "Found file title but could not resolve direct image URL";
          results.push(item);
          console.log(`MISS ${destinationSlug} / ${attractionSlug}: no direct image`);
          continue;
        }

        const extension = inferExtension(fileInfo);
        const thumbnailRelativePath = buildAssetRelativePath(
          destinationSlug,
          attractionSlug,
          "thumbnail",
          extension
        );
        const mainRelativePath = buildAssetRelativePath(
          destinationSlug,
          attractionSlug,
          "main",
          extension
        );
        const thumbnailImageUrl = buildPublicAssetUrl(
          destinationSlug,
          attractionSlug,
          "thumbnail",
          extension
        );
        const mainImageUrl = buildPublicAssetUrl(
          destinationSlug,
          attractionSlug,
          "main",
          extension
        );

        item.sourcePageUrl = fileInfo.sourcePageUrl;
        item.directImageUrl = fileInfo.directImageUrl;
        item.licenseLabel = fileInfo.licenseLabel;
        item.licenseUrl = fileInfo.licenseUrl;
        item.authorName = fileInfo.authorName;
        item.credit = fileInfo.credit;
        item.attributionRequired = fileInfo.attributionRequired;
        item.thumbnailImageUrl = thumbnailImageUrl;
        item.mainImageUrl = mainImageUrl;

        if (!options.dryRun) {
          const bytes = await downloadImage(fileInfo.directImageUrl);
          await Promise.all([
            writeBinaryFile(thumbnailRelativePath, bytes),
            writeBinaryFile(mainRelativePath, bytes),
          ]);
        }

        if (options.applyDb && !options.dryRun && isDbRecord) {
          const metadata = readRecordValue(attraction, ["metadata"], {}) || {};

          await attraction.update({
            thumbnailImageUrl,
            mainImageUrl,
            metadata: {
              ...metadata,
              assetSource: {
                provider: ASSET_PROVIDER,
                strategy: ASSET_STRATEGY,
                sourcePageUrl: fileInfo.sourcePageUrl,
                directImageUrl: fileInfo.directImageUrl,
                licenseLabel: fileInfo.licenseLabel,
                licenseUrl: fileInfo.licenseUrl,
                authorName: fileInfo.authorName,
                credit: fileInfo.credit,
                attributionRequired: fileInfo.attributionRequired,
                updatedAt: new Date().toISOString(),
              },
            },
          });
        }

        if (options.applyDb && !isDbRecord) {
          item.warning = "Generated from seed catalog only. No DB row was updated.";
        }

        results.push(item);
        console.log(`OK   ${destinationSlug} / ${attractionSlug}`);
      } catch (error) {
        item.error = error?.message || "Unknown error";
        results.push(item);
        console.log(`ERR  ${destinationSlug} / ${attractionSlug}: ${item.error}`);
      }
    }

    await fs.mkdir(path.dirname(options.manifestPath), { recursive: true });
    await fs.writeFile(options.manifestPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          applyDb: options.applyDb,
          attempted: selectedAttractions.length,
          baseUrl: getPublicBaseUrl(),
          dryRun: options.dryRun,
          env: options.env,
          failed: results.filter((item) => item.error).length,
          manifestPath: options.manifestPath,
          provider: ASSET_PROVIDER,
          strategy: ASSET_STRATEGY,
          succeeded: results.filter((item) => item.directImageUrl).length,
        },
        null,
        2
      )
    );
  } finally {
    await db.sequelize.close();
  }
};

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
