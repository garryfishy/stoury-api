const { Op } = require("sequelize");
const { getDb, getRequiredModel } = require("../../database/db-context");
const { AppError } = require("../../utils/app-error");
const {
  buildPaginationMeta,
  getPaginationOffset,
  normalizePagination,
} = require("../../utils/pagination");
const { readRecordValue } = require("../../utils/model-helpers");
const env = require("../../config/env");
const { googlePlacesClient: defaultGooglePlacesClient } = require("../../services/google-places");
const {
  createFileSystemPhotoCache,
} = require("../../utils/attraction-photo-cache");
const {
  buildGoogleSearchQuery,
  getAttractionCoordinates,
  GOOGLE_TEXT_SEARCH_RADIUS_METERS,
  pickEnrichmentMatch,
} = require("../admin-attractions/admin-attractions.helpers");
const {
  findDestinationByIdOrSlug,
  isUuidIdentifier,
  serializeDestination,
} = require("../destinations/destinations.helpers");
const {
  ATTRACTION_PHOTO_VARIANTS,
  buildAttractionPhotoUrl,
  loadAttractionCategoriesByAttractionIds,
  serializeAttraction,
} = require("./attractions.helpers");

const PHOTO_VARIANT_CONFIG = {
  [ATTRACTION_PHOTO_VARIANTS.thumbnail]: {
    height: 400,
    maxWidth: env.GOOGLE_PLACES_PHOTO_THUMBNAIL_MAX_WIDTH,
    width: env.GOOGLE_PLACES_PHOTO_THUMBNAIL_MAX_WIDTH,
  },
  [ATTRACTION_PHOTO_VARIANTS.main]: {
    height: 900,
    maxWidth: env.GOOGLE_PLACES_PHOTO_MAIN_MAX_WIDTH,
    width: env.GOOGLE_PLACES_PHOTO_MAIN_MAX_WIDTH,
  },
};

const IMAGE_CACHE_CONTROL = "private, no-store, max-age=0";

const escapeXml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPhotoPlaceholderSvg = (attraction, variant) => {
  const config = PHOTO_VARIANT_CONFIG[variant] || PHOTO_VARIANT_CONFIG.main;
  const attractionName = escapeXml(readRecordValue(attraction, ["name"], "Attraction"));
  const destinationLabel = escapeXml(readRecordValue(attraction, ["fullAddress"], "Stoury"));

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-labelledby="title desc">
  <title id="title">${attractionName}</title>
  <desc id="desc">Placeholder image for ${attractionName}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#164e63" />
    </linearGradient>
  </defs>
  <rect width="${config.width}" height="${config.height}" fill="url(#bg)" />
  <circle cx="${Math.round(config.width * 0.18)}" cy="${Math.round(config.height * 0.28)}" r="${Math.round(config.width * 0.09)}" fill="rgba(255,255,255,0.18)" />
  <path d="M0 ${Math.round(config.height * 0.82)} L${Math.round(config.width * 0.28)} ${Math.round(config.height * 0.48)} L${Math.round(config.width * 0.52)} ${Math.round(config.height * 0.72)} L${Math.round(config.width * 0.76)} ${Math.round(config.height * 0.34)} L${config.width} ${Math.round(config.height * 0.64)} V${config.height} H0 Z" fill="rgba(255,255,255,0.14)" />
  <text x="${Math.round(config.width * 0.08)}" y="${Math.round(config.height * 0.78)}" fill="#f8fafc" font-size="${Math.round(config.width * 0.056)}" font-family="Helvetica, Arial, sans-serif" font-weight="700">${attractionName}</text>
  <text x="${Math.round(config.width * 0.08)}" y="${Math.round(config.height * 0.88)}" fill="rgba(248,250,252,0.8)" font-size="${Math.round(config.width * 0.028)}" font-family="Helvetica, Arial, sans-serif">${destinationLabel}</text>
</svg>`.trim();
};

const findActiveAttractionByIdOrSlug = async (Attraction, idOrSlug) => {
  const attraction = isUuidIdentifier(idOrSlug)
    ? await Attraction.findByPk(String(idOrSlug))
    : await Attraction.findOne({ where: { slug: idOrSlug, isActive: true } });

  if (!attraction || !readRecordValue(attraction, ["isActive"], false)) {
    throw new AppError("Attraction not found.", 404);
  }

  return attraction;
};

const createAttractionsService = ({
  dbProvider = getDb,
  googlePlacesClient = defaultGooglePlacesClient,
  photoCache = createFileSystemPhotoCache(),
} = {}) => ({
  async listByDestination(destinationId, query = {}) {
    const db = dbProvider();
    const Destination = getRequiredModel(db, "Destination");
    const Attraction = getRequiredModel(db, "Attraction");
    const AttractionCategory = db.AttractionCategory || null;
    const pagination = normalizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 12,
    });
    const rawCategoryIds = query.categoryIds;
    const normalizedCategoryIds = Array.isArray(rawCategoryIds)
      ? rawCategoryIds
      : typeof rawCategoryIds === "string"
        ? rawCategoryIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
    const searchTerm =
      typeof query.q === "string" && query.q.trim().length ? query.q.trim() : null;
    const destination = await findDestinationByIdOrSlug(Destination, destinationId);

    if (!destination) {
      throw new AppError("Destination not found.", 404);
    }

    const where = {
      destinationId: readRecordValue(destination, ["id"]),
      isActive: true,
    };

    if (searchTerm) {
      where[Op.or] = [
        {
          name: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          slug: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          fullAddress: {
            [Op.iLike]: `%${searchTerm}%`,
          },
        },
      ];
    }

    if (normalizedCategoryIds.length) {
      if (!AttractionCategory) {
        throw new AppError("Attraction categories are not available.", 500);
      }

      const categories = await AttractionCategory.findAll({
        where: {
          id: normalizedCategoryIds,
          isActive: true,
        },
      });

      if (categories.length !== normalizedCategoryIds.length) {
        throw new AppError("One or more attraction categories do not exist.", 422);
      }

      const Mapping = getRequiredModel(db, "AttractionCategoryMapping");
      const mappings = await Mapping.findAll({
        where: {
          attractionCategoryId: normalizedCategoryIds,
        },
      });

      const attractionIds = [
        ...new Set(
          mappings.map((mapping) => readRecordValue(mapping, ["attractionId"])).filter(Boolean)
        ),
      ];

      if (!attractionIds.length) {
        return {
          destination: serializeDestination(destination),
          items: [],
          pagination: buildPaginationMeta({
            page: pagination.page,
            limit: pagination.limit,
            total: 0,
          }),
        };
      }

      where.id = { [Op.in]: attractionIds };
    }

    const total = await Attraction.count({ where });
    const attractions = await Attraction.findAll({
      where,
      order: [["name", "ASC"]],
      limit: pagination.limit,
      offset: getPaginationOffset(pagination),
    });

    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(
      db,
      attractions.map((attraction) => readRecordValue(attraction, ["id"]))
    );

    return {
      destination: serializeDestination(destination),
      items: attractions.map((attraction) =>
        serializeAttraction(attraction, {
          categories: categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [],
        })
      ),
      pagination: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async getDetail(idOrSlug) {
    const db = dbProvider();
    const Attraction = getRequiredModel(db, "Attraction");
    const Destination = getRequiredModel(db, "Destination");

    const attraction = await findActiveAttractionByIdOrSlug(Attraction, idOrSlug);

    const destinationId = readRecordValue(attraction, ["destinationId"]);
    const destination = destinationId
      ? await findDestinationByIdOrSlug(Destination, String(destinationId))
      : null;

    const categoriesByAttractionId = await loadAttractionCategoriesByAttractionIds(db, [
      readRecordValue(attraction, ["id"]),
    ]);

    return serializeAttraction(attraction, {
      includeDetailFields: true,
      destination,
      categories: categoriesByAttractionId.get(readRecordValue(attraction, ["id"])) || [],
    });
  },

  async getPhotoAsset(idOrSlug, variant = ATTRACTION_PHOTO_VARIANTS.main) {
    const db = dbProvider();
    const Attraction = getRequiredModel(db, "Attraction");
    const Destination = getRequiredModel(db, "Destination");
    const attraction = await findActiveAttractionByIdOrSlug(Attraction, idOrSlug);
    const normalizedVariant =
      variant === ATTRACTION_PHOTO_VARIANTS.thumbnail
        ? ATTRACTION_PHOTO_VARIANTS.thumbnail
        : ATTRACTION_PHOTO_VARIANTS.main;
    const manualImageUrl =
      normalizedVariant === ATTRACTION_PHOTO_VARIANTS.thumbnail
        ? readRecordValue(attraction, ["thumbnailImageUrl"], null)
        : readRecordValue(attraction, ["mainImageUrl"], null);
    const generatedPhotoUrl = buildAttractionPhotoUrl(attraction, normalizedVariant);
    const attractionId = readRecordValue(attraction, ["id"], null);

    if (manualImageUrl && manualImageUrl !== generatedPhotoUrl) {
      return {
        cacheControl: IMAGE_CACHE_CONTROL,
        location: manualImageUrl,
        statusCode: 302,
        type: "redirect",
      };
    }

    const cachedPhoto = attractionId
      ? await photoCache.read(attractionId, normalizedVariant)
      : null;

    if (cachedPhoto) {
      return {
        body: cachedPhoto.body,
        cacheControl: IMAGE_CACHE_CONTROL,
        contentType: cachedPhoto.contentType,
        statusCode: 200,
        type: "binary",
      };
    }

    const buildBinaryPhotoAsset = async (photo) => {
      const asset = {
        body: photo.body,
        cacheControl: IMAGE_CACHE_CONTROL,
        contentType: photo.contentType,
        statusCode: 200,
        type: "binary",
      };

      if (attractionId) {
        await photoCache.write(attractionId, normalizedVariant, asset);
      }

      return asset;
    };

    const tryFetchGooglePhoto = async (placeId) => {
      const details = await googlePlacesClient.getPlaceDetails(placeId, {
        includePhotos: true,
      });
      const [primaryPhoto] = Array.isArray(details.photos) ? details.photos : [];

      if (!primaryPhoto?.photoReference) {
        return null;
      }

      const photo = await googlePlacesClient.getPlacePhoto({
        photoReference: primaryPhoto.photoReference,
        maxWidth: PHOTO_VARIANT_CONFIG[normalizedVariant].maxWidth,
      });

      return buildBinaryPhotoAsset(photo);
    };

    const storedPlaceId = readRecordValue(attraction, ["externalPlaceId"], null);
    const destinationId = readRecordValue(attraction, ["destinationId"], null);
    const destination = destinationId
      ? await Destination.findByPk(String(destinationId))
      : null;

    if (storedPlaceId) {
      try {
        const photo = await tryFetchGooglePhoto(storedPlaceId);

        if (photo) {
          return photo;
        }
      } catch (_error) {
        // Fall through to the destination hero or final placeholder.
      }
    }

    if (destination && !storedPlaceId) {
      try {
        const candidates = await googlePlacesClient.textSearch({
          query: buildGoogleSearchQuery({ attraction, destination }),
          location: getAttractionCoordinates(attraction),
          radiusMeters: GOOGLE_TEXT_SEARCH_RADIUS_METERS,
        });
        const match = pickEnrichmentMatch({ attraction, candidates });

        if (match.outcome === "enriched" && match.selectedCandidate?.placeId) {
          const photo = await tryFetchGooglePhoto(match.selectedCandidate.placeId);

          if (photo) {
            return photo;
          }
        }
      } catch (_error) {
        // Fall through to the destination hero or final placeholder.
      }
    }

    const destinationHeroImageUrl = readRecordValue(destination, ["heroImageUrl"], null);

    if (destinationHeroImageUrl) {
      return {
        cacheControl: IMAGE_CACHE_CONTROL,
        location: destinationHeroImageUrl,
        statusCode: 302,
        type: "redirect",
      };
    }

    return {
      body: buildPhotoPlaceholderSvg(attraction, normalizedVariant),
      cacheControl: IMAGE_CACHE_CONTROL,
      contentType: "image/svg+xml; charset=utf-8",
      statusCode: 200,
      type: "inline",
    };
  },
});

const attractionsService = createAttractionsService();

module.exports = {
  attractionsService,
  createAttractionsService,
};
