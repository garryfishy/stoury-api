const { readRecordValue } = require("../../utils/model-helpers");
const {
  additionalAttractions,
} = require("../../database/seeders/data/additional-attractions");

const OWNED_ATTRACTION_ASSET_PROVIDER = "unsplash";
const OWNED_ATTRACTION_ASSET_LICENSE_LABEL = "Unsplash License";
const OWNED_ATTRACTION_ASSET_LICENSE_URL = "https://unsplash.com/license";
const OWNED_ATTRACTION_ASSET_BACKFILL_VERSION = "licensed_pool_v1";

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const stableHash = (value) => {
  const input = String(value || "");
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const normalizeManagedAssetEntry = (entry) => ({
  sourceSlug: entry.slug,
  destinationSlug: normalizeText(entry.destinationSlug),
  categorySlugs: Array.isArray(entry.categories)
    ? entry.categories.map((category) => normalizeText(category)).filter(Boolean)
    : [],
  thumbnailImageUrl: entry.thumbnail_image_url,
  mainImageUrl: entry.main_image_url,
});

const MANAGED_ASSET_POOL = additionalAttractions.map(normalizeManagedAssetEntry).filter(
  (entry) => entry.thumbnailImageUrl && entry.mainImageUrl
);

const isGeneratedPhotoUrl = (value) =>
  /\/api\/attractions\/[^/]+\/photo\?variant=(thumbnail|main)/.test(String(value || ""));

const isGooglePhotoUrl = (value) =>
  /googleapis\.com\/maps\/api\/place\/photo|googleusercontent\.com/i.test(
    String(value || "")
  );

const isReplaceableAssetUrl = (value) =>
  !value || isGeneratedPhotoUrl(value) || isGooglePhotoUrl(value);

const shouldBackfillOwnedAsset = (record, { force = false } = {}) => {
  if (force) {
    return true;
  }

  const thumbnailImageUrl = readRecordValue(record, ["thumbnailImageUrl"], null);
  const mainImageUrl = readRecordValue(record, ["mainImageUrl"], null);

  return (
    isReplaceableAssetUrl(thumbnailImageUrl) || isReplaceableAssetUrl(mainImageUrl)
  );
};

const pickManagedAssetEntry = ({ attraction, destination, categories = [] }) => {
  const attractionSlug = normalizeText(readRecordValue(attraction, ["slug"], ""));
  const destinationSlug = normalizeText(readRecordValue(destination, ["slug"], ""));
  const categorySlugs = categories
    .map((category) => normalizeText(readRecordValue(category, ["slug"], "")))
    .filter(Boolean);
  const exactMatch = MANAGED_ASSET_POOL.find((entry) => entry.sourceSlug === attractionSlug);

  if (exactMatch) {
    return exactMatch;
  }

  const destinationCandidates = MANAGED_ASSET_POOL.filter(
    (entry) => entry.destinationSlug === destinationSlug
  );
  const categoryCandidates = destinationCandidates.filter((entry) =>
    entry.categorySlugs.some((slug) => categorySlugs.includes(slug))
  );
  const candidatePool =
    categoryCandidates.length > 0
      ? categoryCandidates
      : destinationCandidates.length > 0
        ? destinationCandidates
        : MANAGED_ASSET_POOL;

  if (!candidatePool.length) {
    return null;
  }

  return candidatePool[stableHash(attractionSlug || readRecordValue(attraction, ["id"], "")) % candidatePool.length];
};

const buildOwnedAssetMetadata = (assetEntry) => ({
  strategy: OWNED_ATTRACTION_ASSET_BACKFILL_VERSION,
  provider: OWNED_ATTRACTION_ASSET_PROVIDER,
  licenseLabel: OWNED_ATTRACTION_ASSET_LICENSE_LABEL,
  licenseUrl: OWNED_ATTRACTION_ASSET_LICENSE_URL,
  sourceAttractionSlug: assetEntry.sourceSlug,
});

const buildOwnedAssetValues = ({ attraction, destination, categories = [] }) => {
  const assetEntry = pickManagedAssetEntry({ attraction, destination, categories });

  if (!assetEntry) {
    return null;
  }

  const metadata = readRecordValue(attraction, ["metadata"], {}) || {};

  return {
    thumbnailImageUrl: assetEntry.thumbnailImageUrl,
    mainImageUrl: assetEntry.mainImageUrl,
    metadata: {
      ...metadata,
      assetSource: buildOwnedAssetMetadata(assetEntry),
    },
  };
};

module.exports = {
  OWNED_ATTRACTION_ASSET_BACKFILL_VERSION,
  OWNED_ATTRACTION_ASSET_LICENSE_LABEL,
  OWNED_ATTRACTION_ASSET_LICENSE_URL,
  OWNED_ATTRACTION_ASSET_PROVIDER,
  buildOwnedAssetValues,
  isGeneratedPhotoUrl,
  isGooglePhotoUrl,
  isReplaceableAssetUrl,
  shouldBackfillOwnedAsset,
};
