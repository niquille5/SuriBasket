const express = require("express");
const { getMe, login, register } = require("../controllers/auth-controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/api/register", register);
router.post("/api/login", login);
router.get("/api/me", requireAuth, getMe);

module.exports = router;
