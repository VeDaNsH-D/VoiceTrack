function sendSuccess(res, data, message = "OK", statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        ...(message ? { message } : {}),
    });
}

function sendError(res, message = "Something went wrong", statusCode = 500, error = undefined) {
    return res.status(statusCode).json({
        success: false,
        message,
        ...(error !== undefined ? { error } : {}),
    });
}

module.exports = {
    sendSuccess,
    sendError,
};
