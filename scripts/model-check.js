const models = require("../src/database/models");

const modelNames = Object.keys(models).filter(
  (key) => !["sequelize", "Sequelize"].includes(key)
);

console.log(`Loaded ${modelNames.length} models.`);
console.log(modelNames.sort().join(", "));

models.sequelize.close();
