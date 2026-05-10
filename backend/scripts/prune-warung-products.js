const db = require("../db");

const REMOVE_CATEGORIES = ["Babyvoeding"];

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
  const products = await query(
    "SELECT product_id, product_name, category FROM products WHERE category IN (?)",
    [REMOVE_CATEGORIES]
  );

  if (!products.length) {
    console.log("No non-warung products found.");
    db.end();
    return;
  }

  const productIds = products.map((product) => product.product_id);
  const variants = await query(
    "SELECT variant_id FROM product_variants WHERE product_id IN (?)",
    [productIds]
  );
  const variantIds = variants.map((variant) => variant.variant_id);

  if (variantIds.length) {
    await query("DELETE FROM prices WHERE variant_id IN (?)", [variantIds]);
    await query("DELETE FROM product_variants WHERE variant_id IN (?)", [variantIds]);
  }

  await query("DELETE FROM products WHERE product_id IN (?)", [productIds]);

  await query(`
    DELETE s
    FROM stores s
    LEFT JOIN prices pr ON s.store_id = pr.store_id
    WHERE pr.price_id IS NULL
      AND s.location = 'Publieke productenlijst'
  `);

  console.log(`Removed ${products.length} non-warung products.`);
  products.forEach((product) => {
    console.log(`- ${product.product_name} (${product.category})`);
  });

  db.end();
}

main().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
