import { fetchJson, fetchJsonWithAuth } from "./api.js";
import { escapeHtml, setText } from "./dom.js";
import { formatCurrency, getPackageText } from "./format.js";
import { buildBudgetProducts, createBudgetList } from "./budget-shared.js";
import { warungProductCategories } from "./budget-data.js";
import { hasAuthToken } from "./auth.js";

const state = {
  prices: [],
  officialProducts: [],
  productMode: "local",
  renderedLocalProducts: [],
  renderedOfficialProducts: [],
  renderedFavoriteProducts: [],
  renderedAlertProducts: [],
  budget: null,
  favorites: [],
  priceAlerts: [],
  alertKeys: new Set(),
  favoritedIds: new Set(),
  favoritedNames: new Set(),
  alertProduct: null,
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
  createPriceAlertUi();
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
    populateProductFilters();
    await loadFavorites();
    await loadPriceAlerts();
    await showTriggeredPriceAlerts();
    updateProductStats(state.prices.length);
    renderCurrentProductTable();
    state.budget.render();
  } catch (error) {
    renderOfflineTable();
  }
}

function bindProductSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", renderCurrentProductTable);
  }

  document
    .querySelectorAll(
      "#productFilter, #categoryFilter, #brandFilter, #storeFilter",
    )
    .forEach((filter) =>
      filter.addEventListener("input", renderCurrentProductTable),
    );
  document
    .getElementById("clearProductFiltersButton")
    ?.addEventListener("click", clearProductFilters);

  document
    .getElementById("localPricesButton")
    ?.addEventListener("click", () => switchMode("local"));
  document
    .getElementById("officialPricesButton")
    ?.addEventListener("click", () => switchMode("official"));
  document
    .getElementById("favoritesButton")
    ?.addEventListener("click", () => switchMode("favorites"));
  document
    .getElementById("priceAlertsButton")
    ?.addEventListener("click", () => switchMode("alerts"));
}

function switchMode(mode) {
  state.productMode = mode;
  setProductModeButtons();
  populateProductFilters();
  renderCurrentProductTable();
}

function renderCurrentProductTable() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const selectedFilters = getSelectedProductFilters();

  if (state.productMode === "official") {
    setProductsTableMode("official");
    const items = filterByOptions(
      filterItems(state.officialProducts, query, [
        "product_name",
        "category",
        "importer_name",
        "wholesale_package",
        "retail_package",
      ]),
      selectedFilters,
    );
    renderOfficialPrices(items);
    return;
  }

  if (state.productMode === "favorites") {
    setProductsTableMode("favorites");
    setText(document.getElementById("productsTableTitle"), "Favorieten");
    setTableHead(
      "<tr><th>#</th><th>Product</th><th>Categorie</th><th>Merk</th><th>Verpakking</th><th>Winkel</th><th>Prijs</th><th>Actie</th></tr>",
    );
    renderFavorites(query);
    return;
  }

  if (state.productMode === "alerts") {
    setProductsTableMode("alerts");
    setText(document.getElementById("productsTableTitle"), "Prijsalerts");
    setTableHead(
      "<tr><th>#</th><th>Product</th><th>Categorie</th><th>Verpakking</th><th>Huidige prijs</th><th>Doelprijs</th><th>Status</th><th>Actie</th></tr>",
    );
    renderPriceAlerts(query);
    return;
  }

  setProductsTableMode("local");
  setText(document.getElementById("productsTableTitle"), "Prijsregistraties");
  setTableHead(
    "<tr><th>#</th><th>Product</th><th>Categorie</th><th>Merk</th><th>Verpakking</th><th>Winkel</th><th>Prijs</th><th>Actie</th></tr>",
  );

  const items = filterByOptions(
    filterItems(state.prices, query, [
      "product_name",
      "category",
      "brand",
      "store_name",
      "location",
      "unit",
    ]),
    selectedFilters,
  );
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
    product_id: item.product_id,
    variant_id: item.variant_id,
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
        '<td><div class="row-actions">' +
        '<button type="button" class="row-add-button" data-add-local="' +
        index +
        '">Voeg toe</button>' +
        renderPriceAlertButton(item, "local", index) +
        renderFavoriteButton(item, "local", index) +
        "</div></td>" +
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
    "Publieke\nproductenlijst",
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
    product_id: item.product_id,
    official_price_id: item.official_price_id,
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
        '<td><div class="row-actions">' +
        '<button type="button" class="row-add-button" data-add-official="' +
        index +
        '">Voeg toe</button>' +
        renderPriceAlertButton(item, "official", index) +
        renderFavoriteButton(item, "official", index) +
        "</div></td>" +
        "</tr>",
    )
    .join("");

  bindProductRowButtons();
  updateProductStats(items.length);
}

function renderFavorites(query) {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  if (!hasAuthToken()) {
    table.innerHTML =
      '<tr><td colspan="8">Log in om je favorieten te bekijken.</td></tr>';
    updateProductStats(0);
    return;
  }

  const items = filterItems(state.favorites, query, [
    "product_name",
    "category",
    "brand",
    "store_name",
    "unit",
  ]);

  if (!items.length) {
    table.innerHTML = '<tr><td colspan="8">Geen favorieten gevonden.</td></tr>';
    updateProductStats(0);
    return;
  }

  state.renderedFavoriteProducts = items.map((item, index) => ({
    key: "favorite-" + (item.favorites_id || index),
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    category: item.category || "Algemeen",
    unit: getPackageText(item),
    price: Number(item.price) || 0,
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
        "</strong></td>" +
        '<td class="price">' +
        formatCurrency(item.price || 0) +
        "</td>" +
        '<td><div class="row-actions">' +
        '<button type="button" class="row-add-button" data-add-favorite="' +
        index +
        '">Voeg toe</button>' +
        renderPriceAlertButton(item, "favorite", index) +
        renderFavoriteButton(item, "favorite", index) +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  bindFavoriteRowButtons();
  updateProductStats(items.length);
}

function renderPriceAlerts(query) {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  if (!hasAuthToken()) {
    table.innerHTML =
      '<tr><td colspan="8">Log in om je prijsalerts te bekijken.</td></tr>';
    updateProductStats(0);
    return;
  }

  const items = filterItems(state.priceAlerts, query, [
    "product_name",
    "category",
    "brand",
    "store_name",
    "unit",
    "package_label",
  ]);

  if (!items.length) {
    table.innerHTML =
      '<tr><td colspan="8">Geen prijsalerts gevonden.</td></tr>';
    updateProductStats(0);
    return;
  }

  state.renderedAlertProducts = items;
  table.innerHTML = items
    .map((item, index) => {
      const packageText = getPackageText(item);
      const currentPrice = Number(item.current_price);
      const targetPrice = Number(item.target_price);
      const hasCurrentPrice = Number.isFinite(currentPrice);

      return (
        "<tr>" +
        "<td>" +
        (index + 1) +
        "</td>" +
        "<td><strong>" +
        escapeHtml(item.product_name) +
        '</strong><span class="muted">' +
        escapeHtml(item.brand || "") +
        "</span></td>" +
        "<td>" +
        escapeHtml(item.category || "Algemeen") +
        "</td>" +
        "<td>" +
        escapeHtml(packageText || "Niet ingevuld") +
        "</td>" +
        '<td class="price">' +
        (hasCurrentPrice ? formatCurrency(currentPrice) : "Onbekend") +
        '<span class="muted">' +
        escapeHtml(item.store_name || "") +
        "</span></td>" +
        '<td class="price">' +
        formatCurrency(targetPrice) +
        "</td>" +
        "<td>" +
        renderAlertStatus(item) +
        "</td>" +
        '<td><div class="row-actions alert-row-actions">' +
        '<button type="button" class="row-remove-alert-button" data-remove-alert="' +
        index +
        '">Verwijder alert</button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  bindAlertRowButtons();
  updateProductStats(items.length);
}

function bindProductRowButtons() {
  const table = document.getElementById("pricesTable");
  if (!table) return;

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

  table.querySelectorAll("[data-fav-local]").forEach((button) => {
    button.addEventListener("click", () => {
      const product =
        state.renderedLocalProducts[Number(button.dataset.favLocal)];
      toggleFavorite(product);
    });
  });

  table.querySelectorAll("[data-fav-official]").forEach((button) => {
    button.addEventListener("click", () => {
      const product =
        state.renderedOfficialProducts[Number(button.dataset.favOfficial)];
      toggleFavorite(product);
    });
  });

  table.querySelectorAll("[data-alert-local]").forEach((button) => {
    button.addEventListener("click", () => {
      showPriceAlertDialog(
        state.renderedLocalProducts[Number(button.dataset.alertLocal)],
      );
    });
  });

  table.querySelectorAll("[data-alert-official]").forEach((button) => {
    button.addEventListener("click", () => {
      showPriceAlertDialog(
        state.renderedOfficialProducts[Number(button.dataset.alertOfficial)],
      );
    });
  });
}

function bindFavoriteRowButtons() {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  table.querySelectorAll("[data-add-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      state.budget.addProduct(
        state.renderedFavoriteProducts[Number(button.dataset.addFavorite)],
        1,
      );
      updateProductStats(document.querySelectorAll("#pricesTable tr").length);
    });
  });

  table.querySelectorAll("[data-fav-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      const product =
        state.renderedFavoriteProducts[Number(button.dataset.favFavorite)];
      toggleFavorite(product);
    });
  });

  table.querySelectorAll("[data-alert-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      showPriceAlertDialog(
        state.renderedFavoriteProducts[Number(button.dataset.alertFavorite)],
      );
    });
  });
}

function bindAlertRowButtons() {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  table.querySelectorAll("[data-remove-alert]").forEach((button) => {
    button.addEventListener("click", () => {
      removePriceAlert(
        state.renderedAlertProducts[Number(button.dataset.removeAlert)],
      );
    });
  });
}

function updateProductStats(visibleCount) {
  setText(document.getElementById("localPriceTotal"), state.prices.length);
  setText(
    document.getElementById("officialPriceTotal"),
    state.officialProducts.length,
  );
  setText(document.getElementById("favoritesTotal"), state.favorites.length);
  setText(document.getElementById("alertsTotal"), state.priceAlerts.length);
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
  document
    .getElementById("favoritesButton")
    ?.classList.toggle("active", state.productMode === "favorites");
  document
    .getElementById("priceAlertsButton")
    ?.classList.toggle("active", state.productMode === "alerts");
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
  section.classList.toggle("is-favorites", mode === "favorites");
  section.classList.toggle("is-alerts", mode === "alerts");
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

function filterByOptions(items, selectedFilters) {
  return items.filter((item) => {
    const matchesProduct =
      !selectedFilters.product ||
      item.product_name === selectedFilters.product;
    const matchesCategory =
      !selectedFilters.category ||
      (item.category || "Algemeen") === selectedFilters.category;
    const matchesBrand =
      !selectedFilters.brand ||
      getBrandValue(item) === selectedFilters.brand;
    const matchesStore =
      !selectedFilters.store ||
      getStoreValue(item) === selectedFilters.store;

    return matchesProduct && matchesCategory && matchesBrand && matchesStore;
  });
}

function populateProductFilters() {
  const sourceItems =
    state.productMode === "official" ? state.officialProducts : state.prices;
  const brandValues =
    state.productMode === "official"
      ? []
      : getUniqueValues(sourceItems, getBrandValue);

  populateSelect(
    "productFilter",
    "Alle producten",
    getUniqueValues(sourceItems, (item) => item.product_name),
  );
  populateSelect(
    "categoryFilter",
    "Alle categorieen",
    getUniqueValues(sourceItems, (item) => item.category || "Algemeen"),
  );
  populateSelect("brandFilter", "Alle merken", brandValues);
  populateSelect(
    "storeFilter",
    state.productMode === "official" ? "Alle importeurs" : "Alle winkels",
    getUniqueValues(sourceItems, getStoreValue),
  );

  const brandFilter = document.getElementById("brandFilter");
  if (brandFilter) brandFilter.disabled = state.productMode === "official";
}

function clearProductFilters() {
  const searchInput = document.getElementById("searchInput");
  const filters = [
    document.getElementById("productFilter"),
    document.getElementById("categoryFilter"),
    document.getElementById("brandFilter"),
    document.getElementById("storeFilter"),
  ];

  if (searchInput) searchInput.value = "";
  filters.forEach((filter) => {
    if (filter) filter.value = "";
  });
  renderCurrentProductTable();
}

function getSelectedProductFilters() {
  return {
    product: document.getElementById("productFilter")?.value || "",
    category: document.getElementById("categoryFilter")?.value || "",
    brand: document.getElementById("brandFilter")?.value || "",
    store: document.getElementById("storeFilter")?.value || "",
  };
}

function populateSelect(id, defaultLabel, values) {
  const select = document.getElementById(id);
  if (!select) return;

  const selectedValue = select.value;
  select.innerHTML =
    '<option value="">' +
    escapeHtml(defaultLabel) +
    "</option>" +
    values
      .map(
        (value) =>
          '<option value="' +
          escapeHtml(value) +
          '">' +
          escapeHtml(value) +
          "</option>",
      )
      .join("");

  if (values.includes(selectedValue)) {
    select.value = selectedValue;
  }
}

function getUniqueValues(items, getValue) {
  return [
    ...new Set(
      items.map(getValue).filter((value) => value !== null && value !== ""),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function getBrandValue(item) {
  return item.brand || "Onbekend";
}

function getStoreValue(item) {
  return state.productMode === "official"
    ? item.importer_name || "Onbekend"
    : item.store_name || "Onbekend";
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

async function toggleFavorite(product) {
  if (!product || (!product.product_id && !product.product_name)) {
    return;
  }

  if (!hasAuthToken()) {
    window.location.href = "login.html";
    return;
  }

  const productId = Number(product.product_id);
  const productName = String(product.product_name || "").trim();
  const isFavorited = isProductFavorited(product);
  const payload = productId
    ? { product_id: productId }
    : { product_name: productName, category: product.category || null };

  if (isFavorited) {
    await fetchJsonWithAuth("/api/favorites/remove", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    state.favoritedIds.delete(productId);
    state.favoritedNames.delete(normalizeFavoriteName(productName));
  } else {
    const savedFavorite = await fetchJsonWithAuth("/api/favorites/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (savedFavorite.product_id) {
      product.product_id = savedFavorite.product_id;
      syncProductId(productName, savedFavorite.product_id);
      state.favoritedIds.add(Number(savedFavorite.product_id));
    }
    state.favoritedNames.add(normalizeFavoriteName(productName));
  }

  await loadFavorites();
  renderCurrentProductTable();
}

async function loadFavorites() {
  if (!hasAuthToken()) {
    state.favorites = [];
    state.favoritedIds = new Set();
    state.favoritedNames = new Set();
    setText(document.getElementById("favoritesTotal"), 0);
    return;
  }

  try {
    const favorites = await fetchJsonWithAuth("/api/favorites");
    state.favorites = favorites;
    state.favoritedIds = new Set(
      favorites.map((item) => Number(item.product_id)).filter(Boolean),
    );
    state.favoritedNames = new Set(
      favorites.map((item) => normalizeFavoriteName(item.product_name)),
    );
    setText(document.getElementById("favoritesTotal"), favorites.length);
  } catch (error) {
    state.favorites = [];
    state.favoritedIds = new Set();
    state.favoritedNames = new Set();
    setText(document.getElementById("favoritesTotal"), 0);
  }
}

async function loadPriceAlerts() {
  if (!hasAuthToken()) {
    state.priceAlerts = [];
    state.alertKeys = new Set();
    setText(document.getElementById("alertsTotal"), 0);
    return;
  }

  try {
    const alerts = await fetchJsonWithAuth("/api/price-alerts");
    state.priceAlerts = alerts;
    state.alertKeys = new Set(alerts.map(getAlertKey));
    setText(document.getElementById("alertsTotal"), alerts.length);
  } catch (error) {
    state.priceAlerts = [];
    state.alertKeys = new Set();
    setText(document.getElementById("alertsTotal"), 0);
  }
}

async function removePriceAlert(alert) {
  const alertId = Number(alert && alert.alert_id);
  if (!alertId) return;

  await fetchJsonWithAuth("/api/price-alerts/" + alertId, {
    method: "DELETE",
  });

  await loadPriceAlerts();
  renderCurrentProductTable();
}

async function showTriggeredPriceAlerts() {
  if (!hasAuthToken()) return;

  try {
    const alerts = await fetchJsonWithAuth("/api/price-alerts/triggered");
    if (!alerts.length) return;
    renderTriggeredPriceAlerts(alerts);
  } catch (error) {
    // Price alerts should never block the product table.
  }
}

function renderFavoriteButton(product, source, index) {
  const active = isProductFavorited(product);
  const label = active ? "Verwijder favoriet" : "Voeg toe aan favorieten";
  const symbol = active ? "&hearts;" : "&#9825;";

  return (
    '<button type="button" class="row-fav-button' +
    (active ? " active" : "") +
    '" data-fav-' +
    source +
    '="' +
    index +
    '" aria-label="' +
    label +
    '"' +
    ">" +
    symbol +
    "</button>"
  );
}

function renderPriceAlertButton(product, source, index) {
  const active = isPriceAlertActive(product);
  const label = active ? "Prijsalert actief" : "Maak prijsalert";

  return (
    '<button type="button" class="row-alert-button' +
    (active ? " active" : "") +
    '" data-alert-' +
    source +
    '="' +
    index +
    '" aria-label="' +
    label +
    '">' +
    (active ? "Alert aan" : "Prijsalert") +
    "</button>"
  );
}

function renderAlertStatus(alert) {
  const className = alert.triggered ? "alert-status reached" : "alert-status";
  const label = alert.triggered ? "Doel bereikt" : "Actief";

  return '<span class="' + className + '">' + label + "</span>";
}

function isProductFavorited(product) {
  if (!product) return false;

  const id = Number(product.product_id);
  return (
    (id && state.favoritedIds.has(id)) ||
    state.favoritedNames.has(normalizeFavoriteName(product.product_name))
  );
}

function normalizeFavoriteName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function syncProductId(productName, productId) {
  const normalizedName = normalizeFavoriteName(productName);
  if (!normalizedName || !productId) return;

  [
    state.prices,
    state.officialProducts,
    state.favorites,
    state.priceAlerts,
  ].forEach((items) => {
    items.forEach((item) => {
      if (normalizeFavoriteName(item.product_name) === normalizedName) {
        item.product_id = productId;
      }
    });
  });
}

function createPriceAlertUi() {
  if (document.getElementById("priceAlertDialog")) return;

  const dialog = document.createElement("div");
  dialog.id = "priceAlertDialog";
  dialog.className = "price-alert-dialog";
  dialog.setAttribute("aria-hidden", "true");
  dialog.innerHTML =
    '<div class="price-alert-card" role="dialog" aria-modal="true" aria-labelledby="priceAlertTitle">' +
    '<div class="price-alert-heading">' +
    '<div><p class="eyebrow">Prijsalert</p><h2 id="priceAlertTitle">Doelprijs instellen</h2></div>' +
    '<button type="button" class="price-alert-close" id="priceAlertClose" aria-label="Sluiten">x</button>' +
    "</div>" +
    '<p id="priceAlertProduct" class="price-alert-product"></p>' +
    '<label for="priceAlertTarget">Meld wanneer de prijs maximaal is</label>' +
    '<div class="price-alert-input"><span>SRD</span><input type="number" min="0.01" step="0.01" id="priceAlertTarget" /></div>' +
    '<div id="priceAlertMessage" class="price-alert-message" aria-live="polite"></div>' +
    '<div class="price-alert-actions">' +
    '<button type="button" class="table-button" id="priceAlertCancel">Annuleer</button>' +
    '<button type="button" id="priceAlertSave">Opslaan</button>' +
    "</div>" +
    "</div>";

  document.body.appendChild(dialog);

  document
    .getElementById("priceAlertClose")
    ?.addEventListener("click", hidePriceAlertDialog);
  document
    .getElementById("priceAlertCancel")
    ?.addEventListener("click", hidePriceAlertDialog);
  document
    .getElementById("priceAlertSave")
    ?.addEventListener("click", saveCurrentPriceAlert);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) hidePriceAlertDialog();
  });
}

function showPriceAlertDialog(product) {
  if (!product) return;

  if (!hasAuthToken()) {
    window.location.href = "login.html";
    return;
  }

  state.alertProduct = product;
  const dialog = document.getElementById("priceAlertDialog");
  const productText = document.getElementById("priceAlertProduct");
  const targetInput = document.getElementById("priceAlertTarget");
  const message = document.getElementById("priceAlertMessage");

  const price = Number(product.price);
  if (productText) {
    productText.textContent =
      product.product_name +
      " | huidige prijs " +
      (Number.isFinite(price) ? formatCurrency(price) : "onbekend");
  }
  if (targetInput) {
    targetInput.value = Number.isFinite(price) ? price.toFixed(2) : "";
    setTimeout(() => targetInput.focus(), 0);
  }
  if (message) {
    message.textContent = "";
    message.className = "price-alert-message";
  }

  dialog?.classList.add("show");
  dialog?.setAttribute("aria-hidden", "false");
}

function hidePriceAlertDialog() {
  const dialog = document.getElementById("priceAlertDialog");
  dialog?.classList.remove("show");
  dialog?.setAttribute("aria-hidden", "true");
  state.alertProduct = null;
}

async function saveCurrentPriceAlert() {
  const product = state.alertProduct;
  const targetInput = document.getElementById("priceAlertTarget");
  const message = document.getElementById("priceAlertMessage");
  const targetPrice = Number(targetInput?.value);

  if (!product || !Number.isFinite(targetPrice) || targetPrice <= 0) {
    showPriceAlertMessage("Vul een geldige doelprijs in.", "error");
    return;
  }

  try {
    await fetchJsonWithAuth("/api/price-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: product.product_id || null,
        product_name: product.product_name,
        category: product.category || null,
        variant_id: product.variant_id || null,
        target_price: targetPrice,
      }),
    });
    showPriceAlertMessage("Prijsalert opgeslagen.", "success");
    await loadPriceAlerts();
    syncAlertProduct(product);
    renderCurrentProductTable();
    setTimeout(hidePriceAlertDialog, 700);
  } catch (error) {
    if (message) {
      showPriceAlertMessage("Prijsalert kon niet worden opgeslagen.", "error");
    }
  }
}

function showPriceAlertMessage(text, type) {
  const message = document.getElementById("priceAlertMessage");
  if (!message) return;

  message.textContent = text;
  message.className = "price-alert-message " + type;
}

function renderTriggeredPriceAlerts(alerts) {
  const existing = document.getElementById("triggeredPriceAlerts");
  existing?.remove();

  const panel = document.createElement("div");
  panel.id = "triggeredPriceAlerts";
  panel.className = "triggered-price-alerts";
  panel.innerHTML =
    '<div class="triggered-price-alerts-heading">' +
    "<strong>Prijsdoel bereikt</strong>" +
    '<button type="button" aria-label="Sluiten">x</button>' +
    "</div>" +
    alerts
      .map(
        (alert) =>
          '<div class="triggered-price-alert">' +
          "<strong>" +
          escapeHtml(alert.product_name) +
          "</strong>" +
          "<span>" +
          escapeHtml(alert.store_name || "Beste beschikbare prijs") +
          ": " +
          formatCurrency(alert.current_price) +
          " bij doel " +
          formatCurrency(alert.target_price) +
          "</span>" +
          "</div>",
      )
      .join("");

  document.body.appendChild(panel);
  panel.querySelector("button")?.addEventListener("click", () => panel.remove());
}

function isPriceAlertActive(product) {
  return state.alertKeys.has(getAlertKey(product));
}

function getAlertKey(product) {
  if (!product) return "";
  const productPart = product.product_id
    ? "id:" + Number(product.product_id)
    : "name:" + normalizeFavoriteName(product.product_name);
  return productPart + ":variant:" + Number(product.variant_id || 0);
}

function syncAlertProduct(product) {
  const saved = state.priceAlerts.find(
    (alert) =>
      normalizeFavoriteName(alert.product_name) ===
        normalizeFavoriteName(product.product_name) &&
      Number(alert.variant_id || 0) === Number(product.variant_id || 0),
  );

  if (saved?.product_id && !product.product_id) {
    product.product_id = saved.product_id;
    syncProductId(product.product_name, saved.product_id);
  }
}
