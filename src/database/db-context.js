const path = require("path");
const { AppError } = require("../utils/app-error");

let cachedDb = null;

const getDb = () => {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    // AGENT 1 owns the Sequelize model registry at this location.
    cachedDb = require(path.resolve(__dirname, "models"));
    return cachedDb;
  } catch (error) {
    throw new AppError(
      "Database models are not ready. Expected src/database/models/index.js to export sequelize and models.",
      500,
      { cause: error.message }
    );
  }
};

const getRequiredModel = (db, modelName) => {
  const model = db[modelName];

  if (!model) {
    throw new AppError(`Database model "${modelName}" is not available.`, 500);
  }

  return model;
};

const withTransaction = async (work, explicitDb) => {
  const db = explicitDb || getDb();

  if (!db.sequelize || typeof db.sequelize.transaction !== "function") {
    return work(null, db);
  }

  return db.sequelize.transaction(async (transaction) => work(transaction, db));
};

module.exports = {
  getDb,
  getRequiredModel,
  withTransaction,
};
