const {
  adminBatchEnrichmentSummary,
  adminEnrichmentFailedResult,
  adminEnrichmentNeedsReviewResult,
  adminEnrichmentPendingCollection,
  adminEnrichmentSuccessResult,
  destination,
  ids,
} = require("../examples");
const {
  errorExample,
  errorResponse,
  parameterRef,
  requestBody,
  responseRef,
  schemaRef,
  successExample,
  successResponse,
} = require("../helpers");

const adminAttractionsPaths = {
  "/api/admin/attractions/enrichment-pending": {
    get: {
      tags: ["Admin Attractions"],
      summary: "List attractions queued for enrichment review or sync",
      description:
        "Internal admin-only operational endpoint for finding attractions that still need Google Places enrichment or need a stale-record refresh review. This feature can be disabled by `ADMIN_ENRICHMENT_ENABLED` and also requires `GOOGLE_PLACES_API_KEY`.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "destinationId",
          in: "query",
          required: false,
          description: "Optional destination UUID to scope the admin list.",
          schema: {
            type: "string",
            format: "uuid",
          },
        },
        {
          name: "status",
          in: "query",
          required: false,
          description: "Optional enrichment workflow status filter.",
          schema: {
            type: "string",
            enum: ["pending", "enriched", "needs_review", "failed"],
          },
        },
        {
          name: "page",
          in: "query",
          required: false,
          description: "1-based page number for the admin enrichment list.",
          schema: {
            type: "integer",
            default: 1,
            minimum: 1,
          },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          description: "Maximum number of records to return.",
          schema: {
            type: "integer",
            default: 25,
            minimum: 1,
            maximum: 100,
          },
        },
        {
          name: "staleOnly",
          in: "query",
          required: false,
          description:
            "When true, restricts results to records with missing or old `externalLastSyncedAt` timestamps.",
          schema: {
            type: "boolean",
            default: false,
          },
        },
        {
          name: "staleDays",
          in: "query",
          required: false,
          description: "Age threshold, in days, for stale enrichment records.",
          schema: {
            type: "integer",
            default: 30,
            minimum: 1,
            maximum: 365,
          },
        },
      ],
      responses: {
        200: successResponse(
          "Pending attraction enrichment fetched.",
          schemaRef("PendingAttractionEnrichmentCollection"),
          successExample(
            "Pending attraction enrichment fetched.",
            adminEnrichmentPendingCollection
          )
        ),
        401: responseRef("Unauthorized"),
        403: responseRef("Forbidden"),
        429: errorResponse(
          "Admin enrichment read limit exceeded.",
          errorExample("Too many admin enrichment requests. Please try again later.")
        ),
        503: responseRef("ServiceUnavailable"),
        422: errorResponse("Invalid destination filter.", errorExample("Destination not found.")),
      },
    },
  },
  "/api/admin/attractions/{attractionId}/enrich": {
    post: {
      tags: ["Admin Attractions"],
      summary: "Run Google Places enrichment for one attraction",
      description:
        "Internal admin-only enrichment endpoint. A confident Google Places match is saved immediately; ambiguous or upstream-failed lookups are returned as structured outcomes without mutating curated source-of-truth fields. This feature can be disabled by `ADMIN_ENRICHMENT_ENABLED` and also requires `GOOGLE_PLACES_API_KEY`.",
      security: [{ bearerAuth: [] }],
      parameters: [parameterRef("AttractionIdParam")],
      responses: {
        200: {
          description: "Enrichment attempt completed.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["success", "message", "data"],
                properties: {
                  success: {
                    type: "boolean",
                    enum: [true],
                  },
                  message: {
                    type: "string",
                  },
                  data: {
                    $ref: "#/components/schemas/AdminAttractionEnrichmentResult",
                  },
                },
              },
              examples: {
                enriched: {
                  summary: "Confident match saved",
                  value: successExample(
                    "Attraction enrichment processed.",
                    adminEnrichmentSuccessResult
                  ),
                },
                needsReview: {
                  summary: "Ambiguous result kept for manual review",
                  value: successExample(
                    "Attraction enrichment processed.",
                    adminEnrichmentNeedsReviewResult
                  ),
                },
                failed: {
                  summary: "Upstream lookup failed",
                  value: successExample(
                    "Attraction enrichment processed.",
                    adminEnrichmentFailedResult
                  ),
                },
              },
            },
          },
        },
        401: responseRef("Unauthorized"),
        403: responseRef("Forbidden"),
        429: errorResponse(
          "Admin enrichment write limit exceeded.",
          errorExample("Too many admin enrichment requests. Please try again later.")
        ),
        503: responseRef("ServiceUnavailable"),
        404: responseRef("NotFound"),
        409: errorResponse(
          "Another attraction already owns the same Google place ID.",
          errorExample("This Google place is already attached to another attraction.")
        ),
        422: responseRef("ValidationError"),
      },
    },
  },
  "/api/admin/attractions/enrich-missing": {
    post: {
      tags: ["Admin Attractions"],
      summary: "Run a bounded batch enrichment job for missing attractions",
      description:
        "Internal admin-only batch enrichment endpoint. Supports destination scoping, stale-record selection, and dry-run execution for operational review. This feature can be disabled by `ADMIN_ENRICHMENT_ENABLED` and also requires `GOOGLE_PLACES_API_KEY`.",
      security: [{ bearerAuth: [] }],
      requestBody: requestBody(
        schemaRef("BatchAttractionEnrichmentRequest"),
        {
          destinationId: destination.id,
          limit: 3,
          dryRun: true,
          staleOnly: false,
          staleDays: 30,
        },
        "Batch enrichment settings. `dryRun` evaluates matches without persisting Google fields."
      ),
      responses: {
        200: successResponse(
          "Attraction batch enrichment processed.",
          schemaRef("BatchAttractionEnrichmentSummary"),
          successExample(
            "Attraction batch enrichment processed.",
            adminBatchEnrichmentSummary
          )
        ),
        401: responseRef("Unauthorized"),
        403: responseRef("Forbidden"),
        429: errorResponse(
          "Admin batch enrichment limit exceeded.",
          errorExample("Too many admin batch enrichment requests. Please try again later.")
        ),
        503: responseRef("ServiceUnavailable"),
        422: errorResponse("Invalid batch request.", errorExample("Destination not found.")),
      },
    },
  },
};

module.exports = { adminAttractionsPaths };
