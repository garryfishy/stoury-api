const components = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "JWT access token returned by the auth endpoints.",
    },
  },
  parameters: {
    IdOrSlugParam: {
      name: "idOrSlug",
      in: "path",
      required: true,
      description: "Resource UUID or stable slug.",
      schema: {
        type: "string",
      },
    },
    DestinationIdParam: {
      name: "destinationId",
      in: "path",
      required: true,
      description: "Destination UUID.",
      schema: {
        type: "string",
        format: "uuid",
      },
    },
    AttractionIdParam: {
      name: "attractionId",
      in: "path",
      required: true,
      description: "Attraction UUID.",
      schema: {
        type: "string",
        format: "uuid",
      },
    },
    TripIdParam: {
      name: "tripId",
      in: "path",
      required: true,
      description: "Trip UUID.",
      schema: {
        type: "string",
        format: "uuid",
      },
    },
    AttractionCategoryIdsQuery: {
      name: "categoryIds",
      in: "query",
      required: false,
      description:
        "Optional comma-separated attraction category UUIDs. Only attractions mapped to any of the supplied categories are returned.",
      style: "form",
      explode: false,
      schema: {
        type: "array",
        items: {
          type: "string",
          format: "uuid",
        },
      },
    },
    PageQuery: {
      name: "page",
      in: "query",
      required: false,
      description: "1-based page number.",
      schema: {
        type: "integer",
        default: 1,
        minimum: 1,
      },
    },
    CatalogLimitQuery: {
      name: "limit",
      in: "query",
      required: false,
      description: "Maximum number of records to return per page.",
      schema: {
        type: "integer",
        default: 20,
        minimum: 1,
        maximum: 100,
      },
    },
  },
  responses: {
    Unauthorized: {
      description: "Missing, invalid, or expired access token.",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
          example: {
            success: false,
            message: "Authentication required.",
            data: null,
          },
        },
      },
    },
    Forbidden: {
      description: "Authenticated user is not allowed to perform the action.",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
          example: {
            success: false,
            message: "You do not have permission to perform this action.",
            data: null,
          },
        },
      },
    },
    NotFound: {
      description: "Requested resource does not exist.",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
          example: {
            success: false,
            message: "Resource not found.",
            data: null,
          },
        },
      },
    },
    ValidationError: {
      description: "Request validation failed.",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ValidationErrorResponse",
          },
          example: {
            success: false,
            message: "Validation failed.",
            data: null,
            errors: [
              {
                path: "destinationId",
                message: "Invalid UUID.",
              },
            ],
          },
        },
      },
    },
    Conflict: {
      description: "Request conflicts with current resource state.",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
          example: {
            success: false,
            message: "You already have an overlapping trip for this destination in the selected date range.",
            data: null,
          },
        },
      },
    },
    TooManyRequests: {
      description: "The endpoint-specific rate limit was exceeded.",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
          example: {
            success: false,
            message: "Too many requests. Please try again later.",
            data: null,
          },
        },
      },
    },
    ServiceUnavailable: {
      description: "The feature is disabled or unavailable in the current environment.",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
          example: {
            success: false,
            message: "Admin attraction enrichment is disabled in this environment.",
            data: null,
          },
        },
      },
    },
  },
  schemas: {
    DecimalValue: {
      oneOf: [{ type: "number" }, { type: "string" }],
      example: "2500000.00",
    },
    ValidationErrorDetail: {
      type: "object",
      required: ["path", "message"],
      properties: {
        path: {
          type: "string",
        },
        message: {
          type: "string",
        },
      },
    },
    ErrorResponse: {
      type: "object",
      required: ["success", "message", "data"],
      properties: {
        success: {
          type: "boolean",
          enum: [false],
        },
        message: {
          type: "string",
        },
        data: {
          nullable: true,
          description: "Always null for error responses.",
          example: null,
        },
      },
    },
    ValidationErrorResponse: {
      allOf: [
        {
          $ref: "#/components/schemas/ErrorResponse",
        },
        {
          type: "object",
          required: ["errors"],
          properties: {
            errors: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ValidationErrorDetail",
              },
            },
          },
        },
      ],
    },
    PaginationMeta: {
      type: "object",
      required: ["page", "limit", "total", "totalPages"],
      properties: {
        page: {
          type: "integer",
          minimum: 1,
        },
        limit: {
          type: "integer",
          minimum: 1,
        },
        total: {
          type: "integer",
          minimum: 0,
        },
        totalPages: {
          type: "integer",
          minimum: 0,
        },
      },
    },
    User: {
      type: "object",
      required: ["id", "name", "email", "roles"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        name: {
          type: "string",
        },
        email: {
          type: "string",
          format: "email",
        },
        roles: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    },
    PreferenceCategory: {
      type: "object",
      required: ["id", "name", "slug"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        name: {
          type: "string",
        },
        slug: {
          type: "string",
        },
        description: {
          type: "string",
          nullable: true,
        },
      },
    },
    Destination: {
      type: "object",
      required: [
        "id",
        "name",
        "slug",
        "isActive",
        "description",
        "destinationType",
        "countryCode",
        "countryName",
        "provinceName",
        "cityName",
        "regionName",
        "heroImageUrl",
        "metadata",
      ],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        name: {
          type: "string",
        },
        slug: {
          type: "string",
        },
        isActive: {
          type: "boolean",
          description:
            "Whether the destination is currently selectable for trip planning. Inactive destinations may still appear in the catalog for browsing.",
        },
        description: {
          type: "string",
          nullable: true,
        },
        destinationType: {
          type: "string",
          enum: ["city", "region"],
        },
        countryCode: {
          type: "string",
        },
        countryName: {
          type: "string",
        },
        provinceName: {
          type: "string",
          nullable: true,
        },
        cityName: {
          type: "string",
          nullable: true,
        },
        regionName: {
          type: "string",
          nullable: true,
        },
        heroImageUrl: {
          type: "string",
          format: "uri",
          nullable: true,
        },
        metadata: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
    AttractionCategory: {
      type: "object",
      required: ["id", "name", "slug"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        name: {
          type: "string",
        },
        slug: {
          type: "string",
        },
      },
    },
    Attraction: {
      type: "object",
      required: [
        "id",
        "destinationId",
        "name",
        "slug",
        "description",
        "fullAddress",
        "latitude",
        "longitude",
        "estimatedDurationMinutes",
        "openingHours",
        "rating",
        "thumbnailImageUrl",
        "mainImageUrl",
        "metadata",
        "enrichment",
      ],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
          description:
            "Destination UUID. Only active destinations can be used for trip creation.",
        },
        name: {
          type: "string",
        },
        slug: {
          type: "string",
        },
        description: {
          type: "string",
          nullable: true,
        },
        fullAddress: {
          type: "string",
          nullable: true,
        },
        latitude: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        longitude: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        estimatedDurationMinutes: {
          type: "integer",
          nullable: true,
        },
        openingHours: {
          type: "object",
          additionalProperties: true,
        },
        rating: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        thumbnailImageUrl: {
          type: "string",
          format: "uri",
          nullable: true,
        },
        mainImageUrl: {
          type: "string",
          format: "uri",
          nullable: true,
        },
        metadata: {
          type: "object",
          additionalProperties: true,
        },
        enrichment: {
          type: "object",
          required: [
            "externalSource",
            "externalPlaceId",
            "externalRating",
            "externalReviewCount",
            "externalLastSyncedAt",
          ],
          properties: {
            externalSource: {
              type: "string",
              nullable: true,
            },
            externalPlaceId: {
              type: "string",
              nullable: true,
            },
            externalRating: {
              oneOf: [{ type: "number" }, { type: "string" }],
              nullable: true,
            },
            externalReviewCount: {
              type: "integer",
              nullable: true,
            },
            externalLastSyncedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },
        destination: {
          $ref: "#/components/schemas/Destination",
        },
        categories: {
          type: "array",
          items: {
            $ref: "#/components/schemas/AttractionCategory",
          },
        },
      },
    },
    DestinationAttractionCollection: {
      type: "object",
      required: ["destination", "items"],
      properties: {
        destination: {
          $ref: "#/components/schemas/Destination",
        },
        items: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Attraction",
          },
        },
      },
    },
    AttractionEnrichmentState: {
      type: "object",
      required: [
        "status",
        "error",
        "attemptedAt",
        "externalSource",
        "externalPlaceId",
        "externalRating",
        "externalReviewCount",
        "externalLastSyncedAt",
      ],
      properties: {
        status: {
          type: "string",
          enum: ["pending", "enriched", "needs_review", "failed"],
        },
        error: {
          type: "string",
          nullable: true,
        },
        attemptedAt: {
          type: "string",
          format: "date-time",
          nullable: true,
        },
        externalSource: {
          type: "string",
          nullable: true,
        },
        externalPlaceId: {
          type: "string",
          nullable: true,
        },
        externalRating: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        externalReviewCount: {
          type: "integer",
          nullable: true,
        },
        externalLastSyncedAt: {
          type: "string",
          format: "date-time",
          nullable: true,
        },
      },
    },
    AdminAttractionEnrichmentItem: {
      type: "object",
      required: ["id", "name", "slug", "coordinates", "destination", "enrichment"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        name: {
          type: "string",
        },
        slug: {
          type: "string",
        },
        coordinates: {
          type: "object",
          nullable: true,
          required: ["latitude", "longitude"],
          properties: {
            latitude: {
              type: "number",
            },
            longitude: {
              type: "number",
            },
          },
        },
        destination: {
          allOf: [
            {
              $ref: "#/components/schemas/Destination",
            },
          ],
          nullable: true,
        },
        enrichment: {
          $ref: "#/components/schemas/AttractionEnrichmentState",
        },
      },
    },
    GooglePlaceCandidate: {
      type: "object",
      required: [
        "placeId",
        "name",
        "formattedAddress",
        "location",
        "rating",
        "userRatingsTotal",
        "types",
      ],
      properties: {
        placeId: {
          type: "string",
        },
        name: {
          type: "string",
        },
        formattedAddress: {
          type: "string",
        },
        location: {
          type: "object",
          nullable: true,
          required: ["latitude", "longitude"],
          properties: {
            latitude: {
              type: "number",
            },
            longitude: {
              type: "number",
            },
          },
        },
        rating: {
          type: "number",
          nullable: true,
        },
        userRatingsTotal: {
          type: "integer",
          nullable: true,
        },
        types: {
          type: "array",
          items: {
            type: "string",
          },
        },
        url: {
          type: "string",
          nullable: true,
        },
        websiteUri: {
          type: "string",
          nullable: true,
        },
        distanceMeters: {
          type: "integer",
          nullable: true,
        },
        exactNameMatch: {
          type: "boolean",
          nullable: true,
        },
        partialNameMatch: {
          type: "boolean",
          nullable: true,
        },
        score: {
          type: "integer",
          nullable: true,
        },
      },
    },
    AdminAttractionEnrichmentResult: {
      type: "object",
      required: [
        "attraction",
        "outcome",
        "query",
        "candidateCount",
        "candidates",
        "selectedPlace",
        "error",
        "reason",
      ],
      properties: {
        attraction: {
          $ref: "#/components/schemas/AdminAttractionEnrichmentItem",
        },
        outcome: {
          type: "string",
          enum: ["enriched", "needs_review", "failed"],
        },
        query: {
          type: "string",
          nullable: true,
        },
        candidateCount: {
          type: "integer",
          minimum: 0,
        },
        candidates: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GooglePlaceCandidate",
          },
        },
        selectedPlace: {
          allOf: [
            {
              $ref: "#/components/schemas/GooglePlaceCandidate",
            },
          ],
          nullable: true,
        },
        error: {
          type: "string",
          nullable: true,
        },
        reason: {
          type: "string",
          nullable: true,
        },
      },
    },
    PendingAttractionEnrichmentCollection: {
      type: "object",
      required: ["items", "total", "filtersApplied"],
      properties: {
        items: {
          type: "array",
          items: {
            $ref: "#/components/schemas/AdminAttractionEnrichmentItem",
          },
        },
        total: {
          type: "integer",
          minimum: 0,
        },
        filtersApplied: {
          type: "object",
          required: ["destinationId", "status", "limit", "staleOnly", "staleDays"],
          properties: {
            destinationId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            status: {
              type: "string",
              enum: ["pending", "enriched", "needs_review", "failed"],
            },
            limit: {
              type: "integer",
            },
            staleOnly: {
              type: "boolean",
            },
            staleDays: {
              type: "integer",
            },
          },
        },
      },
    },
    BatchAttractionEnrichmentRequest: {
      type: "object",
      properties: {
        destinationId: {
          type: "string",
          format: "uuid",
          description:
            "Destination UUID. Switching a trip to an inactive destination is rejected.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 25,
          default: 10,
        },
        dryRun: {
          type: "boolean",
          default: false,
        },
        staleOnly: {
          type: "boolean",
          default: false,
        },
        staleDays: {
          type: "integer",
          minimum: 1,
          maximum: 365,
          default: 30,
        },
      },
    },
    BatchAttractionEnrichmentSummary: {
      type: "object",
      required: [
        "dryRun",
        "attemptedCount",
        "enrichedCount",
        "needsReviewCount",
        "failedCount",
        "results",
      ],
      properties: {
        dryRun: {
          type: "boolean",
        },
        attemptedCount: {
          type: "integer",
          minimum: 0,
        },
        enrichedCount: {
          type: "integer",
          minimum: 0,
        },
        needsReviewCount: {
          type: "integer",
          minimum: 0,
        },
        failedCount: {
          type: "integer",
          minimum: 0,
        },
        results: {
          type: "array",
          items: {
            $ref: "#/components/schemas/AdminAttractionEnrichmentResult",
          },
        },
      },
    },
    Trip: {
      type: "object",
      required: [
        "id",
        "title",
        "userId",
        "destinationId",
        "planningMode",
        "startDate",
        "endDate",
        "durationDays",
        "budget",
        "hasItinerary",
      ],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        title: {
          type: "string",
        },
        userId: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
          description: "Only active destinations can be used for trip planning.",
        },
        planningMode: {
          type: "string",
          enum: ["manual", "ai_assisted"],
          description:
            "`manual` stores a standard trip without AI generation. `ai_assisted` uses the same trip record and trip budget when generating AI previews.",
        },
        startDate: {
          type: "string",
          format: "date",
        },
        endDate: {
          type: "string",
          format: "date",
        },
        durationDays: {
          type: "integer",
        },
        budget: {
          $ref: "#/components/schemas/DecimalValue",
          description:
            "Trip-level planning budget used for both manual and ai_assisted trips in the MVP.",
        },
        destination: {
          $ref: "#/components/schemas/Destination",
        },
        preferences: {
          type: "array",
          items: {
            $ref: "#/components/schemas/PreferenceCategory",
          },
        },
        hasItinerary: {
          type: "boolean",
        },
      },
    },
    ItineraryAttractionSummary: {
      type: "object",
      required: [
        "id",
        "destinationId",
        "name",
        "slug",
        "fullAddress",
        "latitude",
        "longitude",
        "estimatedDurationMinutes",
        "rating",
        "thumbnailImageUrl",
        "mainImageUrl",
        "enrichment",
        "categories",
      ],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
          description:
            "Destination UUID. Switching a trip to an inactive destination is rejected.",
        },
        name: {
          type: "string",
        },
        slug: {
          type: "string",
        },
        fullAddress: {
          type: "string",
          nullable: true,
        },
        latitude: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        longitude: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        estimatedDurationMinutes: {
          type: "integer",
          nullable: true,
        },
        rating: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        thumbnailImageUrl: {
          type: "string",
          format: "uri",
          nullable: true,
        },
        mainImageUrl: {
          type: "string",
          format: "uri",
          nullable: true,
        },
        enrichment: {
          type: "object",
          required: ["externalSource", "externalPlaceId"],
          properties: {
            externalSource: {
              type: "string",
              nullable: true,
            },
            externalPlaceId: {
              type: "string",
              nullable: true,
            },
          },
        },
        categories: {
          type: "array",
          items: {
            $ref: "#/components/schemas/AttractionCategory",
          },
        },
      },
    },
    ItineraryItem: {
      type: "object",
      required: [
        "attractionId",
        "attractionName",
        "startTime",
        "endTime",
        "orderIndex",
        "notes",
        "source",
        "attraction",
      ],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        attractionId: {
          type: "string",
          format: "uuid",
        },
        attractionName: {
          type: "string",
        },
        startTime: {
          type: "string",
          nullable: true,
          example: "09:00",
        },
        endTime: {
          type: "string",
          nullable: true,
          example: "11:00",
        },
        orderIndex: {
          type: "integer",
          minimum: 1,
        },
        notes: {
          type: "string",
          nullable: true,
        },
        source: {
          type: "string",
          enum: ["manual", "ai_assisted"],
        },
        attraction: {
          $ref: "#/components/schemas/ItineraryAttractionSummary",
          nullable: true,
        },
      },
    },
    ItineraryDay: {
      type: "object",
      required: ["dayNumber", "date", "notes", "items"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        dayNumber: {
          type: "integer",
          minimum: 1,
        },
        date: {
          type: "string",
          format: "date",
          nullable: true,
        },
        notes: {
          type: "string",
          nullable: true,
        },
        items: {
          type: "array",
          items: {
            $ref: "#/components/schemas/ItineraryItem",
          },
        },
      },
    },
    TripItinerary: {
      type: "object",
      required: [
        "itineraryId",
        "tripId",
        "destinationId",
        "planningMode",
        "startDate",
        "endDate",
        "hasItinerary",
        "days",
      ],
      properties: {
        itineraryId: {
          type: "string",
          format: "uuid",
          nullable: true,
        },
        tripId: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
          description: "Only active destinations can be used for trip planning.",
        },
        planningMode: {
          type: "string",
          enum: ["manual", "ai_assisted"],
          description:
            "Choose `manual` for a standard trip or `ai_assisted` when the same trip will be used for AI itinerary preview generation.",
        },
        startDate: {
          type: "string",
          format: "date",
        },
        endDate: {
          type: "string",
          format: "date",
        },
        hasItinerary: {
          type: "boolean",
        },
        days: {
          type: "array",
          items: {
            $ref: "#/components/schemas/ItineraryDay",
          },
        },
      },
    },
    SaveItineraryItemRequest: {
      type: "object",
      required: ["attractionId"],
      properties: {
        attractionId: {
          type: "string",
          format: "uuid",
        },
        orderIndex: {
          type: "integer",
          minimum: 1,
          description:
            "Optional explicit ordering. If omitted, the server assigns order by array position.",
        },
        startTime: {
          type: "string",
          nullable: true,
          example: "09:00",
        },
        endTime: {
          type: "string",
          nullable: true,
          example: "11:00",
        },
        notes: {
          type: "string",
          nullable: true,
        },
        source: {
          type: "string",
          enum: ["manual", "ai_assisted"],
          description:
            "Optional source marker preserved on the saved itinerary item.",
        },
      },
    },
    SaveItineraryDayRequest: {
      type: "object",
      required: ["dayNumber", "items"],
      properties: {
        dayNumber: {
          type: "integer",
          minimum: 1,
        },
        date: {
          type: "string",
          format: "date",
          description:
            "Optional confirmation of the derived trip date. If supplied, it must exactly match startDate + dayNumber - 1.",
        },
        notes: {
          type: "string",
          nullable: true,
        },
        items: {
          type: "array",
          maxItems: 12,
          items: {
            $ref: "#/components/schemas/SaveItineraryItemRequest",
          },
        },
      },
    },
    SaveItineraryRequest: {
      type: "object",
      required: ["days"],
      description:
        "Full-save itinerary payload shared by manual creation and AI-confirmed edits. Maximum 30 days and 12 items per day.",
      properties: {
        days: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: {
            $ref: "#/components/schemas/SaveItineraryDayRequest",
          },
        },
      },
    },
    AiPlanningStrategy: {
      type: "object",
      required: ["mode", "provider", "usedProviderRanking", "reasoning"],
      properties: {
        mode: {
          type: "string",
          enum: ["deterministic_only", "deterministic_plus_provider"],
        },
        provider: {
          type: "string",
        },
        usedProviderRanking: {
          type: "boolean",
        },
        reasoning: {
          type: "string",
        },
      },
    },
    AiPlanningCoverage: {
      type: "object",
      required: [
        "requestedDayCount",
        "generatedDayCount",
        "availableAttractionCount",
        "requestedItemSlots",
        "scheduledItemCount",
        "maxItemsPerDay",
      ],
      properties: {
        requestedDayCount: {
          type: "integer",
          minimum: 1,
        },
        generatedDayCount: {
          type: "integer",
          minimum: 0,
        },
        availableAttractionCount: {
          type: "integer",
          minimum: 0,
        },
        requestedItemSlots: {
          type: "integer",
          minimum: 1,
        },
        scheduledItemCount: {
          type: "integer",
          minimum: 0,
        },
        maxItemsPerDay: {
          type: "integer",
          minimum: 1,
          description: "Current planner target per day in the MVP.",
        },
      },
    },
    AiPlanningDay: {
      allOf: [
        {
          $ref: "#/components/schemas/ItineraryDay",
        },
        {
          type: "object",
          required: ["isPartial"],
          properties: {
            isPartial: {
              type: "boolean",
              description:
                "True when the planner could not fill the day to the current recommended coverage target.",
            },
          },
        },
      ],
    },
    AiPlanningPreview: {
      type: "object",
      required: [
        "tripId",
        "destinationId",
        "planningMode",
        "startDate",
        "endDate",
        "generatedAt",
        "preferences",
        "strategy",
        "budget",
        "budgetFit",
        "budgetWarnings",
        "isPartial",
        "coverage",
        "warnings",
        "days",
      ],
      properties: {
        tripId: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
          description:
            "Destination UUID. Switching a trip to an inactive destination is rejected.",
        },
        planningMode: {
          type: "string",
          enum: ["manual", "ai_assisted"],
          description:
            "Choose `manual` for a standard trip or `ai_assisted` when the same trip record and budget will be used for AI itinerary previews.",
        },
        startDate: {
          type: "string",
          format: "date",
        },
        endDate: {
          type: "string",
          format: "date",
        },
        generatedAt: {
          type: "string",
          format: "date-time",
        },
        preferences: {
          type: "array",
          items: {
            $ref: "#/components/schemas/PreferenceCategory",
          },
        },
        strategy: {
          $ref: "#/components/schemas/AiPlanningStrategy",
        },
        budget: {
          $ref: "#/components/schemas/DecimalValue",
          nullable: true,
          description: "Stored trip budget reused as a rough planning signal.",
        },
        budgetFit: {
          $ref: "#/components/schemas/AiPlanningBudgetFit",
        },
        budgetWarnings: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Budget-specific caveats and low-budget warnings. This remains approximate because attraction-level pricing does not exist yet.",
        },
        isPartial: {
          type: "boolean",
        },
        coverage: {
          $ref: "#/components/schemas/AiPlanningCoverage",
        },
        warnings: {
          type: "array",
          items: {
            type: "string",
          },
        },
        days: {
          type: "array",
          items: {
            $ref: "#/components/schemas/AiPlanningDay",
          },
        },
      },
    },
    ItineraryAttractionSummary: {
      type: "object",
      required: [
        "id",
        "destinationId",
        "name",
        "slug",
        "fullAddress",
        "latitude",
        "longitude",
        "estimatedDurationMinutes",
        "rating",
        "thumbnailImageUrl",
        "mainImageUrl",
        "enrichment",
        "categories",
      ],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
        },
        name: {
          type: "string",
        },
        slug: {
          type: "string",
        },
        fullAddress: {
          type: "string",
          nullable: true,
        },
        latitude: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        longitude: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        estimatedDurationMinutes: {
          type: "integer",
          nullable: true,
        },
        rating: {
          oneOf: [{ type: "number" }, { type: "string" }],
          nullable: true,
        },
        thumbnailImageUrl: {
          type: "string",
          format: "uri",
          nullable: true,
        },
        mainImageUrl: {
          type: "string",
          format: "uri",
          nullable: true,
        },
        enrichment: {
          type: "object",
          required: ["externalSource", "externalPlaceId"],
          properties: {
            externalSource: {
              type: "string",
              nullable: true,
            },
            externalPlaceId: {
              type: "string",
              nullable: true,
            },
          },
        },
        categories: {
          type: "array",
          items: {
            $ref: "#/components/schemas/AttractionCategory",
          },
        },
      },
    },
    ItineraryItem: {
      type: "object",
      required: [
        "attractionId",
        "attractionName",
        "startTime",
        "endTime",
        "orderIndex",
        "notes",
        "source",
        "attraction",
      ],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        attractionId: {
          type: "string",
          format: "uuid",
        },
        attractionName: {
          type: "string",
        },
        startTime: {
          type: "string",
          nullable: true,
          pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
        },
        endTime: {
          type: "string",
          nullable: true,
          pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
        },
        orderIndex: {
          type: "integer",
          minimum: 1,
        },
        notes: {
          type: "string",
          nullable: true,
        },
        source: {
          type: "string",
          enum: ["manual", "ai_assisted"],
        },
        attraction: {
          allOf: [
            {
              $ref: "#/components/schemas/ItineraryAttractionSummary",
            },
          ],
          nullable: true,
        },
      },
    },
    ItineraryDay: {
      type: "object",
      required: ["dayNumber", "date", "notes", "items"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
        },
        dayNumber: {
          type: "integer",
          minimum: 1,
        },
        date: {
          type: "string",
          format: "date",
          nullable: true,
        },
        notes: {
          type: "string",
          nullable: true,
        },
        items: {
          type: "array",
          items: {
            $ref: "#/components/schemas/ItineraryItem",
          },
        },
      },
    },
    ItineraryResponse: {
      type: "object",
      required: [
        "itineraryId",
        "tripId",
        "destinationId",
        "planningMode",
        "startDate",
        "endDate",
        "hasItinerary",
        "days",
      ],
      properties: {
        itineraryId: {
          type: "string",
          format: "uuid",
          nullable: true,
        },
        tripId: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
        },
        planningMode: {
          type: "string",
          enum: ["manual", "ai_assisted"],
        },
        startDate: {
          type: "string",
          format: "date",
        },
        endDate: {
          type: "string",
          format: "date",
        },
        hasItinerary: {
          type: "boolean",
        },
        days: {
          type: "array",
          items: {
            $ref: "#/components/schemas/ItineraryDay",
          },
        },
      },
    },
    SaveItineraryItemRequest: {
      type: "object",
      required: ["attractionId"],
      properties: {
        attractionId: {
          type: "string",
          format: "uuid",
        },
        orderIndex: {
          type: "integer",
          minimum: 1,
        },
        startTime: {
          type: "string",
          nullable: true,
          pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
        },
        endTime: {
          type: "string",
          nullable: true,
          pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
        },
        notes: {
          type: "string",
          nullable: true,
          maxLength: 1000,
        },
        source: {
          type: "string",
          enum: ["manual", "ai_assisted"],
          description: "Defaults to `manual` when omitted.",
        },
      },
    },
    SaveItineraryDayRequest: {
      type: "object",
      required: ["dayNumber", "items"],
      properties: {
        dayNumber: {
          type: "integer",
          minimum: 1,
        },
        date: {
          type: "string",
          format: "date",
          description:
            "Optional client echo of the derived trip date. If supplied, it must match the server-calculated trip date for the day number.",
        },
        notes: {
          type: "string",
          nullable: true,
          maxLength: 2000,
        },
        items: {
          type: "array",
          maxItems: 12,
          items: {
            $ref: "#/components/schemas/SaveItineraryItemRequest",
          },
        },
      },
    },
    SaveItineraryRequest: {
      type: "object",
      required: ["days"],
      properties: {
        days: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: {
            $ref: "#/components/schemas/SaveItineraryDayRequest",
          },
        },
      },
      description:
        "Saves the complete itinerary snapshot for a trip. Payloads support up to 30 days and up to 12 items per day in the MVP.",
    },
    AiPlanningStrategy: {
      type: "object",
      required: ["mode", "provider", "usedProviderRanking", "reasoning"],
      properties: {
        mode: {
          type: "string",
          enum: ["deterministic_only", "deterministic_plus_provider"],
        },
        provider: {
          type: "string",
        },
        usedProviderRanking: {
          type: "boolean",
        },
        reasoning: {
          type: "string",
        },
      },
    },
    AiPlanningBudgetFit: {
      type: "object",
      required: ["level", "perDayBudget", "isApproximate", "reasoning"],
      properties: {
        level: {
          type: "string",
          enum: [
            "not_provided",
            "very_low",
            "tight",
            "balanced",
            "comfortable",
          ],
        },
        perDayBudget: {
          type: "number",
          nullable: true,
        },
        isApproximate: {
          type: "boolean",
          enum: [true],
        },
        reasoning: {
          type: "string",
        },
      },
      description:
        "MVP budget signal derived from trip duration and stored trip budget only. This is not a spend estimate.",
    },
    AiPlanningPreview: {
      type: "object",
      required: [
        "tripId",
        "destinationId",
        "planningMode",
        "startDate",
        "endDate",
        "generatedAt",
        "preferences",
        "strategy",
        "budget",
        "budgetFit",
        "budgetWarnings",
        "isPartial",
        "coverage",
        "warnings",
        "days",
      ],
      properties: {
        tripId: {
          type: "string",
          format: "uuid",
        },
        destinationId: {
          type: "string",
          format: "uuid",
        },
        planningMode: {
          type: "string",
          enum: ["manual", "ai_assisted"],
        },
        startDate: {
          type: "string",
          format: "date",
        },
        endDate: {
          type: "string",
          format: "date",
        },
        generatedAt: {
          type: "string",
          format: "date-time",
        },
        preferences: {
          type: "array",
          items: {
            $ref: "#/components/schemas/PreferenceCategory",
          },
        },
        strategy: {
          $ref: "#/components/schemas/AiPlanningStrategy",
        },
        budget: {
          $ref: "#/components/schemas/DecimalValue",
          nullable: true,
          description: "Stored trip budget reused as a rough planning signal.",
        },
        budgetFit: {
          $ref: "#/components/schemas/AiPlanningBudgetFit",
        },
        budgetWarnings: {
          type: "array",
          items: {
            type: "string",
          },
        },
        isPartial: {
          type: "boolean",
        },
        coverage: {
          $ref: "#/components/schemas/AiPlanningCoverage",
        },
        warnings: {
          type: "array",
          items: {
            type: "string",
          },
        },
        days: {
          type: "array",
          items: {
            $ref: "#/components/schemas/ItineraryDay",
          },
        },
      },
    },
    AuthTokens: {
      type: "object",
      required: ["accessToken", "refreshToken", "user"],
      properties: {
        accessToken: {
          type: "string",
        },
        refreshToken: {
          type: "string",
        },
        user: {
          $ref: "#/components/schemas/User",
        },
      },
    },
    RegisterRequest: {
      type: "object",
      required: ["name", "email", "password"],
      properties: {
        name: {
          type: "string",
        },
        email: {
          type: "string",
          format: "email",
        },
        password: {
          type: "string",
          minLength: 8,
        },
      },
    },
    LoginRequest: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          format: "email",
        },
        password: {
          type: "string",
          minLength: 8,
        },
      },
    },
    RefreshRequest: {
      type: "object",
      required: ["refreshToken"],
      properties: {
        refreshToken: {
          type: "string",
        },
      },
    },
    LogoutRequest: {
      type: "object",
      required: ["refreshToken"],
      properties: {
        refreshToken: {
          type: "string",
        },
      },
    },
    UpdateProfileRequest: {
      type: "object",
      required: ["name"],
      description: "Profile updates are intentionally limited to the display name in the MVP. Email changes are excluded.",
      properties: {
        name: {
          type: "string",
        },
      },
    },
    ReplacePreferencesRequest: {
      type: "object",
      required: ["categoryIds"],
      properties: {
        categoryIds: {
          type: "array",
          items: {
            type: "string",
            format: "uuid",
          },
        },
      },
    },
    CreateTripRequest: {
      type: "object",
      required: [
        "title",
        "destinationId",
        "planningMode",
        "startDate",
        "endDate",
        "budget",
        "preferenceSource",
      ],
      properties: {
        title: {
          type: "string",
        },
        destinationId: {
          type: "string",
          format: "uuid",
          description: "Only active destinations can be used for trip planning.",
        },
        planningMode: {
          type: "string",
          enum: ["manual", "ai_assisted"],
        },
        startDate: {
          type: "string",
          format: "date",
        },
        endDate: {
          type: "string",
          format: "date",
        },
        budget: {
          type: "number",
          minimum: 0,
          description:
            "Required trip-level planning budget for both manual and ai_assisted trips. Manual trips still store this value even if AI is never used.",
        },
        preferenceSource: {
          type: "string",
          enum: ["profile", "custom"],
          description:
            "Use `profile` to snapshot the current user preferences. Use `custom` to snapshot the supplied `preferenceCategoryIds`.",
        },
        preferenceCategoryIds: {
          type: "array",
          items: {
            type: "string",
            format: "uuid",
          },
          description:
            "Required when preferenceSource is `custom`. Ignored when preferenceSource is `profile`.",
        },
      },
    },
    UpdateTripRequest: {
      type: "object",
      properties: {
        title: {
          type: "string",
        },
        destinationId: {
          type: "string",
          format: "uuid",
          description:
            "Destination UUID. Switching a trip to an inactive destination is rejected.",
        },
        planningMode: {
          type: "string",
          enum: ["manual", "ai_assisted"],
          description:
            "Existing trip planning mode. This can only be changed while the trip has no saved itinerary.",
        },
        startDate: {
          type: "string",
          format: "date",
        },
        endDate: {
          type: "string",
          format: "date",
        },
        budget: {
          type: "number",
          minimum: 0,
          description:
            "Editable trip-level planning budget shared by manual and ai_assisted trips.",
        },
        preferenceSource: {
          type: "string",
          enum: ["profile", "custom"],
          description:
            "Use `profile` to resnapshot the current user preferences. Use `custom` to resnapshot the supplied `preferenceCategoryIds`.",
        },
        preferenceCategoryIds: {
          type: "array",
          items: {
            type: "string",
            format: "uuid",
          },
          description: "Required when preferenceSource is `custom`.",
        },
      },
      description:
        "If a trip already has an itinerary, only title, budget, and preference snapshot changes are allowed in the MVP. Partial date updates are validated against the trip's existing persisted date range.",
    },
  },
};

module.exports = { components };
