const express = require("express");
const { createList, createPurchase, getLists } = require("../controllers/list-controller");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/api/shopping-lists", requireAuth, getLists);
router.post("/api/shopping-lists", requireAuth, createList);
router.post("/api/purchases", requireAuth, createPurchase);

module.exports = router;
