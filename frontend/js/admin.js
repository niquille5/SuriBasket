import { bindLogoutButton, hasAuthToken } from "./auth.js";
import { fetchJsonWithAuth } from "./api.js";
import { escapeHtml } from "./dom.js";

export async function initAdminPage() {
  bindLogoutButton(document.getElementById("logoutButton"));
  await loadAdminOverview();
}

async function loadAdminOverview() {
  const status = document.getElementById("adminStatus");
  const overview = document.getElementById("adminOverview");
  if (!status || !overview) return;

  if (!hasAuthToken()) {
    showLoginRequired(status, overview);
    return;
  }

  try {
    const data = await fetchJsonWithAuth("/api/admin/overview");
    status.className = "result show good";
    status.innerHTML =
      "<strong>" +
      escapeHtml(data.message) +
      "</strong><p>Rol: " +
      escapeHtml(data.role) +
      "</p>";
    overview.innerHTML =
      '<a href="producten.html"><strong>' +
      data.summary.products +
      "</strong><span>producten</span></a>" +
      '<a href="producten.html"><strong>' +
      data.summary.variants +
      "</strong><span>varianten</span></a>" +
      '<a href="producten.html"><strong>' +
      data.summary.stores +
      "</strong><span>winkels</span></a>" +
      '<a href="producten.html"><strong>' +
      data.summary.prices +
      "</strong><span>prijsmetingen</span></a>";
  } catch (error) {
    showLoginRequired(status, overview);
  }
}

function showLoginRequired(status, overview) {
  status.className = "result show error";
  status.innerHTML = "<strong>Geen toegang. Log eerst in als admin.</strong>";
  overview.innerHTML =
    '<a href="login.html"><strong>Login vereist</strong><span>Ga naar de loginpagina.</span></a>';
}
