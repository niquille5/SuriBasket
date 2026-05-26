import { bindLogoutButton, hasAuthToken } from "./auth.js";
import { fetchJsonWithAuth } from "./api.js";
import { escapeHtml, setText } from "./dom.js";
import {
  hideInlineMessage,
  renderCards,
  renderTableRows,
  setButtonLoading,
  setModalOpen,
  showInlineMessage,
} from "./ui.js";

const feedbackStatuses = ["new", "reviewed", "responded", "archived"];
const feedbackPriorities = ["low", "medium", "high", "urgent"];
let users = [];
let pendingDeleteUser = null;
let pendingDeleteFeedback = null;
let isLoadingFeedback = false;

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
    setText(
      "adminUsersSummary",
      users.length
        ? users.length + " account" + (users.length === 1 ? "" : "s") + " gevonden."
        : "Geen accounts gevonden.",
    );
  } catch (error) {
    renderTableRows(
      table,
      [],
      renderUserRow,
      renderUserEmptyRow("Gebruikers kunnen alleen door een admin worden bekeken."),
    );
    setText("adminUsersSummary", "Gebruikers konden niet worden geladen.");
    showActionMessage("adminUserMessage", "error", "Gebruikers laden is mislukt.");
  }
}

function renderUsers(table, items) {
  renderTableRows(
    table,
    items,
    renderUserRow,
    renderUserEmptyRow("Nog geen gebruikers gevonden. Maak een account aan om te starten."),
  );

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

function renderUserRow(user) {
  return (
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
    '<button type="button" class="table-button admin-edit-user" aria-label="Bewerk gebruiker ' +
    escapeHtml(user.username) +
    '">Bewerk</button>' +
    '<button type="button" class="table-button admin-delete-user" aria-label="Verwijder gebruiker ' +
    escapeHtml(user.username) +
    '">Delete</button>' +
    "</div></td>" +
    "</tr>"
  );
}

function renderUserEmptyRow(message) {
  return '<tr><td colspan="4"><div class="admin-empty-state">' + escapeHtml(message) + "</div></td></tr>";
}

function openUserModal(user = null) {
  const modal = document.getElementById("userModal");
  const form = document.getElementById("userForm");
  const password = document.getElementById("userPassword");
  const hint = document.getElementById("passwordHint");
  if (!modal || !form || !password || !hint) return;

  form.reset();
  setText("userFormState", "");
  hideActionMessage("adminUserMessage");
  setText("userModalTitle", user ? "Gebruiker bewerken" : "Nieuwe gebruiker");
  document.getElementById("userId").value = user?.user_id || "";
  document.getElementById("userUsername").value = user?.username || "";
  document.getElementById("userRole").value = user?.role || "user";
  password.required = !user;
  hint.textContent = user
    ? "Laat leeg als het wachtwoord hetzelfde blijft."
    : "Minimaal 6 tekens.";
  setModalOpen(modal, true);
  document.getElementById("userUsername")?.focus();
}

function closeUserModal() {
  setModalOpen("userModal", false);
}

async function saveUser(event) {
  event.preventDefault();
  const state = document.getElementById("userFormState");
  const submitButton = event.submitter;
  const userId = document.getElementById("userId").value;
  const payload = {
    username: document.getElementById("userUsername").value.trim(),
    role: document.getElementById("userRole").value,
    password: document.getElementById("userPassword").value,
  };

  setText("userFormState", "Opslaan...");
  setButtonLoading(submitButton, true, "Opslaan...");

  try {
    await fetchJsonWithAuth(userId ? "/api/admin/users/" + userId : "/api/admin/users", {
      method: userId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setText("userFormState", "Opgeslagen");
    closeUserModal();
    await loadAdminUsers();
    showActionMessage(
      "adminUserMessage",
      "good",
      userId ? "Gebruiker bijgewerkt." : "Nieuwe gebruiker aangemaakt.",
    );
  } catch (error) {
    if (state) state.textContent = "Opslaan mislukt. Controleer naam en wachtwoord.";
    showActionMessage("adminUserMessage", "error", "Opslaan mislukt. Controleer de gegevens.");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function openDeleteModal(user) {
  pendingDeleteUser = user;
  const modal = document.getElementById("deleteUserModal");
  setText("deleteUserState", "");
  hideActionMessage("adminUserMessage");
  setText(
    "deleteUserText",
    'Weet je zeker dat je "' + user.username + '" wilt verwijderen? Dit wist ook gekoppelde lijsten, aankopen, favorieten en prijsalerts.',
  );
  setModalOpen(modal, true);
}

function closeDeleteModal() {
  pendingDeleteUser = null;
  setModalOpen("deleteUserModal", false);
}

async function deleteSelectedUser() {
  if (!pendingDeleteUser) return;

  const deletedName = pendingDeleteUser.username;
  const confirmButton = document.getElementById("confirmDeleteUser");
  setText("deleteUserState", "Verwijderen...");
  setButtonLoading(confirmButton, true, "Verwijderen...");
  try {
    await fetchJsonWithAuth("/api/admin/users/" + pendingDeleteUser.user_id, {
      method: "DELETE",
    });
    closeDeleteModal();
    await loadAdminUsers();
    showActionMessage("adminUserMessage", "good", '"' + deletedName + '" is verwijderd.');
  } catch (error) {
    setText("deleteUserState", "Verwijderen mislukt.");
    showActionMessage("adminUserMessage", "error", "Gebruiker verwijderen is mislukt.");
  } finally {
    setButtonLoading(confirmButton, false);
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
  if (isLoadingFeedback) return;

  isLoadingFeedback = true;
  const refresh = document.getElementById("refreshFeedbackButton");
  if (refresh) {
    refresh.disabled = true;
    refresh.textContent = "Verversen...";
  }
  list.innerHTML = '<div class="admin-empty-state">Feedback wordt geladen...</div>';
  setText("adminFeedbackSummary", "Feedback wordt opgehaald...");

  try {
    const data = await fetchJsonWithAuth("/api/admin/feedback");
    const feedback = data.feedback || [];
    renderAdminFeedback(list, feedback);
    bindFeedbackActions(list);
    setText(
      "adminFeedbackSummary",
      feedback.length
        ? feedback.length + " reactie" + (feedback.length === 1 ? "" : "s") + " zichtbaar."
        : "Geen feedback gevonden.",
    );
    showActionMessage("adminFeedbackMessage", "info", "Feedback is bijgewerkt.");
  } catch (error) {
    renderCards(
      list,
      [],
      renderAdminFeedbackCard,
      '<div class="admin-empty-state">Feedback kan alleen door een admin worden bekeken.</div>',
    );
    setText("adminFeedbackSummary", "Feedback kon niet worden geladen.");
    showActionMessage("adminFeedbackMessage", "error", "Feedback verversen is mislukt.");
  } finally {
    isLoadingFeedback = false;
    if (refresh) {
      refresh.disabled = false;
      refresh.textContent = "Refresh";
    }
  }
}

function renderAdminFeedback(list, items) {
  renderCards(
    list,
    items,
    renderAdminFeedbackCard,
    '<div class="admin-empty-state">Er is nog geen feedback binnengekomen.</div>',
  );
}

function renderAdminFeedbackCard(item) {
  return (
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
    "</article>"
  );
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

  setButtonLoading(button, true, "Opslaan...");
  hideActionMessage("adminFeedbackMessage");
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
    showActionMessage("adminFeedbackMessage", "good", "Feedback bijgewerkt.");
  } catch (error) {
    if (state) state.textContent = "Opslaan mislukt";
    showActionMessage("adminFeedbackMessage", "error", "Feedback opslaan is mislukt.");
  } finally {
    setButtonLoading(button, false);
  }
}

function openDeleteFeedbackModal(button) {
  const item = button.closest(".admin-feedback-item");
  const feedbackId = item?.dataset.feedbackId;
  const page = item?.querySelector("strong")?.textContent.trim() || "deze reactie";

  if (!feedbackId) return;

  pendingDeleteFeedback = feedbackId;
  setText("deleteFeedbackState", "");
  hideActionMessage("adminFeedbackMessage");
  setText(
    "deleteFeedbackText",
    'Weet je zeker dat je feedback van "' + page + '" wilt verwijderen?',
  );

  setModalOpen("deleteFeedbackModal", true);
}

function closeDeleteFeedbackModal() {
  pendingDeleteFeedback = null;
  setModalOpen("deleteFeedbackModal", false);
}

async function deleteSelectedFeedback() {
  if (!pendingDeleteFeedback) return;

  const confirmButton = document.getElementById("confirmDeleteFeedback");
  setText("deleteFeedbackState", "Verwijderen...");
  setButtonLoading(confirmButton, true, "Verwijderen...");
  try {
    await fetchJsonWithAuth("/api/admin/feedback/" + pendingDeleteFeedback, {
      method: "DELETE",
    });
    closeDeleteFeedbackModal();
    await loadAdminFeedback();
    showActionMessage("adminFeedbackMessage", "good", "Feedbackreactie verwijderd.");
  } catch (error) {
    setText("deleteFeedbackState", "Verwijderen mislukt.");
    showActionMessage("adminFeedbackMessage", "error", "Feedback verwijderen is mislukt.");
  } finally {
    setButtonLoading(confirmButton, false);
  }
}

function showActionMessage(id, type, message) {
  showInlineMessage(id, type, message);
}

function hideActionMessage(id) {
  hideInlineMessage(id);
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
