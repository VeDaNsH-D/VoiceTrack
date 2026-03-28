const express = require("express");
const {
	processText,
	listHistory,
} = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/process-text", processText);
router.get("/history", listHistory);

module.exports = router;
