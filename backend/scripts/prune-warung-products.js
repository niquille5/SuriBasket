const db = require("../db");

const KEEP_CATEGORIES = [
  "Basisproducten",
  "Conserven",
  "Dranken",
  "Groente",
  "Olie",
  "Peulvruchten",
  "Specerij",
  "Vlees",
  "Voeding",
  "Zuivel"
];

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

async function main() {
  await query("START TRANSACTION");

  try {
    const officialRows = await query(
      `
        SELECT official_price_id, product_name, category
        FROM official_product_prices
        WHERE category NOT IN (?)
           OR category IS NULL
      `,
      [KEEP_CATEGORIES]
    );

    const publicProducts = await query(
      `
        SELECT DISTINCT p.product_id, p.product_name, p.category
        FROM products p
        JOIN product_variants pv ON p.product_id = pv.product_id
        JOIN prices pr ON pv.variant_id = pr.variant_id
        JOIN stores s ON pr.store_id = s.store_id
        WHERE s.location = ?
          AND (p.category NOT IN (?) OR p.category IS NULL)
      `,
      [PUBLIC_LOCATION, KEEP_CATEGORIES]
    );

    await query(
      `
        DELETE pr
        FROM prices pr
        JOIN product_variants pv ON pr.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
        JOIN stores s ON pr.store_id = s.store_id
        WHERE s.location = ?
          AND (p.category NOT IN (?) OR p.category IS NULL)
      `,
      [PUBLIC_LOCATION, KEEP_CATEGORIES]
    );

    await query(`
      DELETE pv
      FROM product_variants pv
      LEFT JOIN prices pr ON pv.variant_id = pr.variant_id
      WHERE pr.price_id IS NULL
    `);

    await query(`
      DELETE p
      FROM products p
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id
      WHERE pv.variant_id IS NULL
    `);

    await query(
      `
        DELETE FROM official_product_prices
        WHERE category NOT IN (?)
           OR category IS NULL
      `,
      [KEEP_CATEGORIES]
    );

    await query(`
      DELETE s
      FROM stores s
      LEFT JOIN prices pr ON s.store_id = pr.store_id
      WHERE pr.price_id IS NULL
        AND s.location = ?
    `, [PUBLIC_LOCATION]);

    await query(`
      DELETE i
      FROM importers i
      LEFT JOIN official_product_prices opp ON i.importer_id = opp.importer_id
      WHERE opp.official_price_id IS NULL
    `);

    await query("COMMIT");

    console.log(`Removed ${officialRows.length} non-warung official product rows.`);
    console.log(`Removed ${publicProducts.length} matching local public products.`);
    publicProducts.forEach((product) => {
      console.log(`- ${product.product_name} (${product.category || "Geen categorie"})`);
    });
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  } finally {
    db.end();
  }
}

main().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
