const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || "",
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "",
  geminiModel:
    process.env.GEMINI_MODEL ||
    process.env.OPENAI_MODEL ||
    "gemini-2.5-flash",
  geminiBaseUrl:
    process.env.GEMINI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta/openai",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openAiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  groqApiUrl:
    process.env.GROQ_API_URL ||
    "https://api.groq.com/openai/v1/chat/completions",
};
