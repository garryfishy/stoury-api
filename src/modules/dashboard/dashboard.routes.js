const express = require("express");
const {
  getDashboardHome,
  searchDashboardAttractions,
} = require("./dashboard.controller");

const dashboardRouter = express.Router();

dashboardRouter.get("/home", getDashboardHome);
dashboardRouter.get("/search", searchDashboardAttractions);

module.exports = {
  dashboardRouter,
};
