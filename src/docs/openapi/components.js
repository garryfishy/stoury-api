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
        durationDays: {
          type: "integer",
        },
        budget: {
          $ref: "#/components/schemas/DecimalValue",
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
        "estimatedDurationMinutes",
        "rating",
        "thumbnailImageUrl",
        "mainImageUrl",
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
        "estimatedDurationMinutes",
        "rating",
        "thumbnailImageUrl",
        "mainImageUrl",
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
