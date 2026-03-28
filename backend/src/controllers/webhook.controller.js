const { sendSuccess } = require("../utils/apiResponse");

async function receiveWebhook(req, res, next) {
  try {
    return sendSuccess(res, {
      received: true,
      payload: req.body || null,
    }, "Webhook received", 202);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  receiveWebhook,
};
