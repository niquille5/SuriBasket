const express = require("express");
const { createFeedback, getStats } = require("../controllers/feedback-controller");
const { validateFeedback } = require("../middlewares/validation");

const router = express.Router();

// Request validation middleware:
// validateFeedback checks rating, email, and message before inserting feedback.
// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.post("/api/feedback", validateFeedback, createFeedback);
router.get("/api/feedback/stats", getStats);

module.exports = router;
