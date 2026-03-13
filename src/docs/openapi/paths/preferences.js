const { preferences } = require("../examples");
const {
  errorExample,
  errorResponse,
  requestBody,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const preferenceArraySchema = {
  type: "array",
  items: schemaRef("PreferenceCategory"),
};

const preferencesPaths = {
  "/api/preferences": {
    get: {
      tags: ["Preferences"],
      summary: "List all active preference categories",
      description:
        "Returns the public active preference-category catalog used to render preference pickers. Response names are localized display labels while slugs remain stable.",
      responses: {
        200: successResponse(
          "Preference categories fetched.",
          preferenceArraySchema,
          successExample("Preference categories fetched.", preferences)
        ),
      },
    },
  },
  "/api/preferences/me": {
    get: {
      tags: ["Preferences"],
      summary: "Get the current user's profile preferences",
      security: [{ bearerAuth: [] }],
      responses: {
        200: successResponse(
          "Preference snapshot fetched.",
          preferenceArraySchema,
          successExample("Preferences fetched.", preferences)
        ),
        401: responseRef("Unauthorized"),
      },
    },
    put: {
      tags: ["Preferences"],
      summary: "Replace the current user's profile preferences",
      security: [{ bearerAuth: [] }],
      requestBody: requestBody(schemaRef("ReplacePreferencesRequest"), {
        categoryIds: preferences.map((item) => item.id),
      }),
      responses: {
        200: successResponse(
          "Preference snapshot updated.",
          preferenceArraySchema,
          successExample("Preferences updated.", preferences)
        ),
        401: responseRef("Unauthorized"),
        422: errorResponse(
          "Invalid category IDs.",
          errorExample("One or more preference categories do not exist.")
        ),
      },
    },
  },
};

module.exports = { preferencesPaths };
