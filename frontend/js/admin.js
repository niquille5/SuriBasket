import { bindLogoutButton, hasAuthToken } from "./auth.js";
import { fetchJsonWithAuth } from "./api.js";
import { escapeHtml, setText } from "./dom.js";

const feedbackStatuses = ["new", "reviewed", "responded", "archived"];
const feedbackPriorities = ["low", "medium", "high", "urgent"];
let users = [];
let pendingDeleteUser = null;
let pendingDeleteFeedback = null;

export async function initAdminPage() {
  bindLogoutButton(document.getElementById("logoutButton"));
  bindUserUi();
  await loadAdminOverview();
  await loadAdminUsers();
  await loadAdminFeedback();
}

function bindUserUi() {
  document.getElementById("newUserButton")?.addEventListener("click", () => {
    openUserModal();
  });
  document.getElementById("closeUserModal")?.addEventListener("click", closeUserModal);
  document.getElementById("cancelUserModal")?.addEventListener("click", closeUserModal);
  document.getElementById("userForm")?.addEventListener("submit", saveUser);
  document.getElementById("cancelDeleteUser")?.addEventListener("click", closeDeleteModal);
  document.getElementById("confirmDeleteUser")?.addEventListener("click", deleteSelectedUser);
  document.getElementById("refreshFeedbackButton")?.addEventListener("click", loadAdminFeedback);
  document
    .getElementById("cancelDeleteFeedback")
    ?.addEventListener("click", closeDeleteFeedbackModal);
  document
    .getElementById("confirmDeleteFeedback")
    ?.addEventListener("click", deleteSelectedFeedback);
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

async function loadAdminUsers() {
  const table = document.getElementById("adminUsersTable");
  if (!table || !hasAuthToken()) return;

  try {
    const data = await fetchJsonWithAuth("/api/admin/users");
    users = data.users || [];
    renderUsers(table, users);
  } catch (error) {
    table.innerHTML =
      '<tr><td colspan="4">Gebruikers kunnen alleen door een admin worden bekeken.</td></tr>';
  }
}

function renderUsers(table, items) {
  if (!items.length) {
    table.innerHTML = '<tr><td colspan="4">Nog geen gebruikers gevonden.</td></tr>';
    return;
  }

  table.innerHTML = items
    .map(
      (user) =>
        '<tr data-user-id="' +
        user.user_id +
        '">' +
        "<td><strong>" +
        escapeHtml(user.username) +
        '</strong><span class="muted">ID #' +
        user.user_id +
        "</span></td>" +
        "<td><span class=\"admin-role-badge\">" +
        escapeHtml(user.role) +
        "</span></td>" +
        "<td>" +
        escapeHtml(formatFeedbackDate(user.created_at)) +
        "</td>" +
        '<td><div class="admin-row-actions">' +
        '<button type="button" class="table-button admin-edit-user">Bewerk</button>' +
        '<button type="button" class="table-button admin-delete-user">Delete</button>' +
        "</div></td>" +
        "</tr>",
    )
    .join("");

  table.querySelectorAll(".admin-edit-user").forEach((button) => {
    button.addEventListener("click", () => {
      const user = findUserFromButton(button);
      if (user) openUserModal(user);
    });
  });

  table.querySelectorAll(".admin-delete-user").forEach((button) => {
    button.addEventListener("click", () => {
      const user = findUserFromButton(button);
      if (user) openDeleteModal(user);
    });
  });
}

function openUserModal(user = null) {
  const modal = document.getElementById("userModal");
  const form = document.getElementById("userForm");
  const password = document.getElementById("userPassword");
  const hint = document.getElementById("passwordHint");
  if (!modal || !form || !password || !hint) return;

  form.reset();
  setText("userFormState", "");
  setText("userModalTitle", user ? "Gebruiker bewerken" : "Nieuwe gebruiker");
  document.getElementById("userId").value = user?.user_id || "";
  document.getElementById("userUsername").value = user?.username || "";
  document.getElementById("userRole").value = user?.role || "user";
  password.required = !user;
  hint.textContent = user
    ? "Laat leeg als het wachtwoord hetzelfde blijft."
    : "Minimaal 6 tekens.";
  modal.hidden = false;
  document.getElementById("userUsername")?.focus();
}

function closeUserModal() {
  const modal = document.getElementById("userModal");
  if (modal) modal.hidden = true;
}

async function saveUser(event) {
  event.preventDefault();
  const state = document.getElementById("userFormState");
  const userId = document.getElementById("userId").value;
  const payload = {
    username: document.getElementById("userUsername").value.trim(),
    role: document.getElementById("userRole").value,
    password: document.getElementById("userPassword").value,
  };

  setText("userFormState", "Opslaan...");

  try {
    await fetchJsonWithAuth(userId ? "/api/admin/users/" + userId : "/api/admin/users", {
      method: userId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setText("userFormState", "Opgeslagen");
    closeUserModal();
    await loadAdminUsers();
  } catch (error) {
    if (state) state.textContent = "Opslaan mislukt. Controleer naam en wachtwoord.";
  }
}

function openDeleteModal(user) {
  pendingDeleteUser = user;
  const modal = document.getElementById("deleteUserModal");
  setText("deleteUserState", "");
  setText(
    "deleteUserText",
    'Weet je zeker dat je "' + user.username + '" wilt verwijderen? Dit wist ook gekoppelde lijsten, aankopen, favorieten en prijsalerts.',
  );
  if (modal) modal.hidden = false;
}

function closeDeleteModal() {
  pendingDeleteUser = null;
  const modal = document.getElementById("deleteUserModal");
  if (modal) modal.hidden = true;
}

async function deleteSelectedUser() {
  if (!pendingDeleteUser) return;

  setText("deleteUserState", "Verwijderen...");
  try {
    await fetchJsonWithAuth("/api/admin/users/" + pendingDeleteUser.user_id, {
      method: "DELETE",
    });
    closeDeleteModal();
    await loadAdminUsers();
  } catch (error) {
    setText("deleteUserState", "Verwijderen mislukt.");
  }
}

function findUserFromButton(button) {
  const row = button.closest("tr");
  const userId = Number(row?.dataset.userId);
  return users.find((user) => Number(user.user_id) === userId);
}

async function loadAdminFeedback() {
  const list = document.getElementById("adminFeedbackList");
  if (!list || !hasAuthToken()) return;

  try {
    const data = await fetchJsonWithAuth("/api/admin/feedback");
    renderAdminFeedback(list, data.feedback || []);
    bindFeedbackActions(list);
    const refresh = document.getElementById("refreshFeedbackButton");
    if (refresh) refresh.textContent = "Refresh";
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
        '<article class="admin-feedback-item" data-feedback-id="' +
        item.id +
        '">' +
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
        '<div class="admin-feedback-controls">' +
        '<label>Status<select data-feedback-field="status">' +
        renderOptions(feedbackStatuses, item.status) +
        "</select></label>" +
        '<label>Prioriteit<select data-feedback-field="priority">' +
        renderOptions(feedbackPriorities, item.priority) +
        "</select></label>" +
        '<label class="admin-response-field">Admin-reactie<textarea data-feedback-field="admin_response" rows="3" placeholder="Schrijf een korte reactie of notitie.">' +
        escapeHtml(item.admin_response || "") +
        "</textarea></label>" +
        "</div>" +
        '<div class="admin-feedback-actions">' +
        '<span class="admin-save-state" aria-live="polite"></span>' +
        '<button type="button" class="table-button admin-save-feedback">Opslaan</button>' +
        '<button type="button" class="table-button admin-delete-feedback">Delete</button>' +
        "</div>" +
        "</article>",
    )
    .join("");
}

function bindFeedbackActions(list) {
  list.querySelectorAll(".admin-save-feedback").forEach((button) => {
    button.addEventListener("click", () => updateFeedbackItem(button));
  });
  list.querySelectorAll(".admin-delete-feedback").forEach((button) => {
    button.addEventListener("click", () => openDeleteFeedbackModal(button));
  });
}

async function updateFeedbackItem(button) {
  const item = button.closest(".admin-feedback-item");
  const state = item?.querySelector(".admin-save-state");
  const feedbackId = item?.dataset.feedbackId;

  if (!item || !feedbackId) return;

  const status = item.querySelector('[data-feedback-field="status"]')?.value;
  const priority = item.querySelector('[data-feedback-field="priority"]')?.value;
  const adminResponse = item
    .querySelector('[data-feedback-field="admin_response"]')
    ?.value.trim();

  button.disabled = true;
  if (state) state.textContent = "Opslaan...";

  try {
    await fetchJsonWithAuth("/api/admin/feedback/" + feedbackId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        priority,
        admin_response: adminResponse,
      }),
    });

    if (state) state.textContent = "Opgeslagen";
    await loadAdminFeedback();
  } catch (error) {
    if (state) state.textContent = "Opslaan mislukt";
  } finally {
    button.disabled = false;
  }
}

function openDeleteFeedbackModal(button) {
  const item = button.closest(".admin-feedback-item");
  const feedbackId = item?.dataset.feedbackId;
  const page = item?.querySelector("strong")?.textContent.trim() || "deze reactie";

  if (!feedbackId) return;

  pendingDeleteFeedback = feedbackId;
  setText("deleteFeedbackState", "");
  setText(
    "deleteFeedbackText",
    'Weet je zeker dat je feedback van "' + page + '" wilt verwijderen?',
  );

  const modal = document.getElementById("deleteFeedbackModal");
  if (modal) modal.hidden = false;
}

function closeDeleteFeedbackModal() {
  pendingDeleteFeedback = null;
  const modal = document.getElementById("deleteFeedbackModal");
  if (modal) modal.hidden = true;
}

async function deleteSelectedFeedback() {
  if (!pendingDeleteFeedback) return;

  setText("deleteFeedbackState", "Verwijderen...");
  try {
    await fetchJsonWithAuth("/api/admin/feedback/" + pendingDeleteFeedback, {
      method: "DELETE",
    });
    closeDeleteFeedbackModal();
    await loadAdminFeedback();
  } catch (error) {
    setText("deleteFeedbackState", "Verwijderen mislukt.");
  }
}

function renderOptions(options, selected) {
  return options
    .map(
      (option) =>
        '<option value="' +
        escapeHtml(option) +
        '"' +
        (option === selected ? " selected" : "") +
        ">" +
        escapeHtml(option) +
        "</option>",
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
