process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";

const { Op } = require("sequelize");
const { createAttractionsService } = require("../src/modules/attractions/attractions.service");

describe("attractions service", () => {
  test("listByDestination paginates attractions and returns pagination metadata", async () => {
    const destinationId = "22222222-2222-4222-8222-222222222222";
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          id: destinationId,
          name: "Batam",
          slug: "batam",
          isActive: true,
        }),
      },
      Attraction: {
        count: jest.fn().mockResolvedValue(3),
        findAll: jest.fn().mockResolvedValue([
          {
            id: "33333333-3333-4333-8333-333333333333",
            destinationId,
            name: "Pantai Nongsa",
            slug: "pantai-nongsa",
            description: "Beach",
            fullAddress: "Batam, Indonesia",
            latitude: "1.1870000",
            longitude: "104.1190000",
            estimatedDurationMinutes: 120,
            openingHours: {},
            rating: "4.5",
            thumbnailImageUrl: null,
            mainImageUrl: null,
            metadata: {},
          },
        ]),
      },
    };
    const attractionsService = createAttractionsService({
      dbProvider: () => db,
    });

    const result = await attractionsService.listByDestination(destinationId, {
      page: 2,
      limit: 1,
    });

    expect(result.destination).toEqual(
      expect.objectContaining({
        id: destinationId,
        slug: "batam",
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        primaryPreference: {
          slug: "popular",
          name: "Populer",
        },
        thumbnailImageUrl: `http://localhost:3000/api/attractions/33333333-3333-4333-8333-333333333333/photo?variant=thumbnail`,
        mainImageUrl: `http://localhost:3000/api/attractions/33333333-3333-4333-8333-333333333333/photo?variant=main`,
      })
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
    expect(db.Attraction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1,
        offset: 1,
      })
    );
  });

  test("listByDestination rejects unknown category filters", async () => {
    const destinationId = "22222222-2222-4222-8222-222222222222";
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          id: destinationId,
          name: "Batam",
          slug: "batam",
          isActive: true,
        }),
      },
      Attraction: {
        findAll: jest.fn(),
      },
      AttractionCategory: {
        findAll: jest.fn().mockResolvedValue([]),
      },
    };
    const attractionsService = createAttractionsService({
      dbProvider: () => db,
    });

    await expect(
      attractionsService.listByDestination(destinationId, {
        categoryIds: ["77777777-7777-4777-8777-777777777777"],
      })
    ).rejects.toMatchObject({
      message: "One or more attraction categories do not exist.",
      statusCode: 422,
    });
  });

  test("listByDestination supports destination slug lookup and q search", async () => {
    const destinationId = "22222222-2222-4222-8222-222222222222";
    const db = {
      Destination: {
        findOne: jest.fn().mockResolvedValue({
          id: destinationId,
          name: "Batam",
          slug: "batam",
          isActive: true,
        }),
      },
      Attraction: {
        count: jest.fn().mockResolvedValue(1),
        findAll: jest.fn().mockResolvedValue([]),
      },
    };
    const attractionsService = createAttractionsService({
      dbProvider: () => db,
    });

    await attractionsService.listByDestination("batam", {
      page: 1,
      limit: 12,
      q: "nongsa",
    });

    expect(db.Destination.findOne).toHaveBeenCalledWith({
      where: { slug: "batam" },
    });
    expect(db.Attraction.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        destinationId,
        isActive: true,
        [Op.or]: expect.arrayContaining([
          expect.objectContaining({
            name: {
              [Op.iLike]: "%nongsa%",
            },
          }),
        ]),
      }),
    });
  });

  test("getPhotoAsset returns a Google photo when the attraction already has a place id", async () => {
    const attractionId = "33333333-3333-4333-8333-333333333333";
    const db = {
      Attraction: {
        findByPk: jest.fn().mockResolvedValue({
          id: attractionId,
          isActive: true,
          name: "Pantai Nongsa",
          externalPlaceId: "google-place-1",
          thumbnailImageUrl: null,
          mainImageUrl: null,
        }),
        findOne: jest.fn(),
      },
      Destination: {
        findByPk: jest.fn(),
      },
    };
    const googlePlacesClient = {
      getPlaceDetails: jest.fn().mockResolvedValue({
        placeId: "google-place-1",
        photos: [
          {
            photoReference: "photo-ref-1",
          },
        ],
      }),
      getPlacePhoto: jest.fn().mockResolvedValue({
        body: Buffer.from("image-bytes"),
        contentType: "image/jpeg",
      }),
      textSearch: jest.fn(),
    };
    const attractionsService = createAttractionsService({
      dbProvider: () => db,
      googlePlacesClient,
    });

    const result = await attractionsService.getPhotoAsset(attractionId, "thumbnail");

    expect(googlePlacesClient.getPlaceDetails).toHaveBeenCalledWith("google-place-1", {
      includePhotos: true,
    });
    expect(googlePlacesClient.getPlacePhoto).toHaveBeenCalledWith({
      photoReference: "photo-ref-1",
      maxWidth: 640,
    });
    expect(result).toEqual(
      expect.objectContaining({
        type: "binary",
        statusCode: 200,
        contentType: "image/jpeg",
      })
    );
    expect(result.body).toBeInstanceOf(Buffer);
  });

  test("getPhotoAsset does not redirect when the stored image URL points back to the same photo endpoint", async () => {
    const attractionId = "33333333-3333-4333-8333-333333333333";
    const db = {
      Attraction: {
        findByPk: jest.fn().mockResolvedValue({
          id: attractionId,
          isActive: true,
          name: "Pantai Nongsa",
          externalPlaceId: "google-place-1",
          thumbnailImageUrl: `http://localhost:3000/api/attractions/${attractionId}/photo?variant=thumbnail`,
          mainImageUrl: null,
        }),
        findOne: jest.fn(),
      },
      Destination: {
        findByPk: jest.fn(),
      },
    };
    const googlePlacesClient = {
      getPlaceDetails: jest.fn().mockResolvedValue({
        placeId: "google-place-1",
        photos: [
          {
            photoReference: "photo-ref-1",
          },
        ],
      }),
      getPlacePhoto: jest.fn().mockResolvedValue({
        body: Buffer.from("image-bytes"),
        contentType: "image/jpeg",
      }),
      textSearch: jest.fn(),
    };
    const attractionsService = createAttractionsService({
      dbProvider: () => db,
      googlePlacesClient,
    });

    const result = await attractionsService.getPhotoAsset(attractionId, "thumbnail");

    expect(result).toEqual(
      expect.objectContaining({
        type: "binary",
        statusCode: 200,
        contentType: "image/jpeg",
      })
    );
    expect(googlePlacesClient.getPlaceDetails).toHaveBeenCalledWith("google-place-1", {
      includePhotos: true,
    });
  });

  test("getPhotoAsset falls back to an inline placeholder when no Google photo can be resolved", async () => {
    const attractionId = "33333333-3333-4333-8333-333333333333";
    const db = {
      Attraction: {
        findByPk: jest.fn().mockResolvedValue({
          id: attractionId,
          destinationId: "22222222-2222-4222-8222-222222222222",
          isActive: true,
          name: "Pantai Nongsa",
          fullAddress: "Batam, Indonesia",
          latitude: "1.1870000",
          longitude: "104.1190000",
          externalPlaceId: null,
          thumbnailImageUrl: null,
          mainImageUrl: null,
        }),
        findOne: jest.fn(),
      },
      Destination: {
        findByPk: jest.fn().mockResolvedValue({
          id: "22222222-2222-4222-8222-222222222222",
          name: "Batam",
          countryName: "Indonesia",
        }),
      },
    };
    const googlePlacesClient = {
      getPlaceDetails: jest.fn(),
      getPlacePhoto: jest.fn(),
      textSearch: jest.fn().mockResolvedValue([]),
    };
    const attractionsService = createAttractionsService({
      dbProvider: () => db,
      googlePlacesClient,
    });

    const result = await attractionsService.getPhotoAsset(attractionId, "main");

    expect(googlePlacesClient.textSearch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        type: "inline",
        statusCode: 200,
        contentType: "image/svg+xml; charset=utf-8",
      })
    );
    expect(String(result.body)).toContain("Pantai Nongsa");
    expect(String(result.body)).toContain("<svg");
  });
});
