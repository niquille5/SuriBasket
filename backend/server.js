const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { query } = require("./db-query");

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
  "/over.html": "over.html",
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
  "/api/login",
  "/api/me",
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
    await query("SELECT 1 AS ok");
    res.json({ status: "ok", database: "online" });
  } catch (err) {
    res.status(500).json({ status: "error", database: "offline" });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const { adminUsername, adminPassword } = getAdminCredentials();

  if (username !== adminUsername || password !== adminPassword) {
    res.status(401).json({ message: "Ongeldige gebruikersnaam of wachtwoord" });
    return;
  }

  const token = jwt.sign(
    { username: adminUsername, role: "admin" },
    getJwtSecret(),
    { expiresIn: "2h" }
  );

  res.json({
    token,
    user: {
      username: adminUsername,
      role: "admin"
    }
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
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
  const productName = req.params.product;
  const userPrice = parseFloat(req.params.price);

  if (!productName || Number.isNaN(userPrice) || userPrice <= 0) {
    res.status(400).json({ message: "Valid product and price are required" });
    return;
  }

  try {
    const [result] = await query(
      `
        SELECT ROUND(
          AVG(
            CASE
              WHEN pv.weight IS NOT NULL AND pv.weight > 0 THEN pr.price / pv.weight
              ELSE pr.price
            END
          ),
          2
        ) AS avg_price_per_unit
        FROM prices pr
        JOIN product_variants pv ON pr.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
        WHERE p.product_name = ?
      `,
      [productName]
    );

    const avgPrice = result.avg_price_per_unit;

    if (!avgPrice) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json({
      product: productName,
      your_price: userPrice,
      average_price_per_unit: avgPrice,
      verdict: getPriceVerdict(userPrice, avgPrice)
    });
  } catch (err) {
    sendDatabaseError(res);
  }
});

function getPriceVerdict(userPrice, avgPrice) {
  if (userPrice < avgPrice) return "Goedkoop";
  if (userPrice > avgPrice) return "Duur";
  return "Gemiddeld";
}

function sendDatabaseError(res) {
  res.status(500).json({ error: "Database error" });
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
