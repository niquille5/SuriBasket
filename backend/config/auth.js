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

module.exports = {
  assertProductionConfig,
  getAdminCredentials,
  getJwtSecret
};
