const express = require("express");
const {
  createAlert,
  deleteAlert,
  getAlerts,
  getTriggeredAlerts
} = require("../controllers/price-alert-controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.get("/api/price-alerts", requireAuth, getAlerts);
router.get("/api/price-alerts/triggered", requireAuth, getTriggeredAlerts);
router.post("/api/price-alerts", requireAuth, createAlert);
router.delete("/api/price-alerts/:alert_id", requireAuth, deleteAlert);

module.exports = router;
