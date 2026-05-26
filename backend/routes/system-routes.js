const express = require("express");
const { getApiIndex, getFavicon, getHealth, getSummary } = require("../controllers/system-controller");

const router = express.Router();

router.get("/api", getApiIndex);
router.get("/favicon.ico", getFavicon);
router.get("/api/health", getHealth);
router.get("/api/summary", getSummary);

module.exports = router;
