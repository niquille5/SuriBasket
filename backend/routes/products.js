const express = require("express");
const {
  checkPrice,
  getCheapest,
  getOfficialProducts,
  getPrices,
  getProducts
} = require("../controllers/product-controller");

const router = express.Router();

// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.get("/api/products", getProducts);
router.get("/api/prices", getPrices);
router.get("/api/official-products", getOfficialProducts);
router.get("/api/cheapest/:product", getCheapest);
router.get("/api/check-price/:product/:price", checkPrice);

module.exports = router;
