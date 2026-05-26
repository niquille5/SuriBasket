const { query } = require("../config/db-query");
const { sendDatabaseError, sendOk } = require("../utils/api-response");
const { withTimeout } = require("../utils/timeout");

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

function getApiIndex(req, res) {
  sendOk(res, {
    name: "Suri Basket API",
    status: "running",
    endpoints: apiEndpoints
  });
}

function getFavicon(req, res) {
  res.status(204).end();
}

async function getHealth(req, res) {
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
      sendOk(res, {
        status: "error",
        database: "offline",
        reason: hasRequiredTables ? "Database has no app data" : "Database schema is incomplete"
      });
      return;
    }

    sendOk(res, {
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
    sendOk(res, { status: "error", database: "offline" });
  }
}

async function getSummary(req, res) {
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
      sendOk(res, {
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

    sendOk(res, {
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
}

module.exports = {
  getApiIndex,
  getFavicon,
  getHealth,
  getSummary
};
