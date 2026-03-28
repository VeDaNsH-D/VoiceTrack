const logger = require("../utils/logger");

function errorMiddleware(error, req, res, next) {
  logger.error("Unhandled request error", error);

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  const code = error.code || "INTERNAL_SERVER_ERROR";

  res.status(statusCode).json({
    error: {
      message,
      code,
    },
  });
}

module.exports = errorMiddleware;
