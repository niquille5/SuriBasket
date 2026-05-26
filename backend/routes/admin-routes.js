const express = require("express");
const {
  createAdminUser,
  deleteAdminFeedback,
  deleteAdminUser,
  getAdminFeedback,
  getAdminUsers,
  getOverview,
  updateAdminFeedback,
  updateAdminUser
} = require("../controllers/admin-controller");
const { requireRole } = require("../middlewares/auth");
const {
  validateAdminFeedbackUpdate,
  validateAdminUserCreate,
  validateAdminUserUpdate
} = require("../middlewares/validation");

const router = express.Router();
const adminOnly = requireRole("admin");

// Request validation middleware:
// validateAdminUserCreate and validateAdminUserUpdate check user schemas.
// validateAdminFeedbackUpdate checks status and priority schemas.
// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.get("/api/admin/overview", adminOnly, getOverview);
router.get("/api/admin/feedback", adminOnly, getAdminFeedback);
router.patch("/api/admin/feedback/:id", adminOnly, validateAdminFeedbackUpdate, updateAdminFeedback);
router.delete("/api/admin/feedback/:id", adminOnly, deleteAdminFeedback);
router.get("/api/admin/users", adminOnly, getAdminUsers);
router.post("/api/admin/users", adminOnly, validateAdminUserCreate, createAdminUser);
router.patch("/api/admin/users/:id", adminOnly, validateAdminUserUpdate, updateAdminUser);
router.delete("/api/admin/users/:id", adminOnly, deleteAdminUser);

module.exports = router;
