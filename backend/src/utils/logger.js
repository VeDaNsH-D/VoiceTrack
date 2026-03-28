function serializeError(error) {
  if (!error) {
    return undefined;
  }

  return {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };
}

function log(level, message, meta) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (meta instanceof Error) {
    payload.error = serializeError(meta);
  } else if (meta) {
    payload.meta = meta;
  }

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

module.exports = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};
