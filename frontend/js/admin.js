import { bindLogoutButton, hasAuthToken } from "./auth.js";
import { fetchJsonWithAuth } from "./api.js";
import { escapeHtml } from "./dom.js";

export async function initAdminPage() {
  bindLogoutButton(document.getElementById("logoutButton"));
  await loadAdminOverview();
  await loadAdminFeedback();
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

async function loadAdminFeedback() {
  const list = document.getElementById("adminFeedbackList");
  if (!list || !hasAuthToken()) return;

  try {
    const data = await fetchJsonWithAuth("/api/admin/feedback");
    renderAdminFeedback(list, data.feedback || []);
  } catch (error) {
    list.innerHTML =
      '<span class="muted">Feedback kan alleen door een admin worden bekeken.</span>';
  }
}

function renderAdminFeedback(list, items) {
  if (!items.length) {
    list.innerHTML = '<span class="muted">Er is nog geen feedback binnengekomen.</span>';
    return;
  }

  list.innerHTML = items
    .map(
      (item) =>
        '<article class="admin-feedback-item">' +
        "<div>" +
        "<strong>" +
        escapeHtml(item.page_visited || "Algemeen") +
        "</strong>" +
        '<span class="muted">' +
        escapeHtml(item.name || "Anonieme gebruiker") +
        " | " +
        escapeHtml(formatFeedbackDate(item.created_at)) +
        "</span>" +
        "</div>" +
        '<div class="admin-feedback-meta">' +
        "<span>" +
        item.rating +
        "/5</span>" +
        "<span>" +
        escapeHtml(item.status) +
        "</span>" +
        "<span>" +
        escapeHtml(item.priority) +
        "</span>" +
        "</div>" +
        "<p>" +
        escapeHtml(item.message) +
        "</p>" +
        "</article>",
    )
    .join("");
}

function formatFeedbackDate(value) {
  if (!value) return "datum onbekend";
  return new Date(value).toLocaleDateString("nl-NL");
}

function showLoginRequired(status, overview) {
  status.className = "result show error";
  status.innerHTML = "<strong>Geen toegang. Log eerst in als admin.</strong>";
  overview.innerHTML =
    '<a href="login.html"><strong>Login vereist</strong><span>Ga naar de loginpagina.</span></a>';
}
