const axios = require("axios");
const env = require("../config/env");
const logger = require("../utils/logger");

const systemPrompt =
  "You are a helpful assistant for small business vendors in India. You understand Hindi, English, and Hinglish. Respond in the same language as the user. Keep responses short, clear, and conversational.";

async function getGroqReply(userMessage, userId) {
  if (!env.groqApiKey) {
    const error = new Error("GROQ_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const payload = {
    model: env.groqModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };

  logger.info("Sending chat request to Groq", {
    userId,
    model: env.groqModel,
  });

  try {
    const response = await axios.post(env.groqApiUrl, payload, {
      headers: {
        Authorization: `Bearer ${env.groqApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    const reply = response.data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("Groq API returned an empty response");
    }

    logger.info("Received chat response from Groq", { userId });

    return reply;
  } catch (error) {
    logger.error("Groq API request failed", {
      userId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    const providerMessage =
      error.response?.data?.error?.message || "Failed to fetch response from Groq API";
    const serviceError = new Error(providerMessage);
    serviceError.statusCode = 500;
    throw serviceError;
  }
}

module.exports = {
  getGroqReply,
};
