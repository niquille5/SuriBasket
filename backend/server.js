const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { query } = require("./db-query");
const {
  createUser,
  ensureAdminUser,
  ensureUserTables,
  findUserByUsername,
  getUsers,
  updateUser,
  deleteUser,
  getShoppingLists,
  passwordMatches,
  savePurchases,
  saveShoppingList,
  getFavorites,
  getPriceAlerts,
  addFavorite,
  savePriceAlert,
  removeFavorite,
  removePriceAlert,
  isFavorited
} = require("./user-data");
const {
  getFeedbackStats,
  getRecentFeedback,
  saveFeedback,
  deleteFeedback,
  updateFeedbackStatus
} = require("./feedback-data");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const frontendDir = path.resolve(__dirname, "../frontend");

assertProductionConfig();

const pages = {
  "/": "login.html",
  "/index.html": "index.html",
  "/producten.html": "producten.html",
  "/scanner.html": "scanner.html",
  "/begroting.html": "begroting.html",
  "/feedback.html": "feedback.html",
  "/login.html": "login.html",
  "/admin.html": "admin.html"
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(file, { root: frontendDir });
  });
});

app.use(express.static(frontendDir));

const apiEndpoints = [
  "/api/health",
  "/api/summary",
  "/api/products",
  "/api/prices",
  "/api/official-products",
  "/api/cheapest/:product",
  "/api/check-price/:product/:price",
  "/api/register",
  "/api/login",
  "/api/me",
  "/api/shopping-lists",
  "/api/purchases",
  "/api/favorites",
  "/api/favorites/:user_id",
  "/api/favorites/add",
  "/api/favorites/remove",
  "/api/favorites/check/:product_id",
  "/api/feedback",
  "/api/feedback/stats",
  "/api/admin/feedback",
  "/api/admin/feedback/:id",
  "/api/admin/users",
  "/api/admin/users/:id",
  "/api/price-alerts",
  "/api/price-alerts/triggered",
  "/api/admin/overview"
];

app.get("/api", (req, res) => {
  res.json({
    name: "Suri Basket API",
    status: "running",
    endpoints: apiEndpoints
  });
});

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.get("/api/health", async (req, res) => {
  try {
    const [health] = await withTimeout(
      query(`
        SELECT
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'products') AS products_table_exists,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'product_variants') AS variants_table_exists,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'stores') AS stores_table_exists,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'prices') AS prices_table_exists,
          (SELECT COUNT(*) FROM products) AS products,
          (SELECT COUNT(*) FROM product_variants) AS variants,
          (SELECT COUNT(*) FROM stores) AS stores,
          (SELECT COUNT(*) FROM prices) AS prices
      `),
      3000
    );
    const hasRequiredTables =
      health.products_table_exists &&
      health.variants_table_exists &&
      health.stores_table_exists &&
      health.prices_table_exists;
    const hasAppData =
      health.products > 0 &&
      health.variants > 0 &&
      health.stores > 0 &&
      health.prices > 0;

    if (!hasRequiredTables || !hasAppData) {
      res.json({
        status: "error",
        database: "offline",
        reason: hasRequiredTables ? "Database has no app data" : "Database schema is incomplete"
      });
      return;
    }

    res.json({
      status: "ok",
      database: "online",
      counts: {
        products: health.products,
        variants: health.variants,
        stores: health.stores,
        prices: health.prices
      }
    });
  } catch (err) {
    res.json({ status: "error", database: "offline" });
  }
});

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = String(username || "").trim();

  if (!isValidUsername(cleanUsername) || !isValidPassword(password)) {
    res.status(400).json({
      message: "Gebruik minimaal 3 tekens voor naam en 6 tekens voor wachtwoord"
    });
    return;
  }

  try {
    await ensureUserTables();
    const user = await createUser(cleanUsername, password);
    res.status(201).json(createLoginResponse(user));
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "Deze gebruikersnaam bestaat al" });
      return;
    }

    sendDatabaseError(res);
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername || !password) {
    res.status(400).json({ message: "Vul gebruikersnaam en wachtwoord in" });
    return;
  }

  try {
    await ensureUserTables();

    const { adminUsername, adminPassword } = getAdminCredentials();
    await ensureAdminUser(adminUsername, adminPassword);

    const user = await findUserByUsername(cleanUsername);
    const canLogin = user && (await passwordMatches(password, user.password_hash));

    if (!canLogin) {
      res.status(401).json({ message: "Ongeldige gebruikersnaam of wachtwoord" });
      return;
    }

    res.json(createLoginResponse(user));
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/shopping-lists", requireAuth, async (req, res) => {
  try {
    await ensureUserTables();
    const lists = await getShoppingLists(req.user.user_id);
    res.json(lists);
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.post("/api/shopping-lists", requireAuth, async (req, res) => {
  const items = cleanBudgetItems(req.body.items);

  if (!items.length) {
    res.status(400).json({ message: "Voeg eerst producten toe aan je lijst" });
    return;
  }

  try {
    await ensureUserTables();
    const listId = await saveShoppingList(req.user.user_id, req.body.list_name, items);
    res.status(201).json({ list_id: listId, message: "Lijst opgeslagen" });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.post("/api/purchases", requireAuth, async (req, res) => {
  const items = cleanPurchaseItems(req.body.items);

  if (!items.length) {
    res.status(400).json({ message: "Voeg eerst producten toe aan je inkoop" });
    return;
  }

  try {
    await ensureUserTables();
    await savePurchases(req.user.user_id, items, req.body.payment_method);
    res.status(201).json({ message: "Inkoop opgeslagen" });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.post("/api/feedback", async (req, res) => {
  const feedback = cleanFeedback(req.body, req);

  if (!feedback) {
    res.status(400).json({
      success: false,
      message: "Vul een geldige beoordeling, e-mail en bericht in"
    });
    return;
  }

  try {
    const feedbackId = await saveFeedback(feedback);
    res.status(201).json({
      success: true,
      feedback_id: feedbackId,
      message: "Feedback opgeslagen"
    });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/feedback/stats", async (req, res) => {
  try {
    const data = await getFeedbackStats();
    res.json({ success: true, ...data });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/summary", async (req, res) => {
  try {
    const [summary] = await query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM product_variants) AS variants,
        (SELECT COUNT(*) FROM stores) AS stores,
        (SELECT COUNT(*) FROM prices) AS prices,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'importers') AS importers_table_exists,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'official_product_prices') AS official_table_exists
    `);

    if (!summary.importers_table_exists || !summary.official_table_exists) {
      res.json({
        products: summary.products,
        variants: summary.variants,
        stores: summary.stores,
        prices: summary.prices,
        importers: 0,
        official_products: 0
      });
      return;
    }

    const [officialCounts] = await query(`
      SELECT
        (SELECT COUNT(*) FROM importers) AS importers,
        (SELECT COUNT(*) FROM official_product_prices) AS official_products
    `);

    res.json({
      products: summary.products,
      variants: summary.variants,
      stores: summary.stores,
      prices: summary.prices,
      importers: officialCounts.importers,
      official_products: officialCounts.official_products
    });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/admin/overview", requireRole("admin"), async (req, res) => {
  try {
    const [summary] = await query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM product_variants) AS variants,
        (SELECT COUNT(*) FROM stores) AS stores,
        (SELECT COUNT(*) FROM prices) AS prices
    `);

    res.json({
      message: "Admin toegang actief",
      role: req.user.role,
      summary
    });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/admin/feedback", requireRole("admin"), async (req, res) => {
  try {
    const feedback = await getRecentFeedback(12);
    res.json({ feedback });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.patch("/api/admin/feedback/:id", requireRole("admin"), async (req, res) => {
  const feedbackId = Number(req.params.id);

  if (!feedbackId) {
    res.status(400).json({ message: "Ongeldig feedbacknummer" });
    return;
  }

  try {
    await updateFeedbackStatus(feedbackId, {
      ...req.body,
      responded_by: req.user.username
    });
    res.json({ message: "Feedback bijgewerkt" });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.delete("/api/admin/feedback/:id", requireRole("admin"), async (req, res) => {
  const feedbackId = Number(req.params.id);

  if (!feedbackId) {
    res.status(400).json({ message: "Ongeldig feedbacknummer" });
    return;
  }

  try {
    await deleteFeedback(feedbackId);
    res.json({ message: "Feedback verwijderd" });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/admin/users", requireRole("admin"), async (req, res) => {
  try {
    const users = await getUsers();
    res.json({ users });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.post("/api/admin/users", requireRole("admin"), async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const role = cleanRole(req.body.role);

  if (!isValidUsername(username) || !isValidPassword(password) || !role) {
    res.status(400).json({
      message: "Gebruik minimaal 3 tekens voor naam, 6 voor wachtwoord en een geldige rol"
    });
    return;
  }

  try {
    const user = await createUser(username, password, role);
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "Deze gebruikersnaam bestaat al" });
      return;
    }

    sendDatabaseError(res);
  }
});

app.patch("/api/admin/users/:id", requireRole("admin"), async (req, res) => {
  const userId = Number(req.params.id);
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const role = cleanRole(req.body.role);

  if (!userId || !isValidUsername(username) || !role) {
    res.status(400).json({ message: "Ongeldige gebruiker of rol" });
    return;
  }

  if (password && !isValidPassword(password)) {
    res.status(400).json({ message: "Nieuw wachtwoord moet minimaal 6 tekens zijn" });
    return;
  }

  if (userId === Number(req.user.user_id) && role !== "admin") {
    res.status(400).json({ message: "Je kunt je eigen adminrol niet verwijderen" });
    return;
  }

  try {
    await updateUser(userId, {
      username,
      role,
      password: password || null
    });
    res.json({ message: "Gebruiker bijgewerkt" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(409).json({ message: "Deze gebruikersnaam bestaat al" });
      return;
    }

    sendDatabaseError(res);
  }
});

app.delete("/api/admin/users/:id", requireRole("admin"), async (req, res) => {
  const userId = Number(req.params.id);

  if (!userId) {
    res.status(400).json({ message: "Ongeldige gebruiker" });
    return;
  }

  if (userId === Number(req.user.user_id)) {
    res.status(400).json({ message: "Je kunt je eigen admin-account niet verwijderen" });
    return;
  }

  try {
    await deleteUser(userId);
    res.json({ message: "Gebruiker verwijderd" });
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const results = await query(`
      SELECT
        p.product_id,
        p.product_name,
        p.category,
        pv.variant_id,
        pv.brand,
        pv.weight,
        pv.unit,
        pv.package_label
      FROM products p
      JOIN product_variants pv ON p.product_id = pv.product_id
      ORDER BY p.product_name ASC, pv.brand ASC
    `);

    res.json(results);
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/prices", async (req, res) => {
  try {
    const results = await query(`
      SELECT
        p.product_id,
        pv.variant_id,
        p.product_name,
        p.category,
        pv.brand,
        pv.weight,
        pv.unit,
        pv.package_label,
        s.store_name,
        s.location,
        pr.price,
        pr.date_checked,
        pr.source_type,
        pr.source_row_number,
        pr.source_url
      FROM prices pr
      JOIN product_variants pv ON pr.variant_id = pv.variant_id
      JOIN products p ON pv.product_id = p.product_id
      JOIN stores s ON pr.store_id = s.store_id
      ORDER BY pr.date_checked DESC, p.product_name ASC
    `);

    res.json(results);
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/official-products", async (req, res) => {
  try {
    const [{ official_table_exists: officialTableExists, importers_table_exists: importersTableExists }] = await query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'official_product_prices') AS official_table_exists,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'importers') AS importers_table_exists
    `);

    if (!officialTableExists || !importersTableExists) {
      res.json([]);
      return;
    }

    const results = await query(`
      SELECT
        opp.official_price_id,
        opp.source_name,
        opp.source_url,
        opp.source_row_number,
        (
          SELECT p2.product_id
          FROM products p2
          WHERE p2.product_name = opp.product_name
          ORDER BY p2.product_id ASC
          LIMIT 1
        ) AS product_id,
        opp.product_name,
        opp.category,
        i.importer_name,
        opp.wholesale_package,
        opp.wholesale_price,
        opp.retail_package,
        opp.retail_price,
        opp.imported_at
      FROM official_product_prices opp
      JOIN importers i ON opp.importer_id = i.importer_id
      ORDER BY opp.source_row_number ASC
    `);

    res.json(results);
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/cheapest/:product", async (req, res) => {
  try {
    const results = await query(
      `
        SELECT
          p.product_name,
          p.category,
          pv.brand,
          pv.weight,
          pv.unit,
          pv.package_label,
          s.store_name,
          s.location,
          pr.price,
          ROUND(
            CASE
              WHEN pv.weight IS NOT NULL AND pv.weight > 0 THEN pr.price / pv.weight
              ELSE pr.price
            END,
            2
          ) AS price_per_unit
        FROM prices pr
        JOIN product_variants pv ON pr.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
        JOIN stores s ON pr.store_id = s.store_id
        WHERE p.product_name = ?
        ORDER BY price_per_unit ASC
        LIMIT 1
      `,
      [req.params.product]
    );

    if (!results.length) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(results[0]);
  } catch (err) {
    sendDatabaseError(res);
  }
});

app.get("/api/check-price/:product/:price", async (req, res) => {
  const productLabel = req.params.product;
  const { productName, packageText } = parseProductLabel(productLabel);
  const userPrice = parseFloat(req.params.price);

  if (!productName || Number.isNaN(userPrice) || userPrice <= 0) {
    res.status(400).json({ message: "Valid product and price are required" });
    return;
  }

  try {
    const [result] = await query(
      `
        SELECT ROUND(AVG(pr.price), 2) AS avg_price_per_unit
        FROM prices pr
        JOIN product_variants pv ON pr.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
        WHERE p.product_name = ?
          AND (
            ? IS NULL
            OR COALESCE(pv.package_label, CONCAT(CAST(pv.weight AS DECIMAL(10,2)), ' ', pv.unit), 'stuk') = ?
          )
      `,
      [productName, packageText, packageText]
    );

    const avgPrice = result.avg_price_per_unit;

    if (!avgPrice) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json({
      product: packageText ? productName + " | " + packageText : productName,
      your_price: userPrice,
      average_price_per_unit: avgPrice,
      verdict: getPriceVerdict(userPrice, avgPrice)
    });
  } catch (err) {
    sendDatabaseError(res);
  }
});

// Get favorites for authenticated user
app.get("/api/favorites", requireAuth, async (req, res) => {
  try {
    const favorites = await getFavorites(req.user.user_id);
    res.json(favorites);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    sendDatabaseError(res);
  }
});

// Get favorites for a specific user (for logged-in user)
app.get("/api/favorites/:user_id", requireAuth, async (req, res) => {
  // Only allow users to view their own favorites
  if (req.user.user_id !== parseInt(req.params.user_id) && req.user.role !== "admin") {
    res.status(403).json({ message: "Geen toegang tot deze favorieten" });
    return;
  }
  try {
    const favorites = await getFavorites(req.params.user_id);
    res.json(favorites);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    sendDatabaseError(res);
  }
});

// Add favorite
app.post("/api/favorites/add", requireAuth, async (req, res) => {
  const { product_id, product_name, category } = req.body;
  if (!product_id && !product_name) {
    res.status(400).json({ message: "product_id of productnaam is vereist" });
    return;
  }
  try {
    const favoriteProductId = await addFavorite(req.user.user_id, {
      product_id,
      product_name,
      category
    });
    res.status(201).json({
      message: "Favoriet toegevoegd!",
      product_id: favoriteProductId
    });
  } catch (err) {
    console.error("Error adding favorite:", err);
    sendDatabaseError(res);
  }
});

// Remove favorite
app.delete("/api/favorites/remove", requireAuth, async (req, res) => {
  const { product_id, product_name } = req.body;
  if (!product_id && !product_name) {
    res.status(400).json({ message: "product_id of productnaam is vereist" });
    return;
  }
  try {
    await removeFavorite(req.user.user_id, { product_id, product_name });
    res.json({ message: "Favoriet verwijderd!" });
  } catch (err) {
    console.error("Error removing favorite:", err);
    sendDatabaseError(res);
  }
});

// Check if product is favorited
app.get("/api/favorites/check/:product_id", requireAuth, async (req, res) => {
  try {
    const favorited = await isFavorited(req.user.user_id, req.params.product_id);
    res.json({ favorited });
  } catch (err) {
    console.error("Error checking favorite:", err);
    sendDatabaseError(res);
  }
});

app.get("/api/price-alerts", requireAuth, async (req, res) => {
  try {
    const alerts = await getPriceAlerts(req.user.user_id);
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching price alerts:", err);
    sendDatabaseError(res);
  }
});

app.get("/api/price-alerts/triggered", requireAuth, async (req, res) => {
  try {
    const alerts = await getPriceAlerts(req.user.user_id, {
      triggeredOnly: true
    });
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching triggered price alerts:", err);
    sendDatabaseError(res);
  }
});

app.post("/api/price-alerts", requireAuth, async (req, res) => {
  const targetPrice = Number(req.body.target_price);

  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    res.status(400).json({ message: "Vul een geldige doelprijs in" });
    return;
  }

  try {
    const alert = await savePriceAlert(req.user.user_id, {
      product_id: req.body.product_id,
      product_name: req.body.product_name,
      category: req.body.category,
      variant_id: req.body.variant_id,
      target_price: targetPrice
    });
    res.status(201).json(alert);
  } catch (err) {
    console.error("Error saving price alert:", err);
    res.status(400).json({ message: "Prijsalert kon niet worden opgeslagen" });
  }
});

app.delete("/api/price-alerts/:alert_id", requireAuth, async (req, res) => {
  const alertId = Number(req.params.alert_id);

  if (!alertId) {
    res.status(400).json({ message: "Ongeldige prijsalert" });
    return;
  }

  try {
    await removePriceAlert(req.user.user_id, alertId);
    res.json({ message: "Prijsalert verwijderd" });
  } catch (err) {
    console.error("Error removing price alert:", err);
    sendDatabaseError(res);
  }
});



function parseProductLabel(label) {
  const parts = String(label || "").split(" | ");

  return {
    productName: (parts[0] || "").trim(),
    packageText: parts.length > 1 ? parts.slice(1).join(" | ").trim() : null
  };
}

function getPriceVerdict(userPrice, avgPrice) {
  if (userPrice < avgPrice) return "Goedkoop";
  if (userPrice > avgPrice) return "Duur";
  return "Gemiddeld";
}

function createLoginResponse(user) {
  const safeUser = {
    user_id: user.user_id,
    username: user.username,
    role: user.role
  };

  return {
    token: jwt.sign(safeUser, getJwtSecret(), { expiresIn: "2h" }),
    user: safeUser
  };
}

function isValidUsername(username) {
  return username.length >= 3 && username.length <= 100;
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6;
}

function cleanRole(role) {
  const clean = String(role || "").trim();
  return ["user", "admin"].includes(clean) ? clean : null;
}

function cleanBudgetItems(items) {
  return cleanItems(items).map((item) => ({
    product_name: item.product_name,
    category: item.category,
    unit: item.unit,
    store_name: item.store_name,
    quantity: item.quantity,
    estimated_price: item.price
  }));
}

function cleanPurchaseItems(items) {
  return cleanItems(items).map((item) => ({
    product_id: item.product_id || null,
    official_price_id: item.official_price_id || null,
    product_name: item.product_name,
    quantity: item.quantity,
    price: item.price
  }));
}

function cleanFeedback(body, req) {
  const rating = Number(body.rating);
  const email = String(body.email || "").trim().slice(0, 255);
  const message = String(body.message || "").trim().slice(0, 5000);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  if (!isEmail(email) || !message) {
    return null;
  }

  return {
    name: String(body.name || "").trim().slice(0, 120),
    email,
    rating,
    message,
    page: String(body.page || "").trim().slice(0, 120),
    issueType: String(body.issueType || "").trim().slice(0, 80),
    browserInfo: String(body.browserInfo || "").slice(0, 2000),
    referrer: String(body.referrer || "").slice(0, 1000),
    ipAddress: req.ip || null,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 2000)
  };
}

function cleanItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      product_id: Number(item.product_id) || null,
      official_price_id: Number(item.official_price_id) || null,
      product_name: String(item.product_name || "").trim(),
      category: String(item.category || "").trim(),
      unit: String(item.unit || "").trim(),
      store_name: String(item.store_name || "").trim(),
      quantity: Math.max(1, Math.round(Number(item.quantity) || 0)),
      price: Number(item.price)
    }))
    .filter((item) => item.product_name && item.quantity > 0 && item.price >= 0);
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendDatabaseError(res) {
  res.status(500).json({ error: "Database error" });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
    })
  ]);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ message: "Login vereist" });
    return;
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch (err) {
    res.status(401).json({ message: "Ongeldige of verlopen sessie" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (req.user.role !== role) {
        res.status(403).json({ message: "Geen toegang voor deze rol" });
        return;
      }

      next();
    });
  };
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "change-this-local-secret";
}

function getAdminCredentials() {
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    return {
      adminUsername: process.env.ADMIN_USERNAME,
      adminPassword: process.env.ADMIN_PASSWORD
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required in production");
  }

  return {
    adminUsername: "admin",
    adminPassword: "admin123"
  };
}

function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const required = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "JWT_SECRET"];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
