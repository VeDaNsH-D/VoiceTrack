const groqService = require("../services/groqService");
const logger = require("../utils/logger");

async function chat(req, res) {
  const { userId, message } = req.body || {};

  console.log("POST /chat request received", {
    userId,
    hasMessage: Boolean(message),
  });

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({
      message: "userId is required and must be a string",
    });
  }

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      message: "message is required and must be a string",
    });
  }

  try {
    const reply = await groqService.getGroqReply(message.trim(), userId.trim());

    return res.status(200).json({ reply });
  } catch (error) {
    logger.error("Chat controller failed", error);

    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

module.exports = {
  chat,
};
