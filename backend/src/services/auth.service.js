async function getAuthStatus() {
  return {
    authenticated: false,
    message: "Auth service placeholder",
  };
}

module.exports = {
  getAuthStatus,
};
