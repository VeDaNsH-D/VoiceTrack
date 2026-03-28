const http = require("http");
const app = require("./app");
const connectDb = require("./config/db");
const env = require("./config/env");
const logger = require("./utils/logger");

const server = http.createServer(app);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${env.port} is already in use`, error);
    process.exit(1);
  }

  logger.error("HTTP server error", error);
  process.exit(1);
});

async function startServer() {
  try {
    try {
      await connectDb();
    } catch (error) {
      logger.warn(
        "Starting backend without database connection. Chat endpoints can still work, but database-backed features may fail.",
        { message: error.message }
      );
    }

    server.listen(env.port, () => {
      logger.info(`Backend listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error("Failed to start backend", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down");
  server.close(() => process.exit(0));
});
