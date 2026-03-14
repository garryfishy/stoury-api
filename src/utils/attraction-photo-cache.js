const fs = require("fs/promises");
const path = require("path");

const DEFAULT_PHOTO_CACHE_DIR =
  process.env.NODE_ENV === "test"
    ? null
    : path.resolve(process.cwd(), ".cache", "attraction-photos");

const createFileSystemPhotoCache = ({ cacheDir = DEFAULT_PHOTO_CACHE_DIR } = {}) => {
  const getBasePath = (attractionId, variant) => {
    if (!cacheDir || !attractionId || !variant) {
      return null;
    }

    return path.join(cacheDir, `${String(attractionId)}-${String(variant)}`);
  };

  return {
    async read(attractionId, variant) {
      const basePath = getBasePath(attractionId, variant);

      if (!basePath) {
        return null;
      }

      try {
        const [metadataRaw, body] = await Promise.all([
          fs.readFile(`${basePath}.json`, "utf8"),
          fs.readFile(`${basePath}.bin`),
        ]);
        const metadata = JSON.parse(metadataRaw);

        if (!metadata?.contentType || !Buffer.isBuffer(body) || !body.length) {
          return null;
        }

        return {
          body,
          contentType: metadata.contentType,
        };
      } catch (_error) {
        return null;
      }
    },

    async write(attractionId, variant, asset) {
      const basePath = getBasePath(attractionId, variant);

      if (
        !basePath ||
        !asset ||
        !Buffer.isBuffer(asset.body) ||
        !asset.body.length ||
        !asset.contentType
      ) {
        return;
      }

      try {
        await fs.mkdir(cacheDir, { recursive: true });
        await Promise.all([
          fs.writeFile(`${basePath}.bin`, asset.body),
          fs.writeFile(
            `${basePath}.json`,
            JSON.stringify(
              {
                contentType: asset.contentType,
                cachedAt: new Date().toISOString(),
              },
              null,
              2
            ),
            "utf8"
          ),
        ]);
      } catch (_error) {
        // Cache writes are best-effort only.
      }
    },
  };
};

module.exports = {
  createFileSystemPhotoCache,
  DEFAULT_PHOTO_CACHE_DIR,
};
