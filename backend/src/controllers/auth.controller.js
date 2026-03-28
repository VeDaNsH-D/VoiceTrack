const authService = require("../services/auth.service");

async function getAuthStatus(req, res, next) {
  try {
    const result = await authService.getAuthStatus();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAuthStatus,
};
