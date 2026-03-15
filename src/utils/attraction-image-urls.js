const isGeneratedAttractionPhotoUrl = (value) =>
  /\/api\/attractions\/[^/]+\/photo\?variant=(thumbnail|main)/.test(String(value || ""));

const isGooglePhotoUrl = (value) =>
  /googleapis\.com\/maps\/api\/place\/photo|googleusercontent\.com/i.test(
    String(value || "")
  );

const isSvgAssetUrl = (value) => /\.svg(?:\?|$)/i.test(String(value || ""));

const isPdfAssetUrl = (value) => /\.pdf(?:\?|$)/i.test(String(value || ""));

module.exports = {
  isGeneratedAttractionPhotoUrl,
  isGooglePhotoUrl,
  isPdfAssetUrl,
  isSvgAssetUrl,
};
