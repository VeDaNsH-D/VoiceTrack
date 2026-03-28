const express = require("express");
const { receiveWebhook } = require("../controllers/webhook.controller");

const router = express.Router();

router.post("/", receiveWebhook);

module.exports = router;
