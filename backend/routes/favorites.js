const express = require("express");
const {
  checkFavorite,
  createFavorite,
  deleteFavorite,
  getFavoritesByUser,
  getUserFavorites
} = require("../controllers/favorite-controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.get("/api/favorites", requireAuth, getUserFavorites);
router.get("/api/favorites/:user_id", requireAuth, getFavoritesByUser);
router.post("/api/favorites/add", requireAuth, createFavorite);
router.delete("/api/favorites/remove", requireAuth, deleteFavorite);
router.get("/api/favorites/check/:product_id", requireAuth, checkFavorite);

module.exports = router;
