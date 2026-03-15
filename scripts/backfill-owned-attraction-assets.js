#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const GENERATED_ASSET_BASE_PATH = "/assets/attractions";
const OWNED_ASSET_SOURCE = Object.freeze({
  kind: "owned-generated",
  provider: "stoury",
  strategy: "generated_svg_v1",
  licenseLabel: "Stoury owned generated asset",
});
const VARIANT_CONFIG = Object.freeze({
  thumbnail: {
    fileSuffix: "thumbnail",
    height: 400,
    width: 640,
  },
  main: {
    fileSuffix: "main",
    height: 900,
    width: 1600,
  },
});
const DESTINATION_PALETTES = Object.freeze({
  batam: {
    start: "#0f766e",
    end: "#164e63",
    accent: "#facc15",
  },
  yogyakarta: {
    start: "#9a3412",
    end: "#7c2d12",
    accent: "#fde68a",
  },
  bali: {
    start: "#c2410c",
    end: "#7c3aed",
    accent: "#fdba74",
  },
  default: {
    start: "#1d4ed8",
    end: "#1e293b",
    accent: "#f8fafc",
  },
});

const parseArgs = (argv) => {
  const args = {
    baseUrl: null,
    dryRun: false,
    env: process.env.NODE_ENV || "development",
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--env" && argv[index + 1]) {
      args.env = String(argv[index + 1]).trim();
      index += 1;
      continue;
    }

    if (token === "--base-url" && argv[index + 1]) {
      args.baseUrl = String(argv[index + 1]).trim();
      index += 1;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--force") {
      args.force = true;
    }
  }

  return args;
};

const options = parseArgs(process.argv.slice(2));

process.env.NODE_ENV = options.env;

const env = require("../src/config/env");
const { getDb } = require("../src/database/db-context");
const { readRecordValue } = require("../src/utils/model-helpers");

const repoRoot = path.resolve(__dirname, "..");
const publicAssetsRoot = path.join(repoRoot, "src", "public");

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

const escapeXml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getPalette = (destinationSlug) =>
  DESTINATION_PALETTES[destinationSlug] || DESTINATION_PALETTES.default;

const getVariantConfig = (variant) => VARIANT_CONFIG[variant] || VARIANT_CONFIG.main;

const buildStoragePath = ({ destinationSlug, attractionSlug, variant }) => {
  const { fileSuffix } = getVariantConfig(variant);

  return path.join(
    "attractions",
    destinationSlug,
    `${attractionSlug}-${fileSuffix}.svg`
  );
};

const buildAssetUrl = ({ destinationSlug, attractionSlug, variant }) =>
  `${getPublicBaseUrl()}${GENERATED_ASSET_BASE_PATH}/${destinationSlug}/${attractionSlug}-${getVariantConfig(variant).fileSuffix}.svg`;

const isGooglePhotoUrl = (value) =>
  /googleapis\.com\/maps\/api\/place\/photo|googleusercontent\.com/i.test(
    String(value || "")
  );

const isUnsplashUrl = (value) => /images\.unsplash\.com/i.test(String(value || ""));

const isGeneratedPhotoEndpointUrl = (value) =>
  /\/api\/attractions\/[^/]+\/photo\?variant=(thumbnail|main)/.test(String(value || ""));

const isManagedOwnedAssetUrl = (value) => {
  const input = String(value || "");

  if (!input) {
    return false;
  }

  try {
    return new URL(input).pathname.startsWith(`${GENERATED_ASSET_BASE_PATH}/`);
  } catch (_error) {
    return input.startsWith(`${GENERATED_ASSET_BASE_PATH}/`);
  }
};

const isManagedOwnedAssetMetadata = (metadata) =>
  metadata?.assetSource?.provider === OWNED_ASSET_SOURCE.provider &&
  metadata?.assetSource?.strategy === OWNED_ASSET_SOURCE.strategy;

const isReplaceableLicensedPoolMetadata = (metadata) =>
  metadata?.assetSource?.provider === "unsplash" &&
  metadata?.assetSource?.strategy === "licensed_pool_v1";

const shouldBackfill = (attraction, { force = false } = {}) => {
  if (force) {
    return true;
  }

  const thumbnailImageUrl = readRecordValue(attraction, ["thumbnailImageUrl"], null);
  const mainImageUrl = readRecordValue(attraction, ["mainImageUrl"], null);
  const metadata = readRecordValue(attraction, ["metadata"], {}) || {};
  const hasManagedOwnedAssetUrls =
    isManagedOwnedAssetUrl(thumbnailImageUrl) && isManagedOwnedAssetUrl(mainImageUrl);
  const hasManagedOwnedAssetMetadata = isManagedOwnedAssetMetadata(metadata);

  return (
    !thumbnailImageUrl ||
    !mainImageUrl ||
    isGooglePhotoUrl(thumbnailImageUrl) ||
    isGooglePhotoUrl(mainImageUrl) ||
    isUnsplashUrl(thumbnailImageUrl) ||
    isUnsplashUrl(mainImageUrl) ||
    isGeneratedPhotoEndpointUrl(thumbnailImageUrl) ||
    isGeneratedPhotoEndpointUrl(mainImageUrl) ||
    isReplaceableLicensedPoolMetadata(metadata) ||
    (hasManagedOwnedAssetUrls && !hasManagedOwnedAssetMetadata)
  );
};

const buildAssetSvg = ({
  attractionName,
  destinationName,
  destinationSlug,
  variant,
}) => {
  const { width, height } = getVariantConfig(variant);
  const palette = getPalette(destinationSlug);
  const accentX = Math.round(width * 0.08);
  const titleY = Math.round(height * 0.68);
  const subtitleY = Math.round(height * 0.8);
  const footnoteY = Math.round(height * 0.9);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(attractionName)}</title>
  <desc id="desc">Stoury generated attraction card for ${escapeXml(attractionName)}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.start}" />
      <stop offset="100%" stop-color="${palette.end}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="${Math.round(width * 0.035)}" fill="url(#bg)" />
  <circle cx="${Math.round(width * 0.14)}" cy="${Math.round(height * 0.22)}" r="${Math.round(width * 0.06)}" fill="rgba(255,255,255,0.14)" />
  <path d="M0 ${Math.round(height * 0.84)} L${Math.round(width * 0.28)} ${Math.round(height * 0.46)} L${Math.round(width * 0.56)} ${Math.round(height * 0.72)} L${Math.round(width * 0.84)} ${Math.round(height * 0.34)} L${width} ${Math.round(height * 0.56)} V${height} H0 Z" fill="rgba(255,255,255,0.12)" />
  <rect x="${accentX}" y="${Math.round(height * 0.14)}" width="${Math.round(width * 0.18)}" height="${Math.round(height * 0.08)}" rx="${Math.round(height * 0.02)}" fill="${palette.accent}" />
  <text x="${Math.round(width * 0.105)}" y="${Math.round(height * 0.195)}" fill="#0f172a" font-size="${Math.max(12, Math.round(width * 0.015))}" font-family="Helvetica, Arial, sans-serif" font-weight="700">STOURY</text>
  <text x="${accentX}" y="${titleY}" fill="#f8fafc" font-size="${Math.round(width * 0.048)}" font-family="Helvetica, Arial, sans-serif" font-weight="700">${escapeXml(attractionName)}</text>
  <text x="${accentX}" y="${subtitleY}" fill="rgba(248,250,252,0.88)" font-size="${Math.round(width * 0.022)}" font-family="Helvetica, Arial, sans-serif">${escapeXml(destinationName)}</text>
  <text x="${accentX}" y="${footnoteY}" fill="rgba(248,250,252,0.76)" font-size="${Math.round(width * 0.016)}" font-family="Helvetica, Arial, sans-serif">Curated visual placeholder • owned by Stoury</text>
</svg>`.trim();
};

const buildManagedMetadata = (metadata, now) => ({
  ...(metadata || {}),
  assetSource: {
    ...OWNED_ASSET_SOURCE,
    relativeBasePath: GENERATED_ASSET_BASE_PATH,
    updatedAt: now.toISOString(),
  },
});

const writeAssetFile = async (relativeStoragePath, contents) => {
  const outputPath = path.join(publicAssetsRoot, relativeStoragePath);

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, `${contents}\n`, "utf8");

  return outputPath;
};

const main = async () => {
  const db = getDb();
  const Attraction = db.Attraction;
  const Destination = db.Destination;

  const attractions = await Attraction.findAll({
    order: [["slug", "ASC"]],
  });

  if (!attractions.length) {
    throw new Error(
      `No attractions found in the ${options.env} database. Populate the curated catalog before running the owned asset backfill.`
    );
  }

  const destinationIds = [
    ...new Set(
      attractions
        .map((attraction) => readRecordValue(attraction, ["destinationId"], null))
        .filter(Boolean)
    ),
  ];
  const destinations = await Destination.findAll({
    where: {
      id: destinationIds,
    },
  });
  const destinationById = new Map(
    destinations.map((destination) => [readRecordValue(destination, ["id"]), destination])
  );

  const summary = {
    generatedFiles: 0,
    skipped: 0,
    updated: 0,
  };

  for (const attraction of attractions) {
    const attractionId = readRecordValue(attraction, ["id"]);
    const attractionSlug = slugify(readRecordValue(attraction, ["slug"], attractionId));
    const attractionName = readRecordValue(attraction, ["name"], "Attraction");
    const destination =
      destinationById.get(readRecordValue(attraction, ["destinationId"], null)) || null;

    if (!destination) {
      summary.skipped += 1;
      console.warn(`Skipped ${attractionSlug}: destination record is missing.`);
      continue;
    }

    if (!shouldBackfill(attraction, { force: options.force })) {
      summary.skipped += 1;
      continue;
    }

    const destinationSlug = slugify(readRecordValue(destination, ["slug"], "destination"));
    const destinationName = readRecordValue(destination, ["name"], destinationSlug);
    const now = new Date();
    const thumbnailStoragePath = buildStoragePath({
      attractionSlug,
      destinationSlug,
      variant: "thumbnail",
    });
    const mainStoragePath = buildStoragePath({
      attractionSlug,
      destinationSlug,
      variant: "main",
    });
    const thumbnailSvg = buildAssetSvg({
      attractionName,
      destinationName,
      destinationSlug,
      variant: "thumbnail",
    });
    const mainSvg = buildAssetSvg({
      attractionName,
      destinationName,
      destinationSlug,
      variant: "main",
    });
    const updateValues = {
      thumbnailImageUrl: buildAssetUrl({
        attractionSlug,
        destinationSlug,
        variant: "thumbnail",
      }),
      mainImageUrl: buildAssetUrl({
        attractionSlug,
        destinationSlug,
        variant: "main",
      }),
      metadata: buildManagedMetadata(readRecordValue(attraction, ["metadata"], {}), now),
    };

    if (!options.dryRun) {
      await writeAssetFile(thumbnailStoragePath, thumbnailSvg);
      await writeAssetFile(mainStoragePath, mainSvg);
      summary.generatedFiles += 2;
      await attraction.update(updateValues);
    }

    summary.updated += 1;
    console.log(
      `${options.dryRun ? "Would update" : "Updated"} ${attractionSlug} -> ${updateValues.mainImageUrl}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        baseUrl: getPublicBaseUrl(),
        dryRun: options.dryRun,
        env: options.env,
        strategy: OWNED_ASSET_SOURCE.strategy,
      },
      null,
      2
    )
  );

  await db.sequelize.close();
};

main().catch(async (error) => {
  console.error(error.message || error);

  try {
    const db = getDb();
    await db.sequelize.close();
  } catch (_closeError) {
    // Ignore close failures during fatal exit.
  }

  process.exit(1);
});
