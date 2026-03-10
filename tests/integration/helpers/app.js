require("./test-env");

const appModule = require("../../../src/app");

module.exports = {
  app: appModule.app || appModule,
};

