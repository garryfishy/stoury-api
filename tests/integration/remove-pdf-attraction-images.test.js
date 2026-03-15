const fs = require("fs/promises");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  cleanupTestArtifacts,
  closeTestDb,
  db,
  ensureTestDbReady,
} = require("./helpers/db");

const repoRoot = path.resolve(__dirname, "../..");
const localPdfRelativePath = path.join("attractions", "uploads", "batam", "pdf-cleanup-test.pdf");
const localPdfAbsolutePath = path.join(repoRoot, "src", "public", localPdfRelativePath);

const parseCleanupSummary = (output) => {
  const summaryMatch = String(output || "").match(/\{\s*"dryRun"[\s\S]*\}\s*$/);

  if (!summaryMatch) {
    throw new Error(`Unable to parse cleanup summary from output:\n${output}`);
  }

  return JSON.parse(summaryMatch[0]);
};

const runCleanup = (args = []) => {
  const result = spawnSync(
    process.execPath,
    ["scripts/remove-pdf-attraction-images.js", "--env", "test", ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `PDF cleanup failed with status ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  }

  return parseCleanupSummary(result.stdout);
};

describe("remove pdf attraction images integration", () => {
  beforeAll(async () => {
    await ensureTestDbReady();
    await cleanupTestArtifacts();
  });

  afterEach(async () => {
    await fs.rm(localPdfAbsolutePath, { force: true });
    await cleanupTestArtifacts();
  });

  afterAll(async () => {
    await fs.rm(localPdfAbsolutePath, { force: true });
    await cleanupTestArtifacts();
    await closeTestDb();
  });

  test("cleanup script removes pdf-backed attraction image urls and local pdf assets", async () => {
    const attraction = await db.Attraction.findOne({
      where: {
        slug: "barelang-bridge",
      },
    });

    expect(attraction).toBeTruthy();

    const originalValues = {
      mainImageUrl: attraction.mainImageUrl,
      thumbnailImageUrl: attraction.thumbnailImageUrl,
      metadata: attraction.metadata,
    };

    await fs.mkdir(path.dirname(localPdfAbsolutePath), { recursive: true });
    await fs.writeFile(localPdfAbsolutePath, Buffer.from("%PDF-1.4\n% test pdf\n", "utf8"));

    await attraction.update({
      mainImageUrl: "http://localhost:3000/assets/attractions/uploads/batam/pdf-cleanup-test.pdf",
      thumbnailImageUrl: "https://cdn.example.com/barelang.pdf",
      metadata: {
        ...(attraction.metadata || {}),
        assetSource: {
          provider: "wikimedia_commons",
          strategy: "commons_search_v1",
          directImageUrl: "https://upload.wikimedia.org/example/barelang.pdf",
          sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Barelang.pdf",
        },
      },
    });

    const summary = runCleanup();

    expect(summary.updated).toBeGreaterThanOrEqual(1);
    expect(summary.localFilesDeleted).toBeGreaterThanOrEqual(1);

    const refreshed = await db.Attraction.findByPk(attraction.id);

    expect(refreshed.mainImageUrl).toBeNull();
    expect(refreshed.thumbnailImageUrl).toBeNull();
    expect(refreshed.metadata.assetSource.directImageUrl).toBeNull();
    expect(refreshed.metadata.assetSource.sourcePageUrl).toBeNull();
    expect(refreshed.metadata.assetSource.pdfCleanupAt).toBeTruthy();

    await expect(fs.access(localPdfAbsolutePath)).rejects.toThrow();

    await refreshed.update(originalValues);
  });
});
