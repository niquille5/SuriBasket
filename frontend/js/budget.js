import { fetchJson } from "./api.js";
import { getAuthHeaders, hasAuthToken } from "./auth.js";
import { escapeHtml, showMessage } from "./dom.js";
import { formatCurrency } from "./format.js";
import { createBudgetList } from "./budget-shared.js";

export async function initBudgetPage() {
  const elements = getBudgetElements();
  const budget = createBudgetList(elements);
  bindSaveButtons(budget, elements);
  bindHistoryControls(elements);

  try {
    const prices = await fetchJson("/api/prices");
    budget.setProducts(prices);
  } catch (error) {
    const select = document.getElementById("budgetProductSelect");
    if (select)
      select.innerHTML = '<option value="">Backend niet bereikbaar</option>';
    showMessage(
      document.getElementById("budgetMessage"),
      "error",
      "Kan geen prijzen laden. Start de backend met npm start.",
    );
  }
}

function getBudgetElements() {
  return {
    productSelect: document.getElementById("budgetProductSelect"),
    productGrid: document.getElementById("budgetProductGrid"),
    quantityInput: document.getElementById("budgetQuantityInput"),
    addButton: document.getElementById("addBudgetItemButton"),
    clearButton: document.getElementById("clearBudgetButton"),
    saveListButton: document.getElementById("saveBudgetListButton"),
    historyPanel: document.getElementById("budgetHistoryPanel"),
    historyList: document.getElementById("budgetHistoryList"),
    historyDateFrom: document.getElementById("historyDateFrom"),
    historyDateTo: document.getElementById("historyDateTo"),
    historyProductFilter: document.getElementById("historyProductFilter"),
    historyApplyButton: document.getElementById("applyHistoryFiltersButton"),
    table: document.getElementById("budgetTable"),
    total: document.getElementById("budgetTotal"),
    count: document.getElementById("budgetCount"),
    noteCount: document.getElementById("noteItemTotal"),
    message: document.getElementById("budgetMessage"),
  };
}

function bindSaveButtons(budget, elements) {
  elements.saveListButton?.addEventListener("click", () =>
    saveBudgetList(budget, elements),
  );
}

async function saveBudgetList(budget, elements) {
  if (!canSaveBudget(budget)) return;

  try {
    await fetchJson("/api/shopping-lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        list_name: "Begroting " + new Date().toLocaleDateString("nl-NL"),
        items: budget.items,
      }),
    });

    showMessage(
      document.getElementById("budgetMessage"),
      "good",
      "Begrotingslijst opgeslagen.",
    );

    if (
      elements.historyPanel &&
      !elements.historyPanel.classList.contains("is-hidden") &&
      hasValidHistoryFilter(elements)
    ) {
      await loadBudgetHistory(elements);
    }
  } catch (error) {
    showMessage(
      document.getElementById("budgetMessage"),
      "error",
      "Opslaan is niet gelukt. Log opnieuw in als je sessie verlopen is.",
    );
  }
}

function canSaveBudget(budget) {
  const message = document.getElementById("budgetMessage");

  if (!hasAuthToken()) {
    showMessage(message, "error", "Log eerst in om iets op te slaan.");
    return false;
  }

  if (!budget.items.length) {
    showMessage(message, "error", "Voeg eerst producten toe aan je begroting.");
    return false;
  }

  return true;
}

function bindHistoryControls(elements) {
  elements.historyApplyButton?.addEventListener("click", () =>
    handleHistoryFilterChange(elements),
  );

  renderBudgetHistory(elements);
}

async function handleHistoryFilterChange(elements) {
  if (!hasValidHistoryFilter(elements)) {
    renderBudgetHistory(elements);
    return;
  }

  if (!hasValidHistoryDateRange(elements)) {
    renderHistoryFilterMessage(
      elements,
      "Kies een geldige periode: startdatum mag niet later zijn dan einddatum.",
    );
    return;
  }

  if (!elements.historyData) {
    await loadBudgetHistory(elements);
    return;
  }

  renderBudgetHistory(elements);
}

async function loadBudgetHistory(elements) {
  if (!elements.historyList) return;

  if (!hasAuthToken()) {
    elements.historyList.innerHTML =
      '<p class="muted">Log eerst in om je begroting geschiedenis te bekijken.</p>';
    return;
  }

  elements.historyList.innerHTML =
    '<p class="muted">Begroting geschiedenis wordt geladen...</p>';

  try {
    elements.historyData = await fetchJson("/api/shopping-lists", {
      headers: getAuthHeaders(),
    });
    renderBudgetHistory(elements);
  } catch (error) {
    elements.historyList.innerHTML =
      '<p class="muted">Begroting geschiedenis laden is niet gelukt. Log opnieuw in als je sessie verlopen is.</p>';
  }
}

function renderBudgetHistory(elements) {
  if (!elements.historyList) return;

  if (hasPartialHistoryDateRange(elements)) {
    renderHistoryFilterMessage(
      elements,
      "Kies zowel een startdatum als een einddatum, of filter alleen op product.",
    );
    return;
  }

  if (!hasValidHistoryFilter(elements)) {
    renderHistoryFilterMessage(
      elements,
      "Kies een product, of kies een startdatum en einddatum, om begroting geschiedenis te bekijken.",
    );
    return;
  }

  if (!hasValidHistoryDateRange(elements)) {
    renderHistoryFilterMessage(
      elements,
      "Kies een geldige periode: startdatum mag niet later zijn dan einddatum.",
    );
    return;
  }

  const lists = filterHistory(elements);

  if (!lists.length) {
    elements.historyList.innerHTML =
      '<p class="muted">Geen opgeslagen begrotingen gevonden voor deze filters.</p>';
    return;
  }

  elements.historyList.innerHTML =
    '<div class="history-download-row">' +
    '<button type="button" id="downloadHistoryPdfButton">Download PDF</button>' +
    "</div>" +
    lists.map(renderHistoryCard).join("");

  document
    .getElementById("downloadHistoryPdfButton")
    ?.addEventListener("click", () => downloadBudgetHistoryPdf(lists));
}

function hasValidHistoryFilter(elements) {
  return hasCompleteHistoryDateRange(elements) || hasHistoryProductFilter(elements);
}

function hasHistoryProductFilter(elements) {
  return Boolean(String(elements.historyProductFilter?.value || "").trim());
}

function hasCompleteHistoryDateRange(elements) {
  return Boolean(elements.historyDateFrom?.value && elements.historyDateTo?.value);
}

function hasPartialHistoryDateRange(elements) {
  return Boolean(elements.historyDateFrom?.value) !==
    Boolean(elements.historyDateTo?.value);
}

function hasValidHistoryDateRange(elements) {
  const fromDate = elements.historyDateFrom?.value || "";
  const toDate = elements.historyDateTo?.value || "";

  return !fromDate || !toDate || fromDate <= toDate;
}

function renderHistoryFilterMessage(elements, message) {
  if (!elements.historyList) return;
  elements.historyList.innerHTML =
    '<p class="muted">' + escapeHtml(message) + "</p>";
}

function filterHistory(elements) {
  const productFilter = normalizeHistorySearch(
    elements.historyProductFilter?.value || "",
  );
  const fromDate = elements.historyDateFrom?.value || "";
  const toDate = elements.historyDateTo?.value || "";

  return (elements.historyData || [])
    .map((list) => ({
      ...list,
      items: list.items.filter((item) => {
        const productName = normalizeHistorySearch(item.product_name || "");
        const matchesProduct =
          !productFilter || productName.includes(productFilter);

        return matchesProduct;
      }),
    }))
    .filter((list) => {
      const date = getDateOnly(list.created_at);
      const matchesFrom = !fromDate || date >= fromDate;
      const matchesTo = !toDate || date <= toDate;

      return matchesFrom && matchesTo && list.items.length;
    });
}

function normalizeHistorySearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function renderHistoryCard(list) {
  const total = getListTotal(list);
  const date = formatDateTime(list.created_at);

  return (
    '<article class="history-card">' +
    '<div class="history-card-header">' +
    "<div>" +
    "<h3>" +
    escapeHtml(list.list_name || "Begroting") +
    "</h3>" +
    '<div class="history-meta">' +
    "<span>" +
    escapeHtml(date) +
    "</span>" +
    "<span>" +
    list.items.length +
    " producten</span>" +
    "<span>" +
    formatCurrency(total) +
    "</span>" +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="history-items">' +
    list.items.map(renderHistoryItem).join("") +
    "</div>" +
    "</article>"
  );
}

function renderHistoryItem(item) {
  const price = Number(item.estimated_price) || 0;
  const quantity = Number(item.quantity) || 0;
  const subtotal = price * quantity;
  const details = [
    item.category,
    item.store_name,
    item.unit,
    quantity + " x " + formatCurrency(price),
  ].filter(Boolean);

  return (
    '<div class="history-item">' +
    "<div>" +
    "<strong>" +
    escapeHtml(item.product_name) +
    "</strong>" +
    "<span>" +
    escapeHtml(details.join(" | ")) +
    "</span>" +
    "</div>" +
    '<strong class="price">' +
    formatCurrency(subtotal) +
    "</strong>" +
    "</div>"
  );
}

function downloadBudgetHistoryPdf(lists) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showMessage(
      document.getElementById("budgetMessage"),
      "error",
      "Pop-up geblokkeerd. Sta pop-ups toe om PDF te downloaden.",
    );
    return;
  }

  const sections = lists.map(renderBudgetHistoryPdfSection).join("");
  const total = lists.reduce((sum, list) => sum + getListTotal(list), 0);

  printWindow.document.write(
    "<!doctype html><html><head><title>Begroting geschiedenis</title>" +
      "<style>" +
      "body{font-family:Arial,sans-serif;color:#1f2a2a;margin:32px}" +
      "h1{margin:0 0 6px;font-size:24px}" +
      "h2{font-size:18px;margin:24px 0 6px;color:#126c65}" +
      "p{margin:0 0 14px;color:#5f6b68}" +
      "table{border-collapse:collapse;width:100%;font-size:13px;margin-top:10px}" +
      "th,td{border:1px solid #d9e2de;padding:8px;text-align:left}" +
      "th{background:#edf7f4}" +
      ".total{margin-top:18px;text-align:right;font-size:18px}" +
      "</style></head><body>" +
      "<h1>Begroting geschiedenis</h1>" +
      "<p>Gefilterd overzicht met " +
      lists.length +
      " begrotingen</p>" +
      sections +
      '<div class="total"><strong>Totaal: ' +
      formatCurrency(total) +
      "</strong></div>" +
      "</body></html>",
  );

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function renderBudgetHistoryPdfSection(list) {
  const rows = list.items.map(renderBudgetPdfRow).join("");

  return (
    "<section>" +
    "<h2>" +
    escapeHtml(list.list_name || "Begroting") +
    "</h2>" +
    "<p>Opgeslagen op " +
    escapeHtml(formatDateTime(list.created_at)) +
    " | " +
    list.items.length +
    " producten | " +
    formatCurrency(getListTotal(list)) +
    "</p>" +
    "<table><thead><tr><th>Product</th><th>Leverancier</th><th>Categorie</th><th>Eenheid</th><th>Aantal</th><th>Prijs</th><th>Subtotaal</th></tr></thead><tbody>" +
    rows +
    "</tbody></table>" +
    "</section>"
  );
}

function renderBudgetPdfRow(item) {
  const price = Number(item.estimated_price) || 0;
  const quantity = Number(item.quantity) || 0;
  const subtotal = price * quantity;

  return (
    "<tr>" +
    "<td>" +
    escapeHtml(item.product_name) +
    "</td>" +
    "<td>" +
    escapeHtml(item.store_name || "Onbekend") +
    "</td>" +
    "<td>" +
    escapeHtml(item.category || "-") +
    "</td>" +
    "<td>" +
    escapeHtml(item.unit || "-") +
    "</td>" +
    "<td>" +
    quantity +
    "</td>" +
    "<td>" +
    formatCurrency(price) +
    "</td>" +
    "<td>" +
    formatCurrency(subtotal) +
    "</td>" +
    "</tr>"
  );
}

function getListTotal(list) {
  return list.items.reduce(
    (sum, item) =>
      sum + (Number(item.estimated_price) || 0) * (Number(item.quantity) || 0),
    0,
  );
}

function getDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return [year, month, day].join("-");
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
