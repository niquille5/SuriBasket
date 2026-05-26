const express = require("express");
const { createFeedback, getStats } = require("../controllers/feedback-controller");

const router = express.Router();

router.post("/api/feedback", createFeedback);
router.get("/api/feedback/stats", getStats);

module.exports = router;
