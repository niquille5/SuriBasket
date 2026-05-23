const bcrypt = require("bcrypt");
const { query } = require("./db-query");

const passwordRounds = 10;

async function ensureUserTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS favorites (
      favorites_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (product_id) REFERENCES products(product_id),
      UNIQUE KEY unique_user_product (user_id, product_id)
    )
  `);
  await ensureFavoriteUniqueIndex();

  await query(`
    CREATE TABLE IF NOT EXISTS purchases (
      purchase_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      official_price_id INT,
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price) STORED,
      purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      payment_method ENUM('cash', 'card', 'transfer') DEFAULT 'cash',
      status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (product_id) REFERENCES products(product_id),
      FOREIGN KEY (official_price_id) REFERENCES official_product_prices(official_price_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shopping_lists (
      list_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      list_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shopping_list_items (
      item_id INT AUTO_INCREMENT PRIMARY KEY,
      list_id INT NOT NULL,
      product_name VARCHAR(150) NOT NULL,
      category VARCHAR(100),
      unit VARCHAR(100),
      store_name VARCHAR(150),
      quantity INT NOT NULL,
      estimated_price DECIMAL(10,2),
      FOREIGN KEY (list_id) REFERENCES shopping_lists(list_id)
    )
  `);

  await ensureShoppingListItemColumns();
}

async function ensureFavoriteUniqueIndex() {
  const [indexInfo] = await query(`
    SELECT COUNT(*) AS index_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'favorites'
      AND index_name = 'unique_user_product'
  `);

  if (indexInfo.index_exists) {
    return;
  }

  await query(`
    DELETE f1
    FROM favorites f1
    JOIN favorites f2
      ON f1.user_id = f2.user_id
      AND f1.product_id = f2.product_id
      AND f1.favorites_id > f2.favorites_id
  `);

  await query(`
    ALTER TABLE favorites
    ADD UNIQUE KEY unique_user_product (user_id, product_id)
  `);
}

async function createUser(username, password, role = "user") {
  const passwordHash = await bcrypt.hash(password, passwordRounds);

  const result = await query(
    `
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?)
    `,
    [username, passwordHash, role],
  );

  return {
    user_id: result.insertId,
    username,
    role,
  };
}

async function findUserByUsername(username) {
  const rows = await query(
    `
      SELECT user_id, username, password_hash, role
      FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  );

  return rows[0] || null;
}

async function ensureAdminUser(adminUsername, adminPassword) {
  const existing = await findUserByUsername(adminUsername);
  if (existing) {
    const passwordOk = await passwordMatches(adminPassword, existing.password_hash);

    if (existing.role === "admin" && passwordOk) {
      return existing;
    }

    const passwordHash = await bcrypt.hash(adminPassword, passwordRounds);
    await query(
      `
        UPDATE users
        SET password_hash = ?, role = 'admin'
        WHERE user_id = ?
      `,
      [passwordHash, existing.user_id],
    );

    return findUserByUsername(adminUsername);
  }

  return createUser(adminUsername, adminPassword, "admin");
}

async function passwordMatches(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

async function saveShoppingList(userId, listName, items) {
  await query("START TRANSACTION");

  try {
    const listResult = await query(
      `
        INSERT INTO shopping_lists (user_id, list_name)
        VALUES (?, ?)
      `,
      [userId, listName || "Boodschappenlijst"],
    );

    for (const item of items) {
      await query(
        `
          INSERT INTO shopping_list_items
            (list_id, product_name, category, unit, store_name, quantity, estimated_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          listResult.insertId,
          item.product_name,
          item.category || null,
          item.unit || null,
          item.store_name || null,
          item.quantity,
          item.estimated_price,
        ],
      );
    }

    await query("COMMIT");
    return listResult.insertId;
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

async function getShoppingLists(userId) {
  const lists = await query(
    `
      SELECT list_id, list_name, created_at
      FROM shopping_lists
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    [userId],
  );

  if (!lists.length) {
    return [];
  }

  const listIds = lists.map((list) => list.list_id);
  const items = await query(
    `
      SELECT
        item_id,
        list_id,
        product_name,
        category,
        unit,
        store_name,
        quantity,
        estimated_price
      FROM shopping_list_items
      WHERE list_id IN (?)
      ORDER BY item_id ASC
    `,
    [listIds],
  );

  return lists.map((list) => ({
    ...list,
    items: items.filter((item) => item.list_id === list.list_id),
  }));
}

async function savePurchases(userId, items, paymentMethod = "cash") {
  await query("START TRANSACTION");

  try {
    for (const item of items) {
      const productId = await findProductId(item);

      await query(
        `
          INSERT INTO purchases
            (user_id, product_id, official_price_id, quantity, price, payment_method, status)
          VALUES (?, ?, ?, ?, ?, ?, 'completed')
        `,
        [
          userId,
          productId,
          item.official_price_id || null,
          item.quantity,
          item.price,
          paymentMethod,
        ],
      );
    }

    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

async function findProductId(item) {
  if (item.product_id) {
    return item.product_id;
  }
  const rows = await query(
    `
      SELECT product_id
      FROM products
      WHERE product_name = ?
      LIMIT 1
    `,
    [item.product_name],
  );
  if (!rows.length) {
    throw new Error("Product niet gevonden: " + item.product_name);
  }
  return rows[0].product_id;
}
async function getFavorites(userId) {
  return query(
    `
      SELECT
        f.favorites_id,
        f.product_id,
        p.product_name,
        p.category,
        pv.variant_id,
        pv.brand,
        pv.unit,
        pv.weight,
        COALESCE(pv.package_label, opp.retail_package) AS package_label,
        COALESCE(pr.price, opp.retail_price, 0) AS price,
        COALESCE(s.store_name, i.importer_name, 'Publieke productenlijst') AS store_name
      FROM favorites f
      JOIN products p ON f.product_id = p.product_id
      LEFT JOIN product_variants pv ON pv.variant_id = (
        SELECT pv2.variant_id
        FROM product_variants pv2
        LEFT JOIN prices pr2 ON pr2.variant_id = pv2.variant_id
        WHERE pv2.product_id = p.product_id
        ORDER BY pr2.price ASC, pv2.variant_id ASC
        LIMIT 1
      )
      LEFT JOIN prices pr ON pr.price_id = (
        SELECT pr3.price_id
        FROM prices pr3
        WHERE pr3.variant_id = pv.variant_id
        ORDER BY pr3.price ASC, pr3.date_checked DESC, pr3.price_id ASC
        LIMIT 1
      )
      LEFT JOIN stores s ON pr.store_id = s.store_id
      LEFT JOIN official_product_prices opp ON opp.official_price_id = (
        SELECT opp2.official_price_id
        FROM official_product_prices opp2
        WHERE opp2.product_name = p.product_name
        ORDER BY opp2.retail_price ASC, opp2.official_price_id ASC
        LIMIT 1
      )
      LEFT JOIN importers i ON opp.importer_id = i.importer_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `,
    [userId],
  );
}
async function addFavorite(userId, favorite) {
  const productId = await getFavoriteProductId(favorite);

  await query(
    `
      INSERT IGNORE INTO favorites (user_id, product_id)
      VALUES (?, ?)
    `,
    [userId, productId],
  );

  return productId;
}
async function removeFavorite(userId, favorite) {
  const productId = await getFavoriteProductId(favorite, { create: false });
  if (!productId) {
    return;
  }

  await query(
    `
      DELETE FROM favorites
      WHERE user_id = ? AND product_id = ?
    `,
    [userId, productId],
  );
}
async function isFavorited(userId, productId) {
  const rows = await query(
    `
      SELECT favorites_id
      FROM favorites
      WHERE user_id = ? AND product_id = ?
      LIMIT 1
    `,
    [userId, productId],
  );
  return rows.length > 0;
}

async function getFavoriteProductId(favorite, options = { create: true }) {
  if (typeof favorite === "number" || typeof favorite === "string") {
    return Number(favorite) || null;
  }

  const productId = Number(favorite && favorite.product_id);
  if (productId) {
    return productId;
  }

  const productName = String((favorite && favorite.product_name) || "")
    .trim()
    .slice(0, 100);

  if (!productName) {
    return null;
  }

  const existing = await query(
    `
      SELECT product_id
      FROM products
      WHERE product_name = ?
      ORDER BY product_id ASC
      LIMIT 1
    `,
    [productName],
  );

  if (existing.length || !options.create) {
    return existing[0] ? existing[0].product_id : null;
  }

  const category = String((favorite && favorite.category) || "Algemeen")
    .trim()
    .slice(0, 50);

  const result = await query(
    `
      INSERT INTO products (product_name, category)
      VALUES (?, ?)
    `,
    [productName, category || "Algemeen"],
  );

  return result.insertId;
}

async function ensureShoppingListItemColumns() {
  const columns = await query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'shopping_list_items'
        AND column_name IN ('category', 'unit', 'store_name')
    `,
  );
  const existingColumns = new Set(
    columns.map((column) => column.column_name || column.COLUMN_NAME),
  );

  if (!existingColumns.has("category")) {
    await query("ALTER TABLE shopping_list_items ADD COLUMN category VARCHAR(100)");
  }

  if (!existingColumns.has("unit")) {
    await query("ALTER TABLE shopping_list_items ADD COLUMN unit VARCHAR(100)");
  }

  if (!existingColumns.has("store_name")) {
    await query(
      "ALTER TABLE shopping_list_items ADD COLUMN store_name VARCHAR(150)",
    );
  }
}

module.exports = {
  createUser,
  ensureAdminUser,
  ensureUserTables,
  findUserByUsername,
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorited,
  getShoppingLists,
  passwordMatches,
  savePurchases,
  saveShoppingList,
};
