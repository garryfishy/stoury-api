const express = require("express");
const { getDashboardHome } = require("./dashboard.controller");

const dashboardRouter = express.Router();

dashboardRouter.get("/home", getDashboardHome);

module.exports = {
  dashboardRouter,
};
