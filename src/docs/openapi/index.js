const swaggerUi = require("swagger-ui-express");
const env = require("../../config/env");
const { components } = require("./components");
const { authPaths } = require("./paths/auth");
const { usersPaths } = require("./paths/users");
const { preferencesPaths } = require("./paths/preferences");
const { destinationsPaths } = require("./paths/destinations");
const { attractionsPaths } = require("./paths/attractions");
const { tripsPaths } = require("./paths/trips");
const { itinerariesPaths } = require("./paths/itineraries");
const { aiPlanningPaths } = require("./paths/ai-planning");

const baseTags = [
  {
    name: "Auth",
    description: "Registration, login, token refresh, and logout.",
  },
  {
    name: "Users",
    description: "Authenticated user profile endpoints.",
  },
  {
    name: "Preferences",
    description: "User preference snapshot endpoints.",
  },
  {
    name: "Destinations",
    description: "Public curated destination catalog endpoints.",
  },
  {
    name: "Attractions",
    description: "Public curated attraction catalog endpoints.",
  },
  {
    name: "Trips",
    description: "Authenticated trip lifecycle endpoints.",
  },
  {
    name: "AI Planning",
    description: "Authenticated AI itinerary preview endpoints.",
  },
  {
    name: "Itineraries",
    description: "Authenticated itinerary save and fetch endpoints.",
  },
];

const buildServers = () => {
  const servers = [
    {
      url: `http://localhost:${env.PORT}`,
      description: "Local development server",
    },
  ];

  if (env.OPENAPI_SERVER_URL) {
    servers.push({
      url: env.OPENAPI_SERVER_URL,
      description: "Configured public server",
    });
  }

  return servers.filter(
    (server, index, list) => list.findIndex((item) => item.url === server.url) === index
  );
};

const buildOpenApiDocument = ({
  extraPaths = {},
  extraSchemas = {},
  extraResponses = {},
  extraParameters = {},
  extraTags = [],
} = {}) => ({
  openapi: "3.0.3",
  info: {
    title: "Stoury API",
    version: "0.1.0",
    description:
      "MVP travel planner backend covering authentication, profile, preferences, destinations, attractions, trips, itinerary save/fetch, and AI itinerary preview flows.",
  },
  servers: buildServers(),
  tags: [...baseTags, ...extraTags],
  components: {
    ...components,
    schemas: {
      ...components.schemas,
      ...extraSchemas,
    },
    responses: {
      ...components.responses,
      ...extraResponses,
    },
    parameters: {
      ...components.parameters,
      ...extraParameters,
    },
  },
  paths: {
    ...authPaths,
    ...usersPaths,
    ...preferencesPaths,
    ...destinationsPaths,
    ...attractionsPaths,
    ...tripsPaths,
    ...itinerariesPaths,
    ...aiPlanningPaths,
    ...extraPaths,
  },
});

const setupOpenApi = (app, options = {}) => {
  const document = buildOpenApiDocument(options);

  app.get("/docs/openapi.json", (_req, res) => {
    res.json(document);
  });

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(document, {
      explorer: true,
      customSiteTitle: "Stoury API Docs",
    })
  );
};

module.exports = {
  buildOpenApiDocument,
  setupOpenApi,
};
