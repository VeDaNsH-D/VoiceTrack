const express = require("express");
const { getInsights } = require("../controllers/insights.controller");

const router = express.Router();

router.get("/", getInsights);

module.exports = router;
