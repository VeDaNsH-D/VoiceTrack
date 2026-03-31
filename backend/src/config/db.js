const mongoose = require("mongoose");
const env = require("./env");
const logger = require("../utils/logger");

let connectionPromise;

async function connectDb(uriOverride = "") {
  const targetUri = uriOverride || env.mongoUri;

  if (!targetUri) {
    logger.warn("MONGO_URI not set, skipping database connection");
    return null;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    const connection = await connectionPromise;
    logger.info("MongoDB connected");
    return connection;
  } catch (error) {
    connectionPromise = null;
    logger.error("MongoDB connection failed", error);
    throw error;
  }
}

module.exports = connectDb;
