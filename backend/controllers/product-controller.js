const { query } = require("../config/db-query");
const { sendBadRequest, sendDatabaseError, sendNotFound, sendOk } = require("../utils/api-response");
const { parseProductLabel } = require("../utils/validators");

async function getProducts(req, res) {
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

    sendOk(res, results);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getPrices(req, res) {
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

    sendOk(res, results);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getOfficialProducts(req, res) {
  try {
    const [{ official_table_exists: officialTableExists, importers_table_exists: importersTableExists }] = await query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'official_product_prices') AS official_table_exists,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'importers') AS importers_table_exists
    `);

    if (!officialTableExists || !importersTableExists) {
      sendOk(res, []);
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

    sendOk(res, results);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function getCheapest(req, res) {
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
      sendNotFound(res, "Product not found");
      return;
    }

    sendOk(res, results[0]);
  } catch (err) {
    sendDatabaseError(res);
  }
}

async function checkPrice(req, res) {
  const productLabel = req.params.product;
  const { productName, packageText } = parseProductLabel(productLabel);
  const userPrice = parseFloat(req.params.price);

  if (!productName || Number.isNaN(userPrice) || userPrice <= 0) {
    sendBadRequest(res, "Valid product and price are required");
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
      sendNotFound(res, "Product not found");
      return;
    }

    sendOk(res, {
      product: packageText ? productName + " | " + packageText : productName,
      your_price: userPrice,
      average_price_per_unit: avgPrice,
      verdict: getPriceVerdict(userPrice, avgPrice)
    });
  } catch (err) {
    sendDatabaseError(res);
  }
}

function getPriceVerdict(userPrice, avgPrice) {
  if (userPrice < avgPrice) return "Goedkoop";
  if (userPrice > avgPrice) return "Duur";
  return "Gemiddeld";
}

module.exports = {
  checkPrice,
  getCheapest,
  getOfficialProducts,
  getPrices,
  getProducts
};
