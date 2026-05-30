const express = require("express");
const { getMe, login, register } = require("../controllers/auth-controller");
const { requireAuth } = require("../middlewares/auth");
const { validateLogin, validateRegister } = require("../middlewares/validation");

const router = express.Router();

// Request validation middleware:
// validateRegister checks the register schema before creating a user.
// validateLogin checks the login schema before issuing a JWT.
// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.post("/api/register", validateRegister, register);
router.post("/api/login", validateLogin, login);
router.get("/api/me", requireAuth, getMe);

module.exports = router;
