const { user } = require("../examples");
const {
  requestBody,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const usersPaths = {
  "/api/users/me": {
    get: {
      tags: ["Users"],
      summary: "Get the current user profile",
      security: [{ bearerAuth: [] }],
      responses: {
        200: successResponse(
          "Profile fetched.",
          schemaRef("User"),
          successExample("Profile fetched.", user)
        ),
        401: responseRef("Unauthorized"),
      },
    },
    patch: {
      tags: ["Users"],
      summary: "Update the current user profile",
      description:
        "Profile updates are intentionally limited to the display name in the MVP. Email changes are excluded from this API surface.",
      security: [{ bearerAuth: [] }],
      requestBody: requestBody(
        schemaRef("UpdateProfileRequest"),
        {
          name: "Ayu Pratama",
        },
        "Display-name update payload. Email changes are not supported in the MVP."
      ),
      responses: {
        200: successResponse(
          "Profile updated.",
          schemaRef("User"),
          successExample("Profile updated.", user)
        ),
        401: responseRef("Unauthorized"),
        404: responseRef("NotFound"),
        422: responseRef("ValidationError"),
      },
    },
  },
};

module.exports = { usersPaths };
