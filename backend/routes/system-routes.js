const express = require("express");
const { getApiIndex, getFavicon, getHealth, getSummary } = require("../controllers/system-controller");

const router = express.Router();

// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.get("/api", getApiIndex);
router.get("/favicon.ico", getFavicon);
router.get("/api/health", getHealth);
router.get("/api/summary", getSummary);

module.exports = router;
