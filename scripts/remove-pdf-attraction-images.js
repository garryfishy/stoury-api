#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const parseArgs = (argv) => {
  const options = {
    dryRun: false,
    env: process.env.NODE_ENV || "development",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--env" && argv[index + 1]) {
      options.env = String(argv[index + 1]).trim();
      index += 1;
      continue;
    }

    if (token === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
process.env.NODE_ENV = options.env;

const { getDb } = require("../src/database/db-context");
const { readRecordValue } = require("../src/utils/model-helpers");
const { isPdfAssetUrl } = require("../src/utils/attraction-image-urls");

const publicRoot = path.join(process.cwd(), "src", "public");

const resolveLocalAssetPath = (value) => {
  const input = String(value || "").trim();

  if (!input) {
    return null;
  }

  try {
    const pathname = new URL(input).pathname;

    if (!pathname.startsWith("/assets/")) {
      return null;
    }

    return path.join(publicRoot, pathname.replace(/^\/assets\//, ""));
  } catch (_error) {
    if (!input.startsWith("/assets/")) {
      return null;
    }

    return path.join(publicRoot, input.replace(/^\/assets\//, ""));
  }
};

const deleteLocalPdfFile = async (value) => {
  const localPath = resolveLocalAssetPath(value);

  if (!localPath || path.extname(localPath).toLowerCase() !== ".pdf") {
    return false;
  }

  await fs.rm(localPath, { force: true });
  return true;
};

const main = async () => {
  const db = getDb();
  const Attraction = db.Attraction;
  const summary = {
    dryRun: options.dryRun,
    env: options.env,
    localFilesDeleted: 0,
    scanned: 0,
    updated: 0,
  };
  const attractions = await Attraction.findAll({
    order: [["slug", "ASC"]],
  });

  for (const attraction of attractions) {
    summary.scanned += 1;
    const mainImageUrl = readRecordValue(attraction, ["mainImageUrl"], null);
    const thumbnailImageUrl = readRecordValue(attraction, ["thumbnailImageUrl"], null);
    const metadata = readRecordValue(attraction, ["metadata"], {}) || {};
    const updates = {};
    let metadataChanged = false;

    if (isPdfAssetUrl(mainImageUrl)) {
      updates.mainImageUrl = null;
    }

    if (isPdfAssetUrl(thumbnailImageUrl)) {
      updates.thumbnailImageUrl = null;
    }

    if (metadata?.assetSource?.directImageUrl && isPdfAssetUrl(metadata.assetSource.directImageUrl)) {
      metadata.assetSource = {
        ...metadata.assetSource,
        directImageUrl: null,
      };
      metadataChanged = true;
    }

    if (metadata?.assetSource?.sourcePageUrl && isPdfAssetUrl(metadata.assetSource.sourcePageUrl)) {
      metadata.assetSource = {
        ...metadata.assetSource,
        sourcePageUrl: null,
      };
      metadataChanged = true;
    }

    if (!Object.keys(updates).length && !metadataChanged) {
      continue;
    }

    if (!options.dryRun) {
      if (isPdfAssetUrl(mainImageUrl) && (await deleteLocalPdfFile(mainImageUrl))) {
        summary.localFilesDeleted += 1;
      }

      if (
        isPdfAssetUrl(thumbnailImageUrl) &&
        thumbnailImageUrl !== mainImageUrl &&
        (await deleteLocalPdfFile(thumbnailImageUrl))
      ) {
        summary.localFilesDeleted += 1;
      }

      if (metadataChanged) {
        updates.metadata = {
          ...metadata,
          assetSource: {
            ...metadata.assetSource,
            pdfCleanupAt: new Date().toISOString(),
          },
        };
      }

      await attraction.update(updates);
    }

    summary.updated += 1;
  }

  console.log(JSON.stringify(summary, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const db = getDb();

    if (db?.sequelize?.close) {
      await db.sequelize.close().catch(() => {});
    }
  });
