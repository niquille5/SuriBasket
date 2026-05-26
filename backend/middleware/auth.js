const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/auth");
const { sendForbidden, sendUnauthorized } = require("../utils/api-response");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    sendUnauthorized(res, "Login vereist");
    return;
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch (err) {
    sendUnauthorized(res, "Ongeldige of verlopen sessie");
  }
}

function requireRole(role) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (req.user.role !== role) {
        sendForbidden(res, "Geen toegang voor deze rol");
        return;
      }

      next();
    });
  };
}

module.exports = {
  requireAuth,
  requireRole
};
