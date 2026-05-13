import { fetchJson } from "./api.js";
import { escapeHtml, setText } from "./dom.js";
import { formatCurrency, getPackageText } from "./format.js";
import { buildBudgetProducts, createBudgetList } from "./budget-shared.js";
import { warungProductCategories } from "./budget-data.js";

const state = {
  prices: [],
  officialProducts: [],
  productMode: "local",
  renderedLocalProducts: [],
  renderedOfficialProducts: [],
  budget: null,
};

export async function initProductsPage() {
  state.budget = createBudgetList({
    clearButton: document.getElementById("clearBudgetButton"),
    copyButton: document.getElementById("copyBudgetButton"),
    table: document.getElementById("budgetTable"),
    total: document.getElementById("budgetTotal"),
    count: document.getElementById("budgetCount"),
    noteCount: document.getElementById("noteItemTotal"),
    message: document.getElementById("budgetMessage"),
    notePanel: document.getElementById("budgetNotePanel"),
    noteToggle: document.getElementById("budgetNoteToggle"),
  });

  bindProductSearch();
  await loadProductTables();
}

async function loadProductTables() {
  try {
    state.prices = await fetchJson("/api/prices");
    const officialProducts = await fetchJson("/api/official-products").catch(
      () => [],
    );

    state.officialProducts = onlyWarungProducts(officialProducts);
    state.budget.products = buildBudgetProducts(state.prices);
    updateProductStats(state.prices.length);
    renderCurrentProductTable();
    state.budget.render();
  } catch (error) {
    renderOfflineTable();
  }
}

function bindProductSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput)
    searchInput.addEventListener("input", renderCurrentProductTable);

  document
    .getElementById("localPricesButton")
    ?.addEventListener("click", () => switchMode("local"));
  document
    .getElementById("officialPricesButton")
    ?.addEventListener("click", () => switchMode("official"));
}

function switchMode(mode) {
  state.productMode = mode;
  setProductModeButtons();
  renderCurrentProductTable();
}

function renderCurrentProductTable() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

  if (state.productMode === "official") {
    setProductsTableMode("official");
    const items = filterItems(state.officialProducts, query, [
      "product_name",
      "category",
      "importer_name",
      "wholesale_package",
      "retail_package",
    ]);
    renderOfficialPrices(items);
    return;
  }

  setProductsTableMode("local");
  setText(document.getElementById("productsTableTitle"), "Prijsregistraties");
  setTableHead(
    "<tr><th>#</th><th>Product</th><th>Categorie</th><th>Merk</th><th>Verpakking</th><th>Winkel</th><th>Prijs</th><th>Actie</th></tr>",
  );

  const items = filterItems(state.prices, query, [
    "product_name",
    "category",
    "brand",
    "store_name",
    "location",
    "unit",
  ]);
  renderLocalPrices(items);
}

function renderLocalPrices(items) {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  if (!items.length) {
    table.innerHTML = '<tr><td colspan="8">Geen producten gevonden.</td></tr>';
    updateProductStats(0);
    return;
  }

  state.renderedLocalProducts = items.map((item, index) => ({
    key: "local-" + index + "-" + item.product_name + "-" + item.store_name,
    product_name: item.product_name,
    category: item.category || "Algemeen",
    unit: getPackageText(item),
    price: Number(item.price),
    store_name: item.store_name || "Onbekend",
  }));

  table.innerHTML = items
    .map((item, index) => {
      const packageText = getPackageText(item);
      return (
        "<tr>" +
        "<td>" +
        (index + 1) +
        "</td>" +
        "<td><strong>" +
        escapeHtml(item.product_name) +
        "</strong></td>" +
        "<td>" +
        escapeHtml(item.category || "Algemeen") +
        "</td>" +
        "<td>" +
        escapeHtml(item.brand || "Onbekend") +
        "</td>" +
        "<td>" +
        escapeHtml(packageText || "Niet ingevuld") +
        "</td>" +
        "<td><strong>" +
        escapeHtml(item.store_name || "Onbekend") +
        '</strong><span class="muted">' +
        escapeHtml(item.location || "") +
        "</span></td>" +
        '<td class="price">' +
        formatCurrency(item.price) +
        "</td>" +
        '<td><button type="button" class="row-add-button" data-add-local="' +
        index +
        '">Voeg toe</button></td>' +
        "</tr>"
      );
    })
    .join("");

  bindProductRowButtons();
  updateProductStats(items.length);
}

function renderOfficialPrices(items) {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  setText(
    document.getElementById("productsTableTitle"),
    "Publieke productenlijst",
  );
  setTableHead(
    "<tr><th>#</th><th>Product</th><th>Importeur</th><th>Verpakking</th><th>Prijs</th><th>Actie</th></tr>",
  );

  if (!items.length) {
    table.innerHTML =
      '<tr><td colspan="6">Geen officiele producten gevonden.</td></tr>';
    updateProductStats(0);
    return;
  }

  state.renderedOfficialProducts = items.map((item, index) => ({
    key: "public-" + (item.official_price_id || index),
    product_name: item.product_name,
    category: item.category || "Algemeen",
    unit: item.retail_package || "stuk",
    price: Number(item.retail_price),
    store_name: item.importer_name || "Publieke productenlijst",
  }));

  table.innerHTML = items
    .map(
      (item, index) =>
        "<tr>" +
        "<td>" +
        item.source_row_number +
        "</td>" +
        "<td><strong>" +
        escapeHtml(item.product_name) +
        '</strong><span class="muted">' +
        escapeHtml(item.category || "Algemeen") +
        "</span></td>" +
        "<td>" +
        escapeHtml(item.importer_name || "Onbekend") +
        "</td>" +
        "<td>" +
        escapeHtml(item.retail_package || "Niet ingevuld") +
        "</td>" +
        '<td class="price">' +
        formatCurrency(item.retail_price) +
        "</td>" +
        '<td><button type="button" class="row-add-button" data-add-official="' +
        index +
        '">Voeg toe</button></td>' +
        "</tr>",
    )
    .join("");

  bindProductRowButtons();
  updateProductStats(items.length);
}

function bindProductRowButtons() {
  const table = document.getElementById("pricesTable");

  table.querySelectorAll("[data-add-local]").forEach((button) => {
    button.addEventListener("click", () => {
      state.budget.addProduct(
        state.renderedLocalProducts[Number(button.dataset.addLocal)],
        1,
      );
      updateProductStats(document.querySelectorAll("#pricesTable tr").length);
    });
  });

  table.querySelectorAll("[data-add-official]").forEach((button) => {
    button.addEventListener("click", () => {
      state.budget.addProduct(
        state.renderedOfficialProducts[Number(button.dataset.addOfficial)],
        1,
      );
      updateProductStats(document.querySelectorAll("#pricesTable tr").length);
    });
  });
}

function updateProductStats(visibleCount) {
  setText(document.getElementById("localPriceTotal"), state.prices.length);
  setText(
    document.getElementById("officialPriceTotal"),
    state.officialProducts.length,
  );
  setText(document.getElementById("visiblePriceTotal"), visibleCount);
  setText(
    document.getElementById("noteItemTotal"),
    state.budget ? state.budget.items.length : 0,
  );
}

function setProductModeButtons() {
  document
    .getElementById("localPricesButton")
    ?.classList.toggle("active", state.productMode === "local");
  document
    .getElementById("officialPricesButton")
    ?.classList.toggle("active", state.productMode === "official");
}

function setTableHead(html) {
  const head = document.getElementById("pricesTableHead");
  if (head) head.innerHTML = html;
}

function setProductsTableMode(mode) {
  const section = document.querySelector(".products-section");
  if (!section) return;

  section.classList.toggle("is-local", mode === "local");
  section.classList.toggle("is-official", mode === "official");
}

function filterItems(items, query, fields) {
  if (!query) return items;
  return items.filter((item) =>
    fields.some((field) =>
      String(item[field] || "")
        .toLowerCase()
        .includes(query),
    ),
  );
}

function onlyWarungProducts(items) {
  return items.filter((item) =>
    warungProductCategories.includes(item.category || ""),
  );
}

function renderOfflineTable() {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  table.innerHTML =
    '<tr><td colspan="8">Kan geen verbinding maken met de backend. Start de server via: <strong>cd C:\\Users\\user\\Suri Basket\\backend</strong> en <strong>npm start</strong>.</td></tr>';
}
