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

function cleanBegrotingRecordItems(items) {
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

function parseProductLabel(label) {
  const parts = String(label || "").split(" | ");

  return {
    productName: (parts[0] || "").trim(),
    packageText: parts.length > 1 ? parts.slice(1).join(" | ").trim() : null
  };
}

module.exports = {
  cleanBudgetItems,
  cleanBegrotingRecordItems,
  cleanFeedback,
  cleanRole,
  isValidPassword,
  isValidUsername,
  parseProductLabel
};
