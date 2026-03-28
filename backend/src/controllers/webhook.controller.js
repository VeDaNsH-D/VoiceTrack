async function receiveWebhook(req, res, next) {
  try {
    res.status(202).json({
      received: true,
      payload: req.body || null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  receiveWebhook,
};
