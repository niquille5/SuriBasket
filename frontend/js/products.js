import { fetchJson, fetchJsonWithAuth } from "./api.js";
import { escapeHtml, setText } from "./dom.js";
import { formatCurrency, getPackageText } from "./format.js";
import { warungProductCategories } from "./budget-data.js";
import { hasAuthToken } from "./auth.js";

const tableHeads = {
  local:
    "<tr><th>#</th><th>Product</th><th>Categorie</th><th>Merk</th><th>Verpakking</th><th>Winkel</th><th>Prijs</th><th>Actie</th></tr>",
  official:
    "<tr><th>#</th><th>Product</th><th>Importeur</th><th>Verpakking</th><th>Prijs</th><th>Actie</th></tr>",
  alerts:
    "<tr><th>#</th><th>Product</th><th>Categorie</th><th>Verpakking</th><th>Huidige prijs</th><th>Doelprijs</th><th>Status</th><th>Actie</th></tr>",
};

const modeButtonIds = {
  local: "localPricesButton",
  official: "officialPricesButton",
  favorites: "favoritesButton",
  alerts: "priceAlertsButton",
};

const viewButtonIds = {
  table: "tableViewButton",
  grid: "gridViewButton",
};

const modeDescriptions = {
  local:
    "Bekijk lokale prijsregistraties, filter op product of winkel en bewaar belangrijke items.",
  official:
    "Gebruik de publieke productenlijst als referentie voor richtprijzen en verpakkingen.",
  favorites:
    "Bekijk producten die je hebt bewaard. Log in om favorieten te beheren.",
  alerts:
    "Bekijk prijsalerts en verwijder alerts die je niet meer nodig hebt.",
};

const state = {
  prices: [],
  officialProducts: [],
  productMode: "local",
  viewMode: "table",
  renderedLocalProducts: [],
  renderedOfficialProducts: [],
  renderedFavoriteProducts: [],
  renderedAlertProducts: [],
  favorites: [],
  priceAlerts: [],
  alertKeys: new Set(),
  favoritedIds: new Set(),
  favoritedNames: new Set(),
  alertProduct: null,
};

export async function initProductsPage() {
  bindProductSearch();
  setViewModeButtons();
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
    populateProductFilters();
    await loadFavorites();
    await loadPriceAlerts();
    await showTriggeredPriceAlerts();
    updateProductStats(state.prices.length);
    renderCurrentProductTable();
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
  document
    .getElementById("tableViewButton")
    ?.addEventListener("click", () => switchView("table"));
  document
    .getElementById("gridViewButton")
    ?.addEventListener("click", () => switchView("grid"));
}

function switchMode(mode) {
  state.productMode = mode;
  setProductModeButtons();
  populateProductFilters();
  updateProductModeDescription();
  renderCurrentProductTable();
}

function switchView(viewMode) {
  state.viewMode = viewMode;
  setViewModeButtons();
  renderCurrentProductTable();
}

function renderCurrentProductTable() {
  const query = getSearchQuery();
  const selectedFilters = getSelectedProductFilters();

  if (state.productMode === "official") {
    setProductsTableMode("official");
    updateProductModeDescription();
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
    updateProductModeDescription();
    setText(document.getElementById("productsTableTitle"), "Favorieten");
    setTableHead(tableHeads.local);
    renderFavorites(query);
    return;
  }

  if (state.productMode === "alerts") {
    setProductsTableMode("alerts");
    updateProductModeDescription();
    setText(document.getElementById("productsTableTitle"), "Prijsalerts");
    setTableHead(tableHeads.alerts);
    renderPriceAlerts(query);
    return;
  }

  setProductsTableMode("local");
  updateProductModeDescription();
  setText(document.getElementById("productsTableTitle"), "Prijsregistraties");
  setTableHead(tableHeads.local);

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
    table.innerHTML =
      '<tr><td colspan="8">' +
      renderProductEmptyState("Geen producten gevonden.", "Pas je zoekterm of filters aan om meer resultaten te zien.") +
      "</td></tr>";
    renderProductGrid([]);
    updateProductStats(0);
    updateProductResultSummary(0);
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
    analysis: getPriceAnalysis(item, state.prices),
    available: true,
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
        renderInlinePriceInsight(item, state.prices) +
        "</td>" +
        '<td><div class="row-actions">' +
        renderPriceAlertButton(item, "local", index) +
        renderFavoriteButton(item, "local", index) +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  renderProductGrid(
    state.renderedLocalProducts,
    "local",
    (item) => [
      ["Categorie", item.category],
      ["Verpakking", item.unit],
      ["Winkel", item.store_name],
      ["Analyse", item.analysis.label],
      ["Status", getAvailabilityLabel(item)],
    ],
  );
  bindProductRowButtons();
  updateProductStats(items.length);
  updateProductResultSummary(items.length);
}

function renderOfficialPrices(items) {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  setText(
    document.getElementById("productsTableTitle"),
    "Publieke\nproductenlijst",
  );
  setTableHead(tableHeads.official);

  if (!items.length) {
    table.innerHTML =
      '<tr><td colspan="6">' +
      renderProductEmptyState("Geen publieke producten gevonden.", "Pas je zoekterm of filters aan.") +
      "</td></tr>";
    renderProductGrid([]);
    updateProductStats(0);
    updateProductResultSummary(0);
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
    analysis: getPriceAnalysis(
      { product_name: item.product_name, price: item.retail_price },
      state.officialProducts.map((product) => ({
        product_name: product.product_name,
        price: product.retail_price,
      })),
    ),
    available: true,
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
        renderInlinePriceInsight(
          { product_name: item.product_name, price: item.retail_price },
          state.officialProducts.map((product) => ({
            product_name: product.product_name,
            price: product.retail_price,
          })),
        ) +
        "</td>" +
        '<td><div class="row-actions">' +
        renderPriceAlertButton(item, "official", index) +
        renderFavoriteButton(item, "official", index) +
        "</div></td>" +
        "</tr>",
    )
    .join("");

  renderProductGrid(
    state.renderedOfficialProducts,
    "official",
    (item) => [
      ["Categorie", item.category],
      ["Verpakking", item.unit],
      ["Importeur", item.store_name],
      ["Analyse", item.analysis.label],
      ["Status", getAvailabilityLabel(item)],
    ],
  );
  bindProductRowButtons();
  updateProductStats(items.length);
  updateProductResultSummary(items.length);
}

function renderFavorites(query) {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  if (!hasAuthToken()) {
    table.innerHTML =
      '<tr><td colspan="8">' +
      renderProductEmptyState("Log in om je favorieten te bekijken.", "Favorieten worden gekoppeld aan je account.") +
      "</td></tr>";
    renderProductGrid([]);
    updateProductStats(0);
    updateProductResultSummary(0);
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
    table.innerHTML =
      '<tr><td colspan="8">' +
      renderProductEmptyState("Geen favorieten gevonden.", "Klik op het hartje bij een product om het hier terug te zien.") +
      "</td></tr>";
    renderProductGrid([]);
    updateProductStats(0);
    updateProductResultSummary(0);
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
    analysis: getPriceAnalysis(item, state.prices),
    available: true,
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
        renderInlinePriceInsight(item, state.prices) +
        "</td>" +
        '<td><div class="row-actions">' +
        renderPriceAlertButton(item, "favorite", index) +
        renderFavoriteButton(item, "favorite", index) +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");

  renderProductGrid(
    state.renderedFavoriteProducts,
    "favorite",
    (item) => [
      ["Categorie", item.category],
      ["Verpakking", item.unit],
      ["Winkel", item.store_name],
      ["Analyse", item.analysis.label],
      ["Status", getAvailabilityLabel(item)],
    ],
  );
  bindFavoriteRowButtons();
  updateProductStats(items.length);
  updateProductResultSummary(items.length);
}

function renderPriceAlerts(query) {
  const table = document.getElementById("pricesTable");
  if (!table) return;

  if (!hasAuthToken()) {
    table.innerHTML =
      '<tr><td colspan="8">' +
      renderProductEmptyState("Log in om je prijsalerts te bekijken.", "Prijsalerts worden opgeslagen bij je account.") +
      "</td></tr>";
    renderProductGrid([]);
    updateProductStats(0);
    updateProductResultSummary(0);
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
      '<tr><td colspan="8">' +
      renderProductEmptyState("Geen prijsalerts gevonden.", "Klik op Prijsalert bij een product om een doelprijs te bewaren.") +
      "</td></tr>";
    renderProductGrid([]);
    updateProductStats(0);
    updateProductResultSummary(0);
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

  renderProductGrid(
    items.map((item) => ({
      product_name: item.product_name,
      category: item.category || "Algemeen",
      brand: item.brand || "",
      unit: getPackageText(item) || "Niet ingevuld",
      price: Number(item.current_price),
      store_name: item.store_name || "",
      target_price: Number(item.target_price),
      triggered: item.triggered,
    })),
    "alerts",
    (item) => [
      ["Categorie", item.category],
      ["Verpakking", item.unit],
      ["Huidige prijs", Number.isFinite(item.price) ? formatCurrency(item.price) : "Onbekend"],
      ["Doelprijs", formatCurrency(item.target_price)],
      ["Status", item.triggered ? "Doel bereikt" : "Actief"],
    ],
  );
  bindAlertRowButtons();
  updateProductStats(items.length);
  updateProductResultSummary(items.length);
}

function renderProductGrid(items = [], source = "local", getDetails = () => []) {
  const grid = document.getElementById("productGridView");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML =
      '<div class="product-grid-empty">' +
      renderProductEmptyState("Geen producten gevonden.", "Pas je zoekterm of filters aan.") +
      "</div>";
    return;
  }

  grid.innerHTML = items
    .map((item, index) => {
      const price = Number(item.price);
      const analysis = item.analysis || getPriceAnalysis(item, state.prices);
      const details = getDetails(item)
        .filter((detail) => detail[1] !== null && detail[1] !== undefined && detail[1] !== "")
        .map(
          ([label, value]) =>
            '<span><small>' +
            escapeHtml(label) +
            '</small><strong>' +
            escapeHtml(value) +
            "</strong></span>",
        )
        .join("");
      const actions =
        source === "alerts"
          ? '<button type="button" class="row-remove-alert-button" data-remove-alert="' +
            index +
            '">Verwijder alert</button>'
          : renderPriceAlertButton(item, source, index) +
            renderFavoriteButton(item, source, index);

      return (
        '<article class="product-grid-card">' +
        '<div class="product-grid-card-heading">' +
        "<div>" +
        '<p class="eyebrow">' +
        escapeHtml(item.category || "Algemeen") +
        "</p>" +
        "<h3>" +
        escapeHtml(item.product_name) +
        "</h3>" +
        '<div class="product-card-badges">' +
        '<span class="price-badge ' +
        analysis.className +
        '">' +
        escapeHtml(analysis.label) +
        "</span>" +
        '<span class="stock-badge">' +
        escapeHtml(getAvailabilityLabel(item)) +
        "</span>" +
        "</div>" +
        "</div>" +
        '<strong class="product-grid-price">' +
        (Number.isFinite(price) ? formatCurrency(price) : "Onbekend") +
        "</strong>" +
        "</div>" +
        '<div class="product-grid-meta">' +
        details +
        "</div>" +
        '<div class="product-grid-actions">' +
        actions +
        "</div>" +
        "</article>"
      );
    })
    .join("");
}

function renderInlinePriceInsight(item, sourceItems) {
  const analysis = getPriceAnalysis(item, sourceItems);
  return (
    '<span class="price-insight ' +
    analysis.className +
    '">' +
    escapeHtml(analysis.shortLabel) +
    "</span>"
  );
}

function getPriceAnalysis(item, sourceItems) {
  const price = Number(item.price || item.retail_price);
  const matchingPrices = sourceItems
    .filter(
      (candidate) =>
        normalizeFavoriteName(candidate.product_name) ===
        normalizeFavoriteName(item.product_name),
    )
    .map((candidate) => Number(candidate.price || candidate.retail_price))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!Number.isFinite(price) || !matchingPrices.length) {
    return {
      className: "neutral",
      label: "Prijsanalyse niet beschikbaar",
      shortLabel: "Geen analyse",
    };
  }

  const average =
    matchingPrices.reduce((total, value) => total + value, 0) /
    matchingPrices.length;
  const cheapest = Math.min(...matchingPrices);

  if (price <= cheapest) {
    return {
      className: "good",
      label: "Goedkoopste optie",
      shortLabel: "Goedkoopste",
    };
  }

  if (price > average * 1.12) {
    return {
      className: "expensive",
      label: "Duurder dan gemiddeld",
      shortLabel: "Duurder dan gemiddeld",
    };
  }

  if (price < average * 0.95) {
    return {
      className: "good",
      label: "Onder gemiddelde prijs",
      shortLabel: "Onder gemiddeld",
    };
  }

  return {
    className: "average",
    label: "Rond gemiddelde prijs",
    shortLabel: "Gemiddeld",
  };
}

function getAvailabilityLabel(item) {
  const hasPrice = Number.isFinite(Number(item.price || item.current_price));
  return hasPrice ? "Beschikbaar" : "Status onbekend";
}

function bindProductRowButtons() {
  const container = document.querySelector(".products-section");
  if (!container) return;

  bindIndexedButtons(container, "favLocal", state.renderedLocalProducts, toggleFavorite);
  bindIndexedButtons(
    container,
    "favOfficial",
    state.renderedOfficialProducts,
    toggleFavorite,
  );
  bindIndexedButtons(
    container,
    "alertLocal",
    state.renderedLocalProducts,
    showPriceAlertDialog,
  );
  bindIndexedButtons(
    container,
    "alertOfficial",
    state.renderedOfficialProducts,
    showPriceAlertDialog,
  );
}

function bindFavoriteRowButtons() {
  const container = document.querySelector(".products-section");
  if (!container) return;

  bindIndexedButtons(
    container,
    "favFavorite",
    state.renderedFavoriteProducts,
    toggleFavorite,
  );
  bindIndexedButtons(
    container,
    "alertFavorite",
    state.renderedFavoriteProducts,
    showPriceAlertDialog,
  );
}

function bindAlertRowButtons() {
  const container = document.querySelector(".products-section");
  if (!container) return;

  bindIndexedButtons(
    container,
    "removeAlert",
    state.renderedAlertProducts,
    removePriceAlert,
  );
}

function bindIndexedButtons(container, dataKey, items, handler) {
  const selector = "[data-" + toKebabCase(dataKey) + "]";

  container.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", () => {
      const item = items[Number(button.dataset[dataKey])];
      if (item) handler(item);
    });
  });
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
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
  updateFilterSummary();
}

function setProductModeButtons() {
  setActiveButton(modeButtonIds, state.productMode);
}

function setViewModeButtons() {
  setActiveButton(viewButtonIds, state.viewMode);

  const tableWrap = document.querySelector(".products-section .table-wrap");
  const gridView = document.getElementById("productGridView");
  if (tableWrap) tableWrap.hidden = state.viewMode === "grid";
  if (gridView) gridView.hidden = state.viewMode !== "grid";
  setText(
    document.getElementById("productViewHint"),
    state.viewMode === "table"
      ? "Tabel toont prijzen naast elkaar voor snel vergelijken."
      : "Grid toont producten als kaarten voor rustig scannen.",
  );
}

function setActiveButton(buttonIdsByValue, activeValue) {
  Object.entries(buttonIdsByValue).forEach(([value, buttonId]) => {
    const button = document.getElementById(buttonId);
    if (!button) return;

    const isActive = value === activeValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
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

function getSearchQuery() {
  return document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
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
  updateFilterSummary();
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
    '<tr><td colspan="8">' +
    renderProductEmptyState("Kan geen verbinding maken met de backend.", "Start de backend opnieuw en vernieuw deze pagina.") +
    "</td></tr>";
  renderProductGrid([], "offline");
  updateProductResultSummary(0);
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

  setProductBusyState(true);

  try {
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
  } finally {
    setProductBusyState(false);
  }
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

  setProductBusyState(true);

  try {
    await fetchJsonWithAuth("/api/price-alerts/" + alertId, {
      method: "DELETE",
    });

    await loadPriceAlerts();
    renderCurrentProductTable();
  } finally {
    setProductBusyState(false);
  }
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
    '" title="' +
    label +
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
    '" title="' +
    label +
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

  const saveButton = document.getElementById("priceAlertSave");
  if (saveButton) saveButton.disabled = true;

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
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

function updateProductModeDescription() {
  setText(
    document.getElementById("productModeDescription"),
    modeDescriptions[state.productMode] || modeDescriptions.local,
  );
}

function updateProductResultSummary(visibleCount) {
  const label = getModeLabel(state.productMode).toLowerCase();
  setText(
    document.getElementById("productResultSummary"),
    visibleCount === 1
      ? "1 resultaat zichtbaar in " + label + "."
      : visibleCount + " resultaten zichtbaar in " + label + ".",
  );
}

function updateFilterSummary() {
  const query = getSearchQuery();
  const filters = getSelectedProductFilters();
  const active = [];

  if (query) active.push('zoekterm "' + query + '"');
  if (filters.product) active.push("product");
  if (filters.category) active.push("categorie");
  if (filters.brand) active.push("merk");
  if (filters.store) {
    active.push(state.productMode === "official" ? "importeur" : "winkel");
  }

  setText(
    document.getElementById("productFilterSummary"),
    active.length
      ? active.length + " filter" + (active.length === 1 ? "" : "s") + " actief: " + active.join(", ") + "."
      : "Geen filters actief.",
  );
}

function getModeLabel(mode) {
  return {
    local: "Eigen database",
    official: "Publieke productenlijst",
    favorites: "Favorieten",
    alerts: "Prijsalerts",
  }[mode] || "Producten";
}

function renderProductEmptyState(title, detail) {
  return (
    '<div class="product-empty-state">' +
    "<strong>" +
    escapeHtml(title) +
    "</strong>" +
    "<span>" +
    escapeHtml(detail) +
    "</span>" +
    "</div>"
  );
}

function setProductBusyState(isBusy) {
  document
    .querySelectorAll(
      ".row-fav-button, .row-alert-button, .row-remove-alert-button",
    )
    .forEach((button) => {
      button.disabled = isBusy;
    });
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
