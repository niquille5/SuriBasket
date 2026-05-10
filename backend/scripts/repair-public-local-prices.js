const db = require("../db");

const FOOD_CATEGORIES = [
  "Basisproducten",
  "Conserven",
  "Dranken",
  "Groente",
  "Olie",
  "Peulvruchten"
];

const PRICE_DATE = new Date().toISOString().slice(0, 10);
const PUBLIC_LOCATION = "Publieke productenlijst";

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results);
    });
  });
}

async function columnExists(tableName, columnName) {
  const rows = await query(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [tableName, columnName]
  );

  return rows[0].count > 0;
}

async function ensureColumn(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) {
    return;
  }

  await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureSchema() {
  await ensureColumn("product_variants", "package_label", "VARCHAR(120) NULL");
  await ensureColumn("prices", "source_type", "VARCHAR(50) NULL");
  await ensureColumn("prices", "source_row_number", "INT NULL");
  await ensureColumn("prices", "source_url", "VARCHAR(255) NULL");
}

function inferBrand(productName) {
  const match = productName.match(/merk\s+(.+)$/i);
  return match ? match[1].trim() : "Geen merk";
}

function inferSimpleUnit(packageLabel) {
  const text = String(packageLabel || "").toLowerCase();

  if (text.includes("per kg")) return "kg";
  if (text.includes("per liter") || text.includes("per fles")) return "fles";
  if (text.includes("per blik")) return "blik";
  if (text.includes("per pak")) return "pak";
  if (text.includes("per pot")) return "pot";

  return "stuk";
}

async function getOrCreateProduct(row) {
  const existing = await query(
    "SELECT product_id FROM products WHERE product_name = ? LIMIT 1",
    [row.product_name]
  );

  if (existing.length) {
    return existing[0].product_id;
  }

  const result = await query(
    "INSERT INTO products (product_name, category, brand, unit) VALUES (?, ?, ?, ?)",
    [row.product_name, row.category, inferBrand(row.product_name), row.retail_package]
  );

  return result.insertId;
}

async function getOrCreateVariant(productId, row) {
  const brand = inferBrand(row.product_name);
  const packageLabel = row.retail_package || "stuk";

  const existing = await query(
    `
      SELECT variant_id
      FROM product_variants
      WHERE product_id = ?
        AND COALESCE(brand, '') = ?
        AND COALESCE(package_label, '') = ?
      LIMIT 1
    `,
    [productId, brand, packageLabel]
  );

  if (existing.length) {
    await query(
      "UPDATE product_variants SET weight = ?, unit = ?, package_label = ? WHERE variant_id = ?",
      [1, inferSimpleUnit(packageLabel), packageLabel, existing[0].variant_id]
    );
    return existing[0].variant_id;
  }

  const result = await query(
    "INSERT INTO product_variants (product_id, brand, weight, unit, package_label) VALUES (?, ?, ?, ?, ?)",
    [productId, brand, 1, inferSimpleUnit(packageLabel), packageLabel]
  );

  return result.insertId;
}

async function getOrCreateStore(importerName) {
  const existing = await query(
    "SELECT store_id FROM stores WHERE store_name = ? AND COALESCE(location, '') = ? LIMIT 1",
    [importerName, PUBLIC_LOCATION]
  );

  if (existing.length) {
    return existing[0].store_id;
  }

  const result = await query(
    "INSERT INTO stores (store_name, location, phone) VALUES (?, ?, ?)",
    [importerName, PUBLIC_LOCATION, null]
  );

  return result.insertId;
}

async function main() {
  await ensureSchema();

  await query(`
    DELETE pr
    FROM prices pr
    JOIN stores s ON pr.store_id = s.store_id
    WHERE s.location = ?
  `, [PUBLIC_LOCATION]);

  const rows = await query(
    `
      SELECT
        opp.source_url,
        opp.source_row_number,
        opp.product_name,
        opp.category,
        i.importer_name,
        opp.retail_package,
        opp.retail_price
      FROM official_product_prices opp
      JOIN importers i ON opp.importer_id = i.importer_id
      WHERE opp.category IN (?)
        AND opp.retail_price IS NOT NULL
      ORDER BY opp.source_row_number ASC
    `,
    [FOOD_CATEGORIES]
  );

  let insertedPrices = 0;

  for (const row of rows) {
    const productId = await getOrCreateProduct(row);
    const variantId = await getOrCreateVariant(productId, row);
    const storeId = await getOrCreateStore(row.importer_name);

    await query(
      `
        INSERT INTO prices (
          variant_id,
          store_id,
          price,
          date_checked,
          source_type,
          source_row_number,
          source_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        variantId,
        storeId,
        row.retail_price,
        PRICE_DATE,
        "public_product_list",
        row.source_row_number,
        row.source_url
      ]
    );
    insertedPrices += 1;
  }

  console.log(`Repaired public list prices in local database.`);
  console.log(`Inserted exact retail prices: ${insertedPrices}`);

  db.end();
}

main().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
