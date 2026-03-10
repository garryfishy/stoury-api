require("dotenv").config();

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
};

const baseConfig = {
  dialect: "postgres",
  migrationStorage: "sequelize",
  seederStorage: "sequelize",
  logging: parseBoolean(process.env.DB_LOGGING, false) ? console.log : false,
  define: {
    underscored: true,
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
};

const buildConfig = ({ databaseUrl, database, username, password }) => {
  const sslEnabled = parseBoolean(process.env.DB_SSL, false);

  return {
    ...baseConfig,
    ...(databaseUrl
      ? {
          use_env_variable: databaseUrl
        }
      : {
          host: process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.DB_PORT || 5432),
          database,
          username,
          password
        }),
    dialectOptions: sslEnabled
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
  };
};

module.exports = {
  development: buildConfig({
    databaseUrl: process.env.DATABASE_URL ? "DATABASE_URL" : null,
    database: process.env.DB_NAME || "stoury_api_dev",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres"
  }),
  test: buildConfig({
    databaseUrl: process.env.DATABASE_URL_TEST ? "DATABASE_URL_TEST" : null,
    database: process.env.DB_NAME_TEST || "stoury_api_test",
    username: process.env.DB_USER_TEST || "postgres",
    password: process.env.DB_PASSWORD_TEST || "postgres"
  }),
  production: buildConfig({
    databaseUrl: process.env.DATABASE_URL_PROD ? "DATABASE_URL_PROD" : null,
    database: process.env.DB_NAME_PROD || "stoury_api",
    username: process.env.DB_USER_PROD || "postgres",
    password: process.env.DB_PASSWORD_PROD || "change_me"
  })
};
