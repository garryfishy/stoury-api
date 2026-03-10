const env = require("./config/env");
const { app } = require("./app");
const { logger } = require("./config/logger");

app.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);
});
