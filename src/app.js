const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const env = require("./config/env");
const { setupOpenApi } = require("./docs/openapi");
const { errorHandler } = require("./middlewares/error-handler");
const { notFoundHandler } = require("./middlewares/not-found");
const {
  getAdminEnrichmentRuntimeStatus,
  logAdminEnrichmentStartupStatus,
} = require("./modules/admin-attractions/admin-attractions.runtime");
const { adminWebRouter } = require("./modules/admin-web/admin-web.routes");
const { apiRouter } = require("./routes");

const app = express();
app.disable("etag");

const helmetOptions = env.ENABLE_HTTPS_UPGRADE_CSP
  ? {}
  : {
      contentSecurityPolicy: {
        directives: {
          "upgrade-insecure-requests": null,
        },
      },
    };

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  cors({
    origin: env.CLIENT_ORIGIN === "*" ? true : env.CLIENT_ORIGIN,
  })
);
app.use(helmet(helmetOptions));
app.use(express.json());
app.use("/admin/assets", express.static(path.join(__dirname, "public/admin")));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  logAdminEnrichmentStartupStatus();
}

app.get("/health", (_req, res) => {
  const adminEnrichment = getAdminEnrichmentRuntimeStatus();

  res.json({
    success: true,
    message: "Service is healthy.",
    data: {
      app: env.APP_NAME,
      environment: env.NODE_ENV,
      features: {
        adminEnrichment: {
          enabled: adminEnrichment.enabled,
          status: adminEnrichment.status,
          featureFlagEnabled: adminEnrichment.featureFlagEnabled,
          googlePlacesConfigured: adminEnrichment.googlePlacesConfigured,
        },
      },
    },
  });
});

setupOpenApi(app);
app.use("/admin", adminWebRouter);
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
module.exports.app = app;
