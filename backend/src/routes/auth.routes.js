const express = require("express");
const { getAuthStatus } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/status", getAuthStatus);

module.exports = router;
