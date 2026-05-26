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
const { requireRole } = require("../middleware/auth");

const router = express.Router();
const adminOnly = requireRole("admin");

router.get("/api/admin/overview", adminOnly, getOverview);
router.get("/api/admin/feedback", adminOnly, getAdminFeedback);
router.patch("/api/admin/feedback/:id", adminOnly, updateAdminFeedback);
router.delete("/api/admin/feedback/:id", adminOnly, deleteAdminFeedback);
router.get("/api/admin/users", adminOnly, getAdminUsers);
router.post("/api/admin/users", adminOnly, createAdminUser);
router.patch("/api/admin/users/:id", adminOnly, updateAdminUser);
router.delete("/api/admin/users/:id", adminOnly, deleteAdminUser);

module.exports = router;
