const { ids, user } = require("../examples");
const {
  errorExample,
  errorResponse,
  requestBody,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const authPayloadExample = {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access",
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh",
  user,
};

const authPaths = {
  "/api/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register a new traveler",
      description: "Creates a user account, assigns the default user role, and returns access and refresh tokens.",
      requestBody: requestBody(schemaRef("RegisterRequest"), {
        name: "Ayu Pratama",
        email: "ayu@example.com",
        password: "securePass123",
      }),
      responses: {
        201: successResponse(
          "Registration succeeded.",
          schemaRef("AuthTokens"),
          successExample("User registered.", authPayloadExample)
        ),
        409: errorResponse(
          "Email already exists.",
          errorExample("Email is already registered.")
        ),
        422: responseRef("ValidationError"),
      },
    },
  },
  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Authenticate with email and password",
      requestBody: requestBody(schemaRef("LoginRequest"), {
        email: "ayu@example.com",
        password: "securePass123",
      }),
      responses: {
        200: successResponse(
          "Authentication succeeded.",
          schemaRef("AuthTokens"),
          successExample("Login successful.", authPayloadExample)
        ),
        401: errorResponse(
          "Invalid credentials.",
          errorExample("Invalid email or password.")
        ),
        403: errorResponse(
          "Inactive account.",
          errorExample("This account is inactive.")
        ),
        422: responseRef("ValidationError"),
      },
    },
  },
  "/api/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Rotate refresh token",
      description: "Validates the refresh token, revokes the old stored token, and returns a fresh access/refresh token pair.",
      requestBody: requestBody(schemaRef("RefreshRequest"), {
        refreshToken: authPayloadExample.refreshToken,
      }),
      responses: {
        200: successResponse(
          "Refresh succeeded.",
          schemaRef("AuthTokens"),
          successExample("Token refreshed.", authPayloadExample)
        ),
        401: errorResponse(
          "Refresh token rejected.",
          errorExample("Invalid or expired refresh token.")
        ),
        404: errorResponse(
          "User was deleted after token issuance.",
          errorExample("User not found.")
        ),
        422: responseRef("ValidationError"),
      },
    },
  },
  "/api/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Revoke a refresh token",
      description: "Marks the supplied refresh token as revoked. This endpoint does not require a bearer token.",
      requestBody: requestBody(schemaRef("LogoutRequest"), {
        refreshToken: authPayloadExample.refreshToken,
      }),
      responses: {
        200: successResponse(
          "Logout succeeded.",
          {
            type: "null",
          },
          successExample("Logout successful.", null)
        ),
        422: responseRef("ValidationError"),
      },
    },
  },
};

module.exports = { authPaths };
