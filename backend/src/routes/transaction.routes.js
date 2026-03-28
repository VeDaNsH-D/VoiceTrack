const express = require("express");
const { processText } = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/process-text", processText);

module.exports = router;
