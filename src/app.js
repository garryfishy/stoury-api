const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const { setupOpenApi } = require("./docs/openapi");
const { errorHandler } = require("./middlewares/error-handler");
const { notFoundHandler } = require("./middlewares/not-found");
const { apiRouter } = require("./routes");

const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN === "*" ? true : env.CLIENT_ORIGIN,
  })
);
app.use(helmet());
app.use(express.json());
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Service is healthy.",
    data: {
      app: env.APP_NAME,
      environment: env.NODE_ENV,
    },
  });
});

setupOpenApi(app);
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
module.exports.app = app;
