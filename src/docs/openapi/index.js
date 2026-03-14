const swaggerUi = require("swagger-ui-express");
const env = require("../../config/env");
const {
  databaseRelationsDiagram,
  renderDatabaseRelationsPage,
} = require("../database-relations");
const { components } = require("./components");
const { authPaths } = require("./paths/auth");
const { usersPaths } = require("./paths/users");
const { preferencesPaths } = require("./paths/preferences");
const { destinationsPaths } = require("./paths/destinations");
const { dashboardPaths } = require("./paths/dashboard");
const { attractionsPaths } = require("./paths/attractions");
const { adminAttractionsPaths } = require("./paths/admin-attractions");
const { tripsPaths } = require("./paths/trips");
const { itinerariesPaths } = require("./paths/itineraries");
const { aiPlanningPaths } = require("./paths/ai-planning");

const DEFAULT_PUBLIC_OPENAPI_SERVERS = [
  {
    url: "https://stoury-api.oceandigital.id/",
    description: "Ocean Digital hosted server",
  },
];

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
    name: "Dashboard",
    description: "Public global mobile dashboard and search endpoints.",
  },
  {
    name: "Attractions",
    description: "Public curated attraction catalog endpoints.",
  },
  {
    name: "Admin Attractions",
    description:
      "Internal admin-only attraction enrichment and operational catalog endpoints. This feature may be disabled by environment.",
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
    ...DEFAULT_PUBLIC_OPENAPI_SERVERS,
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
      "MVP travel planner backend covering authentication, profile, preferences, destinations, dashboard home, attractions, admin attraction enrichment, trips, itinerary save/fetch, and AI itinerary preview flows.",
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
    ...dashboardPaths,
    ...attractionsPaths,
    ...adminAttractionsPaths,
    ...tripsPaths,
    ...itinerariesPaths,
    ...aiPlanningPaths,
    ...extraPaths,
  },
});

const setupOpenApi = (app, options = {}) => {
  const document = buildOpenApiDocument(options);

  app.get("/docs/database-relations.mmd", (_req, res) => {
    res.type("text/plain").send(databaseRelationsDiagram.trimStart());
  });

  app.get("/docs/database-relations", (_req, res) => {
    res.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "connect-src 'self' https://cdn.jsdelivr.net",
        "base-uri 'self'",
        "frame-ancestors 'self'",
      ].join("; ")
    );

    res.type("html").send(renderDatabaseRelationsPage());
  });

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
