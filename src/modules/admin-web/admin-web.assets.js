const fs = require("fs/promises");
const path = require("path");
const env = require("../../config/env");
const {
  isGeneratedAttractionPhotoUrl,
  isGooglePhotoUrl,
  isPdfAssetUrl,
  isSvgAssetUrl,
} = require("../../utils/attraction-image-urls");
const { readRecordValue } = require("../../utils/model-helpers");

const UPLOAD_PROVIDER = "stoury_upload";
const UPLOAD_STRATEGY = "admin_upload_v1";
const ASSET_RELATIVE_ROOT = path.join("attractions", "uploads");
const PUBLIC_ASSET_ROOT = path.join(process.cwd(), "src", "public");
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const resolvePublicBaseUrl = (baseUrl) =>
  String(baseUrl || env.OPENAPI_SERVER_URL || `http://localhost:${env.PORT}`).replace(/\/$/, "");

const hasUsableAttractionImage = (record) => {
  const urls = [
    readRecordValue(record, ["mainImageUrl"], null),
    readRecordValue(record, ["thumbnailImageUrl"], null),
  ].filter(Boolean);

  return urls.some(
    (url) =>
      !isGeneratedAttractionPhotoUrl(url) &&
      !isGooglePhotoUrl(url) &&
      !isSvgAssetUrl(url) &&
      !isPdfAssetUrl(url)
  );
};

const buildAttractionAssetUploadPath = ({
  attractionSlug,
  destinationSlug,
  extension,
  timestamp,
  variant,
}) =>
  path.join(
    ASSET_RELATIVE_ROOT,
    destinationSlug,
    `${attractionSlug}-${variant}-${timestamp}.${extension}`
  );

const buildAttractionAssetUrl = ({ relativePath, baseUrl }) =>
  `${resolvePublicBaseUrl(baseUrl)}/assets/${String(relativePath).replace(/\\/g, "/")}`;

const inferFileExtension = (file) => {
  const mimeType = String(file?.mimetype || "").toLowerCase();

  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  const originalNameExtension = path.extname(String(file?.originalname || ""))
    .replace(/^\./, "")
    .toLowerCase();

  return originalNameExtension || "bin";
};

const assertUploadFileSupported = (file) => {
  if (!file) {
    return;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
    const error = new Error("Only JPG, PNG, and WEBP uploads are supported.");
    error.statusCode = 422;
    throw error;
  }
};

const writeUploadedImage = async ({ file, relativePath }) => {
  const absolutePath = path.join(PUBLIC_ASSET_ROOT, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, file.buffer);

  return absolutePath;
};

const buildUploadMetadata = ({ attraction, mainFile, thumbnailFile, timestamp }) => {
  const metadata = readRecordValue(attraction, ["metadata"], {}) || {};

  return {
    ...metadata,
    assetSource: {
      provider: UPLOAD_PROVIDER,
      strategy: UPLOAD_STRATEGY,
      uploadedAt: new Date(timestamp).toISOString(),
      originalMainFilename: mainFile?.originalname || null,
      originalThumbnailFilename: thumbnailFile?.originalname || null,
    },
  };
};

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  UPLOAD_PROVIDER,
  UPLOAD_STRATEGY,
  assertUploadFileSupported,
  buildAttractionAssetUploadPath,
  buildAttractionAssetUrl,
  buildUploadMetadata,
  hasUsableAttractionImage,
  inferFileExtension,
  resolvePublicBaseUrl,
  slugify,
  writeUploadedImage,
};
