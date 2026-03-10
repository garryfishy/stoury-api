const env = require("../config/env");

const DEFAULT_TEXT_SEARCH_RADIUS_METERS = 10000;

const createGooglePlacesError = (
  message,
  { code = "GOOGLE_PLACES_UPSTREAM_ERROR", status = 502, cause, details } = {}
) => {
  const error = new Error(message);
  error.name = "GooglePlacesError";
  error.code = code;
  error.status = status;
  error.statusCode = status;

  if (cause) {
    error.cause = cause;
  }

  if (details) {
    error.details = details;
  }

  return error;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePlace = (payload = {}) => {
  const rawLocation =
    payload.geometry?.location ||
    payload.location ||
    payload.geometry?.viewport?.location ||
    null;

  return {
    placeId: String(payload.place_id || payload.placeId || "").trim(),
    name: String(payload.name || payload.displayName?.text || "").trim(),
    formattedAddress: String(
      payload.formatted_address || payload.formattedAddress || ""
    ).trim(),
    location:
      rawLocation &&
      toFiniteNumber(rawLocation.lat) !== null &&
      toFiniteNumber(rawLocation.lng) !== null
        ? {
            latitude: toFiniteNumber(rawLocation.lat),
            longitude: toFiniteNumber(rawLocation.lng),
          }
        : null,
    rating: toFiniteNumber(payload.rating),
    userRatingsTotal:
      payload.user_ratings_total === undefined ||
      payload.user_ratings_total === null
        ? null
        : Number(payload.user_ratings_total),
    types: Array.isArray(payload.types) ? payload.types : [],
    url: typeof payload.url === "string" ? payload.url : null,
    websiteUri:
      typeof payload.website === "string"
        ? payload.website
        : typeof payload.websiteUri === "string"
          ? payload.websiteUri
          : null,
  };
};

const buildUrl = (baseUrl, params) => {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const readJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const createGooglePlacesClient = ({
  apiKey,
  timeoutMs = env.GOOGLE_PLACES_TIMEOUT_MS,
  textSearchUrl = env.GOOGLE_PLACES_TEXT_SEARCH_URL,
  detailsUrl = env.GOOGLE_PLACES_DETAILS_URL,
  fetchImpl = global.fetch,
} = {}) => {
  const ensureConfigured = () => {
    if (!apiKey) {
      throw createGooglePlacesError("Google Places API key is not configured.", {
        code: "GOOGLE_PLACES_MISCONFIGURED",
        status: 500,
      });
    }

    if (typeof fetchImpl !== "function") {
      throw createGooglePlacesError("Fetch is not available for Google Places requests.", {
        code: "GOOGLE_PLACES_MISCONFIGURED",
        status: 500,
      });
    }
  };

  const runRequest = async ({ url, operationName }) => {
    ensureConfigured();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      const payload = await readJsonSafely(response);

      if (!response.ok) {
        throw createGooglePlacesError(`${operationName} failed.`, {
          code: "GOOGLE_PLACES_UPSTREAM_ERROR",
          status: 502,
          details: {
            httpStatus: response.status,
            upstreamStatus: payload?.status || null,
          },
        });
      }

      const status = String(payload?.status || "").trim();

      if (status === "ZERO_RESULTS") {
        return payload;
      }

      if (status && status !== "OK") {
        throw createGooglePlacesError(
          payload?.error_message || `${operationName} returned ${status}.`,
          {
            code:
              status === "REQUEST_DENIED"
                ? "GOOGLE_PLACES_REQUEST_DENIED"
                : "GOOGLE_PLACES_UPSTREAM_ERROR",
            status: 502,
            details: {
              upstreamStatus: status,
            },
          }
        );
      }

      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw createGooglePlacesError(`${operationName} timed out.`, {
          code: "GOOGLE_PLACES_TIMEOUT",
          status: 504,
          cause: error,
        });
      }

      if (error?.name === "GooglePlacesError") {
        throw error;
      }

      throw createGooglePlacesError(`${operationName} failed.`, {
        code: "GOOGLE_PLACES_UPSTREAM_ERROR",
        status: 502,
        cause: error,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return {
    async textSearch({
      query,
      location,
      radiusMeters = DEFAULT_TEXT_SEARCH_RADIUS_METERS,
    } = {}) {
      const payload = await runRequest({
        operationName: "Google Places text search",
        url: buildUrl(textSearchUrl, {
          query,
          key: apiKey,
          location:
            location?.latitude !== undefined && location?.longitude !== undefined
              ? `${location.latitude},${location.longitude}`
              : undefined,
          radius:
            location?.latitude !== undefined && location?.longitude !== undefined
              ? radiusMeters
              : undefined,
        }),
      });

      return Array.isArray(payload?.results)
        ? payload.results
            .map(normalizePlace)
            .filter((candidate) => candidate.placeId)
        : [];
    },

    async getPlaceDetails(placeId) {
      const payload = await runRequest({
        operationName: "Google Places details lookup",
        url: buildUrl(detailsUrl, {
          place_id: placeId,
          fields:
            "place_id,name,formatted_address,geometry/location,rating,user_ratings_total,types,url,website",
          key: apiKey,
        }),
      });

      const details = normalizePlace(payload?.result || {});

      if (!details.placeId) {
        throw createGooglePlacesError("Google Places details response was missing place data.", {
          code: "GOOGLE_PLACES_INVALID_RESPONSE",
          status: 502,
        });
      }

      return details;
    },
  };
};

const googlePlacesClient = createGooglePlacesClient({
  apiKey: env.GOOGLE_PLACES_API_KEY,
});

module.exports = {
  createGooglePlacesClient,
  createGooglePlacesError,
  googlePlacesClient,
};
