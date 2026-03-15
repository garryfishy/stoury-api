const {
  isPdfAssetUrl,
} = require("../src/utils/attraction-image-urls");
const { hasUsableAttractionImage } = require("../src/modules/admin-web/admin-web.assets");
const {
  resolveAttractionImageUrl,
  ATTRACTION_PHOTO_VARIANTS,
} = require("../src/modules/attractions/attractions.helpers");

describe("attraction image url policy", () => {
  test("pdf asset urls are detected", () => {
    expect(isPdfAssetUrl("https://cdn.example.com/barelang.pdf")).toBe(true);
    expect(isPdfAssetUrl("https://cdn.example.com/barelang.pdf?download=1")).toBe(true);
    expect(isPdfAssetUrl("https://cdn.example.com/barelang.jpg")).toBe(false);
  });

  test("pdf image urls do not count as usable attraction images", () => {
    expect(
      hasUsableAttractionImage({
        mainImageUrl: "https://cdn.example.com/barelang.pdf",
        thumbnailImageUrl: null,
      })
    ).toBe(false);
  });

  test("pdf-backed attraction image urls fall back to the photo endpoint", () => {
    expect(
      resolveAttractionImageUrl(
        {
          id: "attr-1",
          mainImageUrl: "https://cdn.example.com/barelang.pdf",
        },
        ATTRACTION_PHOTO_VARIANTS.main
      )
    ).toBe("http://localhost:3000/api/attractions/attr-1/photo?variant=main");
  });
});
