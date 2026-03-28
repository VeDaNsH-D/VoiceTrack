const express = require("express");
const {
	processText,
	listHistory,
	saveTransaction,
} = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/process-text", processText);
router.post("/save", saveTransaction);
router.get("/history", listHistory);

module.exports = router;
