const express = require("express");
const { createBegrotingRecord, createList, getLists } = require("../controllers/list-controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// Database .query("SELECT ...") calls are implemented in controllers/data modules so route files stay readable.
router.get("/api/shopping-lists", requireAuth, getLists);
router.post("/api/shopping-lists", requireAuth, createList);
router.post("/api/begroting-lijst", requireAuth, createBegrotingRecord);

module.exports = router;
