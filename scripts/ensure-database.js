"use strict";

const { Client } = require("pg");
const configByEnv = require("../src/database/config/config");

const targetEnv = process.argv[2] || process.env.NODE_ENV || "development";
const config = configByEnv[targetEnv];

if (!config) {
  throw new Error(`Unknown database environment "${targetEnv}".`);
}

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;

const buildConnectionCandidates = (sequelizeConfig) => {
  if (sequelizeConfig.use_env_variable) {
    const connectionString = process.env[sequelizeConfig.use_env_variable];

    if (!connectionString) {
      throw new Error(
        `Environment variable ${sequelizeConfig.use_env_variable} is required but not set.`
      );
    }

    const primaryUrl = new URL(connectionString);
    const databaseName = decodeURIComponent(primaryUrl.pathname.replace(/^\//, ""));
    const postgresUrl = new URL(connectionString);
    const templateUrl = new URL(connectionString);

    postgresUrl.pathname = "/postgres";
    templateUrl.pathname = "/template1";

    return {
      databaseName,
      connectionCandidates: [postgresUrl.toString(), templateUrl.toString()]
    };
  }

  return {
    databaseName: sequelizeConfig.database,
    connectionCandidates: [
      {
        host: sequelizeConfig.host,
        port: sequelizeConfig.port,
        user: sequelizeConfig.username,
        password: sequelizeConfig.password,
        database: "postgres",
        ssl: sequelizeConfig.dialectOptions?.ssl
      },
      {
        host: sequelizeConfig.host,
        port: sequelizeConfig.port,
        user: sequelizeConfig.username,
        password: sequelizeConfig.password,
        database: "template1",
        ssl: sequelizeConfig.dialectOptions?.ssl
      }
    ]
  };
};

const findExistingDatabase = async (client, databaseName) => {
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1;", [
    databaseName
  ]);

  return result.rowCount > 0;
};

const ensureDatabase = async () => {
  const { databaseName, connectionCandidates } = buildConnectionCandidates(config);
  const errors = [];

  for (const candidate of connectionCandidates) {
    const client = new Client(candidate);

    try {
      await client.connect();

      if (await findExistingDatabase(client, databaseName)) {
        console.log(`Database ${databaseName} already exists.`);
        return;
      }

      await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)};`);
      console.log(`Database ${databaseName} created.`);
      return;
    } catch (error) {
      if (error.code === "42P04") {
        console.log(`Database ${databaseName} already exists.`);
        return;
      }

      errors.push(error);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const error = errors[0] || new Error(`Failed to create database ${databaseName}.`);
  throw error;
};

ensureDatabase().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
