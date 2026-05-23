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
  getShoppingLists,
  passwordMatches,
  savePurchases,
  saveShoppingList,
};
