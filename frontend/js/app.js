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

function showAdminDashboard(role) {
  const section = document.getElementById("adminFeedbackSection");
  if (role === "admin") {
    section.classList.remove("is-hidden");
    loadFeedback();
  } else {
    section.classList.add("is-hidden");
  }
}



async function loadFeedback() {
  try {
    const res = await fetch("/api/admin/feedback", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    const feedbackList = await res.json();

    const tbody = document.querySelector("#feedbackTable tbody");
    tbody.innerHTML = "";

    feedbackList.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.username}</td>
        <td>${item.message}</td>
        <td>${new Date(item.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading feedback:", err);
  }
}

