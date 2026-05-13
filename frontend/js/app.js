import { initializeLayout } from "./layout.js";
import { bindLogoutButton } from "./auth.js";
import { checkHealth } from "./health.js";
import { initAdminPage } from "./admin.js";
import { initBudgetPage } from "./budget.js";
import { initDashboardPage } from "./dashboard.js";
import { initLoginPage } from "./login.js";
import { initProductsPage } from "./products.js";
import { initScannerPage } from "./scanner.js";

const pageInitializers = {
  admin: initAdminPage,
  budget: initBudgetPage,
  dashboard: initDashboardPage,
  login: initLoginPage,
  products: initProductsPage,
  scanner: initScannerPage,
};

document.addEventListener("DOMContentLoaded", initPage);

async function initPage() {
  initializeLayout();
  bindLogoutButton(document.getElementById("navLogoutButton"));
  checkHealth();

  const page = document.body.dataset.page || "dashboard";
  const initCurrentPage = pageInitializers[page];

  if (initCurrentPage) {
    await initCurrentPage();
  }
}
