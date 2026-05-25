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
    screenshot: typeof body.screenshot === "string" ? body.screenshot : null,
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