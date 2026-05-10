import { renderLayout } from "./layout.js";

renderLayout();

const API_BASE_URL = "http://localhost:3000";

const state = {
  prices: [],
  officialProducts: [],
  products: [],
  productMode: "local",
  budgetProducts: [],
  budgetItems: [],
  renderedLocalProducts: [],
  renderedOfficialProducts: []
};

const budgetPresets = {
  starter: [
    { match: "Rijst", quantity: 2 },
    { match: "Olie", quantity: 2 },
    { match: "Suiker", quantity: 2 },
    { match: "Zout", quantity: 1 },
    { match: "Uien", quantity: 2 },
    { match: "Aardappelen", quantity: 2 }
  ],
  kitchen: [
    { match: "Knoflook", quantity: 1 },
    { match: "Zout", quantity: 1 },
    { match: "Uien", quantity: 2 },
    { match: "Aardappelen", quantity: 2 },
    { match: "Gele erwten", quantity: 1 },
    { match: "Bruine bonen", quantity: 1 },
    { match: "Sardien", quantity: 3 },
    { match: "Thee", quantity: 1 }
  ],
  month: [
    { match: "Rijst", quantity: 4 },
    { match: "Olie", quantity: 4 },
    { match: "Suiker", quantity: 4 },
    { match: "Zout", quantity: 2 },
    { match: "Uien", quantity: 4 },
    { match: "Aardappelen", quantity: 4 },
    { match: "Knoflook", quantity: 2 },
    { match: "Gele erwten", quantity: 2 },
    { match: "Groene erwten", quantity: 2 },
    { match: "Bruine bonen", quantity: 2 },
    { match: "Sardien", quantity: 6 },
    { match: "Thee", quantity: 2 },
    { match: "Kip", quantity: 2 },
    { match: "Melk", quantity: 2 }
  ]
};

const budgetAllowedCategories = [
  "Basisproducten",
  "Conserven",
  "Dranken",
  "Groente",
  "Olie",
  "Peulvruchten",
  "Specerij",
  "Vlees",
  "Voeding",
  "Zuivel"
];

const els = {
  apiStatus: document.getElementById("apiStatus"),
  healthText: document.getElementById("healthText"),
  statusDot: document.querySelector(".status-dot"),
  productCount: document.getElementById("productCount"),
  priceCount: document.getElementById("priceCount"),
  storeCount: document.getElementById("storeCount"),
  variantCount: document.getElementById("variantCount"),
  officialCount: document.getElementById("officialCount"),
  importerCount: document.getElementById("importerCount"),
  productsTableTitle: document.getElementById("productsTableTitle"),
  pricesTableHead: document.getElementById("pricesTableHead"),
  pricesTable: document.getElementById("pricesTable"),
  searchInput: document.getElementById("searchInput"),
  localPricesButton: document.getElementById("localPricesButton"),
  officialPricesButton: document.getElementById("officialPricesButton"),
  localPriceTotal: document.getElementById("localPriceTotal"),
  officialPriceTotal: document.getElementById("officialPriceTotal"),
  visiblePriceTotal: document.getElementById("visiblePriceTotal"),
  noteItemTotal: document.getElementById("noteItemTotal"),
  productSuggestions: document.getElementById("productSuggestions"),
  priceForm: document.getElementById("priceForm"),
  productInput: document.getElementById("productInput"),
  priceInput: document.getElementById("priceInput"),
  result: document.getElementById("result"),
  budgetProductSelect: document.getElementById("budgetProductSelect"),
  budgetQuantityInput: document.getElementById("budgetQuantityInput"),
  addBudgetItemButton: document.getElementById("addBudgetItemButton"),
  clearBudgetButton: document.getElementById("clearBudgetButton"),
  copyBudgetButton: document.getElementById("copyBudgetButton"),
  budgetTable: document.getElementById("budgetTable"),
  budgetTotal: document.getElementById("budgetTotal"),
  budgetCount: document.getElementById("budgetCount"),
  budgetMessage: document.getElementById("budgetMessage"),
  budgetNotePanel: document.getElementById("budgetNotePanel"),
  budgetNoteToggle: document.getElementById("budgetNoteToggle"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginMessage: document.getElementById("loginMessage"),
  adminStatus: document.getElementById("adminStatus"),
  adminOverview: document.getElementById("adminOverview"),
  logoutButton: document.getElementById("logoutButton")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindGlobalLogout();
  checkHealth();

  if (document.body.dataset.page === "dashboard") {
    loadDashboard();
  }

  if (document.body.dataset.page === "products") {
    loadPrices();
    bindProductSearch();
    bindBudgetTools();
  }

  if (document.body.dataset.page === "scanner") {
    loadProducts();
    bindPriceForm();
  }

  if (document.body.dataset.page === "budget") {
    loadBudgetProducts();
    bindBudgetTools();
  }

  if (document.body.dataset.page === "login") {
    redirectLoggedInUser();
    bindLoginForm();
  }

  if (document.body.dataset.page === "admin") {
    loadAdminOverview();
    bindLogout();
  }
}

async function checkHealth() {
  try {
    await fetchJson("/api/health");
    setApiStatus(true);
  } catch (error) {
    setApiStatus(false);
  }
}

async function loadDashboard() {
  try {
    const summary = await fetchJson("/api/summary");

    setText(els.productCount, summary.products);
    setText(els.priceCount, summary.prices);
    setText(els.storeCount, summary.stores);
    setText(els.variantCount, summary.variants);
    setText(els.officialCount, summary.official_products);
    setText(els.importerCount, summary.importers);
  } catch (error) {
    setText(els.productCount, "0");
    setText(els.priceCount, "0");
    setText(els.storeCount, "0");
    setText(els.variantCount, "0");
    setText(els.officialCount, "0");
    setText(els.importerCount, "0");
  }
}

async function loadProducts() {
  try {
    state.products = await fetchJson("/api/products");
    renderProductSuggestions(state.products);
  } catch (error) {
    renderProductSuggestions([]);
  }
}

async function loadPrices() {
  try {
    const [prices, officialProducts] = await Promise.all([
      fetchJson("/api/prices"),
      fetchJson("/api/official-products")
    ]);

    state.prices = prices;
    state.officialProducts = officialProducts;
    state.budgetProducts = buildBudgetProducts(prices);
    updateProductStats(prices.length);
    renderCurrentProductTable();
    renderBudget();
  } catch (error) {
    renderOfflineTable();
  }
}

async function loadBudgetProducts() {
  try {
    const prices = await fetchJson("/api/prices");
    state.budgetProducts = buildBudgetProducts(prices);
    renderBudgetProductOptions();
    renderBudget();
  } catch (error) {
    if (els.budgetProductSelect) {
      els.budgetProductSelect.innerHTML = `<option value="">Backend niet bereikbaar</option>`;
    }
    showBudgetMessage("error", "Kan geen prijzen laden. Start de backend met npm start.");
  }
}

function bindProductSearch() {
  if (!els.searchInput) {
    return;
  }

  els.searchInput.addEventListener("input", () => {
    renderCurrentProductTable();
  });

  if (els.localPricesButton) {
    els.localPricesButton.addEventListener("click", () => {
      state.productMode = "local";
      setProductModeButtons();
      renderCurrentProductTable();
    });
  }

  if (els.officialPricesButton) {
    els.officialPricesButton.addEventListener("click", () => {
      state.productMode = "official";
      setProductModeButtons();
      renderCurrentProductTable();
    });
  }
}

function bindPriceForm() {
  if (!els.priceForm) {
    return;
  }

  els.priceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const product = els.productInput.value.trim();
    const price = Number(els.priceInput.value);

    if (!product || !price || price <= 0) {
      showResult("error", "Vul een productnaam en een geldige prijs in.");
      return;
    }

    try {
      const data = await fetchJson(`/api/check-price/${encodeURIComponent(product)}/${price}`);
      showPriceResult(data);
    } catch (error) {
      showResult("error", "Product niet gevonden of de backend staat nog uit.");
    }
  });
}

function bindBudgetTools() {
  if (els.addBudgetItemButton) {
    els.addBudgetItemButton.addEventListener("click", () => {
      const key = els.budgetProductSelect.value;
      const quantity = Number(els.budgetQuantityInput.value);

      if (!key || !quantity || quantity <= 0) {
        showBudgetMessage("error", "Kies een product en vul een geldig aantal in.");
        return;
      }

      addBudgetItem(key, quantity);
    });
  }

  if (els.clearBudgetButton) {
    els.clearBudgetButton.addEventListener("click", () => {
      state.budgetItems = [];
      renderBudget();
      showBudgetMessage("average", "Begroting leeggemaakt.");
    });
  }

  if (els.copyBudgetButton) {
    els.copyBudgetButton.addEventListener("click", copyBudgetSummary);
  }

  if (els.budgetNoteToggle) {
    els.budgetNoteToggle.addEventListener("click", toggleBudgetNote);
  }

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      loadBudgetPreset(button.dataset.preset);
    });
  });
}

function toggleBudgetNote() {
  const isMinimized = els.budgetNotePanel.classList.toggle("is-minimized");
  els.budgetNoteToggle.textContent = isMinimized ? "Open" : "Minimaliseer";
  els.budgetNoteToggle.setAttribute("aria-expanded", String(!isMinimized));
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function fetchJsonWithAuth(path, options = {}) {
  const token = localStorage.getItem("authToken");
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function bindLoginForm() {
  if (!els.loginForm) {
    return;
  }

  els.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = els.loginUsername.value.trim();
    const password = els.loginPassword.value;

    if (!username || !password) {
      showLoginMessage("error", "Vul gebruikersnaam en wachtwoord in.");
      return;
    }

    try {
      const data = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!data.ok) {
        throw new Error("Login failed");
      }

      const result = await data.json();
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("authUser", JSON.stringify(result.user));
      showLoginMessage("good", "Login gelukt. Je wordt doorgestuurd.");

      window.setTimeout(() => {
        window.location.href = "admin.html";
      }, 600);
    } catch (error) {
      showLoginMessage("error", "Ongeldige gebruikersnaam of wachtwoord.");
    }
  });
}

function redirectLoggedInUser() {
  if (localStorage.getItem("authToken")) {
    window.location.href = "admin.html";
  }
}

function bindLogout() {
  if (!els.logoutButton) {
    return;
  }

  els.logoutButton.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    window.location.href = "login.html";
  });
}

function bindGlobalLogout() {
  const logoutButton = document.getElementById("navLogoutButton");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    window.location.href = "login.html";
  });
}

async function loadAdminOverview() {
  if (!els.adminStatus || !els.adminOverview) {
    return;
  }

  try {
    const data = await fetchJsonWithAuth("/api/admin/overview");
    els.adminStatus.className = "result show good";
    els.adminStatus.innerHTML = `<strong>${escapeHtml(data.message)}</strong><p>Rol: ${escapeHtml(data.role)}</p>`;
    els.adminOverview.innerHTML = `
      <a href="producten.html"><strong>${data.summary.products}</strong><span>producten</span></a>
      <a href="producten.html"><strong>${data.summary.variants}</strong><span>varianten</span></a>
      <a href="producten.html"><strong>${data.summary.stores}</strong><span>winkels</span></a>
      <a href="producten.html"><strong>${data.summary.prices}</strong><span>prijsmetingen</span></a>
    `;
  } catch (error) {
    els.adminStatus.className = "result show error";
    els.adminStatus.innerHTML = "<strong>Geen toegang. Log eerst in als admin.</strong>";
    els.adminOverview.innerHTML = `<a href="login.html"><strong>Login vereist</strong><span>Ga naar de loginpagina.</span></a>`;
  }
}

function showLoginMessage(type, message) {
  if (!els.loginMessage) {
    return;
  }

  els.loginMessage.className = `result show ${type}`;
  els.loginMessage.innerHTML = `<strong>${escapeHtml(message)}</strong>`;
}

function renderProductSuggestions(items) {
  if (!els.productSuggestions) {
    return;
  }

  const names = [...new Set(items.map((item) => item.product_name).filter(Boolean))].sort();

  els.productSuggestions.innerHTML = names
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function buildBudgetProducts(prices) {
  const map = new Map();

  prices.forEach((item) => {
    if (!budgetAllowedCategories.includes(item.category || "")) {
      return;
    }

    const key = item.product_name;
    const price = Number(item.price);

    if (!key || Number.isNaN(price)) {
      return;
    }

    if (!map.has(key)) {
      map.set(key, {
        key,
        product_name: item.product_name,
        category: item.category || "Algemeen",
        unit: getPackageText(item),
        price,
        store_name: item.store_name || "Onbekend"
      });
      return;
    }

    const current = map.get(key);
    if (price < current.price) {
      current.price = price;
      current.store_name = item.store_name || current.store_name;
      current.unit = getPackageText(item) || current.unit;
    }
  });

  return [...map.values()].sort((a, b) => a.product_name.localeCompare(b.product_name));
}

function renderBudgetProductOptions() {
  if (!els.budgetProductSelect) {
    return;
  }

  if (!state.budgetProducts.length) {
    els.budgetProductSelect.innerHTML = `<option value="">Geen producten gevonden</option>`;
    return;
  }

  els.budgetProductSelect.innerHTML = `
    <option value="">Kies een product</option>
    ${state.budgetProducts
      .map((item) => {
        return `<option value="${escapeHtml(item.key)}">${escapeHtml(item.product_name)} - ${formatCurrency(item.price)}</option>`;
      })
      .join("")}
  `;
}

function addBudgetItem(key, quantity) {
  const product = state.budgetProducts.find((item) => item.key === key);
  addBudgetProduct(product, quantity);
}

function addBudgetProduct(product, quantity = 1) {
  if (!product) {
    showBudgetMessage("error", "Product niet gevonden.");
    return;
  }

  const existing = state.budgetItems.find((item) => item.key === product.key);

  if (existing) {
    existing.quantity += quantity;
  } else {
    state.budgetItems.push({
      ...product,
      quantity
    });
  }

  renderBudget();
  showBudgetMessage("good", `${product.product_name} toegevoegd.`);
}

function loadBudgetPreset(presetName) {
  const preset = budgetPresets[presetName] || [];

  preset.forEach((entry) => {
    const product = findBudgetProduct(entry.match);

    if (product) {
      addBudgetItem(product.key, entry.quantity);
    }
  });

  renderBudget();
  showBudgetMessage("good", "Pakket toegevoegd aan je begroting.");
}

function findBudgetProduct(match) {
  const needle = match.toLowerCase();

  return state.budgetProducts.find((item) =>
    item.product_name.toLowerCase().includes(needle)
  );
}

function renderBudget() {
  if (!els.budgetTable) {
    return;
  }

  if (!state.budgetItems.length) {
    els.budgetTable.innerHTML = els.budgetTable.tagName === "TBODY"
      ? `<tr><td colspan="6">Kies een pakket of voeg producten toe.</td></tr>`
      : `<p class="muted">Klik op + bij een product om het hier te plaatsen.</p>`;
    setText(els.budgetTotal, "SRD 0,00");
    setText(els.budgetCount, "0 producten geselecteerd");
    setText(els.noteItemTotal, "0");
    return;
  }

  if (els.budgetTable.tagName !== "TBODY") {
    renderBudgetNotes();
    return;
  }

  els.budgetTable.innerHTML = state.budgetItems
    .map((item) => {
      const subtotal = item.price * item.quantity;

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.product_name)}</strong>
            <span class="muted">${escapeHtml(item.store_name)} | ${escapeHtml(item.unit)}</span>
          </td>
          <td>${escapeHtml(item.category)}</td>
          <td class="price">${formatCurrency(item.price)}</td>
          <td>
            <input class="quantity-input" type="number" min="1" step="1" value="${item.quantity}" data-budget-key="${escapeHtml(item.key)}">
          </td>
          <td class="price">${formatCurrency(subtotal)}</td>
          <td><button type="button" class="table-button" data-remove-budget="${escapeHtml(item.key)}">Verwijder</button></td>
        </tr>
      `;
    })
    .join("");

  bindBudgetTableControls();

  const total = state.budgetItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  setText(els.budgetTotal, formatCurrency(total));
  setText(els.budgetCount, `${state.budgetItems.length} producten geselecteerd`);
  setText(els.noteItemTotal, state.budgetItems.length);
}

function bindBudgetTableControls() {
  els.budgetTable.querySelectorAll("[data-budget-key]").forEach((input) => {
    input.addEventListener("input", () => {
      updateBudgetQuantity(input.dataset.budgetKey, Number(input.value));
    });
  });

  els.budgetTable.querySelectorAll("[data-remove-budget]").forEach((button) => {
    button.addEventListener("click", () => {
      removeBudgetItem(button.dataset.removeBudget);
    });
  });
}

function renderBudgetNotes() {
  els.budgetTable.innerHTML = state.budgetItems
    .map((item) => {
      const subtotal = item.price * item.quantity;

      return `
        <article class="note-item">
          <div>
            <strong>${escapeHtml(item.product_name)}</strong>
            <span>${escapeHtml(item.category)} | ${escapeHtml(item.unit)}</span>
          </div>
          <div class="note-controls">
            <input class="quantity-input" type="number" min="1" step="1" value="${item.quantity}" data-budget-key="${escapeHtml(item.key)}">
            <strong>${formatCurrency(subtotal)}</strong>
            <button type="button" class="table-button" data-remove-budget="${escapeHtml(item.key)}">x</button>
          </div>
        </article>
      `;
    })
    .join("");

  bindBudgetTableControls();

  const total = state.budgetItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  setText(els.budgetTotal, formatCurrency(total));
  setText(els.budgetCount, `${state.budgetItems.length} producten geselecteerd`);
  setText(els.noteItemTotal, state.budgetItems.length);
}

function updateBudgetQuantity(key, quantity) {
  const item = state.budgetItems.find((entry) => entry.key === key);

  if (!item || !quantity || quantity <= 0) {
    return;
  }

  item.quantity = quantity;
  renderBudget();
}

function removeBudgetItem(key) {
  state.budgetItems = state.budgetItems.filter((item) => item.key !== key);
  renderBudget();
}

async function copyBudgetSummary() {
  if (!state.budgetItems.length) {
    showBudgetMessage("error", "Er is nog geen begroting om te kopieren.");
    return;
  }

  const lines = state.budgetItems.map((item) => {
    const subtotal = item.price * item.quantity;
    return `${item.quantity} x ${item.product_name} = ${formatCurrency(subtotal)}`;
  });
  const total = state.budgetItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const text = `Begroting Suribasket\n${lines.join("\n")}\nTotaal: ${formatCurrency(total)}`;

  try {
    await navigator.clipboard.writeText(text);
    showBudgetMessage("good", "Begroting gekopieerd.");
  } catch (error) {
    showBudgetMessage("average", escapeHtml(text).replaceAll("\n", "<br>"), true);
  }
}

function showBudgetMessage(type, message, allowHtml = false) {
  if (!els.budgetMessage) {
    return;
  }

  els.budgetMessage.className = `result show ${type}`;
  els.budgetMessage.innerHTML = allowHtml
    ? `<strong>${message}</strong>`
    : `<strong>${escapeHtml(message)}</strong>`;
}

function renderPrices(items) {
  if (!els.pricesTable) {
    return;
  }

  if (!items.length) {
    els.pricesTable.innerHTML = `<tr><td colspan="8">Geen producten gevonden.</td></tr>`;
    updateProductStats(0);
    return;
  }

  state.renderedLocalProducts = items.map((item, index) => {
    const packageText = getPackageText(item);
    return {
      key: `local-${index}-${item.product_name}-${item.store_name}`,
      product_name: item.product_name,
      category: item.category || "Algemeen",
      unit: packageText,
      price: Number(item.price),
      store_name: item.store_name || "Onbekend"
    };
  });

  els.pricesTable.innerHTML = items
    .map((item, index) => {
      const packageText = getPackageText(item);

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(item.product_name)}</strong></td>
          <td>${escapeHtml(item.category || "Algemeen")}</td>
          <td>${escapeHtml(item.brand || "Onbekend")}</td>
          <td>${escapeHtml(packageText || "Niet ingevuld")}</td>
          <td>
            <strong>${escapeHtml(item.store_name || "Onbekend")}</strong>
            <span class="muted">${escapeHtml(item.location || "")}</span>
          </td>
          <td class="price">${formatCurrency(item.price)}</td>
          <td><button type="button" class="row-add-button" data-add-local="${index}">+</button></td>
        </tr>
      `;
    })
    .join("");

  bindProductRowButtons();
  updateProductStats(items.length);
}

function renderOfficialPrices(items) {
  if (!els.pricesTable) {
    return;
  }

  setText(els.productsTableTitle, "Publieke productenlijst");
  setTableHead(`
    <tr>
      <th>#</th>
      <th>Product</th>
      <th>Categorie</th>
      <th>Importeur</th>
      <th>Groothandel verpakking</th>
      <th>Groothandel prijs</th>
      <th>Kleinhandel verpakking</th>
      <th>Kleinhandel prijs</th>
      <th>Actie</th>
    </tr>
  `);

  if (!items.length) {
    els.pricesTable.innerHTML = `<tr><td colspan="8">Geen officiele producten gevonden.</td></tr>`;
    updateProductStats(0);
    return;
  }

  state.renderedOfficialProducts = items.map((item, index) => {
    return {
      key: `public-${item.official_price_id || index}`,
      product_name: item.product_name,
      category: item.category || "Algemeen",
      unit: item.retail_package || "stuk",
      price: Number(item.retail_price),
      store_name: item.importer_name || "Publieke productenlijst"
    };
  });

  els.pricesTable.innerHTML = items
    .map((item, index) => {
      return `
        <tr>
          <td>${item.source_row_number}</td>
          <td><strong>${escapeHtml(item.product_name)}</strong></td>
          <td>${escapeHtml(item.category || "Algemeen")}</td>
          <td>${escapeHtml(item.importer_name || "Onbekend")}</td>
          <td>${escapeHtml(item.wholesale_package || "Niet ingevuld")}</td>
          <td class="price">${formatCurrency(item.wholesale_price)}</td>
          <td>${escapeHtml(item.retail_package || "Niet ingevuld")}</td>
          <td class="price">${formatCurrency(item.retail_price)}</td>
          <td><button type="button" class="row-add-button" data-add-official="${index}">+</button></td>
        </tr>
      `;
    })
    .join("");

  bindProductRowButtons();
  updateProductStats(items.length);
}

function updateProductStats(visibleCount) {
  setText(els.localPriceTotal, state.prices.length);
  setText(els.officialPriceTotal, state.officialProducts.length);
  setText(els.visiblePriceTotal, visibleCount);
  setText(els.noteItemTotal, state.budgetItems.length);
}

function renderCurrentProductTable() {
  const query = els.searchInput ? els.searchInput.value.trim().toLowerCase() : "";

  if (state.productMode === "official") {
    const items = filterItems(state.officialProducts, query, [
      "product_name",
      "category",
      "importer_name",
      "wholesale_package",
      "retail_package"
    ]);
    renderOfficialPrices(items);
    return;
  }

  setText(els.productsTableTitle, "Prijsregistraties");
  setTableHead(`
    <tr>
      <th>#</th>
      <th>Product</th>
      <th>Categorie</th>
      <th>Merk</th>
      <th>Verpakking</th>
      <th>Winkel</th>
      <th>Prijs</th>
      <th>Actie</th>
    </tr>
  `);

  const items = filterItems(state.prices, query, [
    "product_name",
    "category",
    "brand",
    "store_name",
    "location",
    "unit"
  ]);
  renderPrices(items);
}

function getPackageText(item) {
  if (item.package_label) {
    return item.package_label;
  }

  return [item.weight, item.unit].filter(Boolean).join(" ") || "stuk";
}

function bindProductRowButtons() {
  els.pricesTable.querySelectorAll("[data-add-local]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = state.renderedLocalProducts[Number(button.dataset.addLocal)];
      addBudgetProduct(product, 1);
    });
  });

  els.pricesTable.querySelectorAll("[data-add-official]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = state.renderedOfficialProducts[Number(button.dataset.addOfficial)];
      addBudgetProduct(product, 1);
    });
  });
}

function filterItems(items, query, fields) {
  if (!query) {
    return items;
  }

  return items.filter((item) =>
    fields.some((field) => String(item[field] || "").toLowerCase().includes(query))
  );
}

function setProductModeButtons() {
  if (els.localPricesButton) {
    els.localPricesButton.classList.toggle("active", state.productMode === "local");
  }

  if (els.officialPricesButton) {
    els.officialPricesButton.classList.toggle("active", state.productMode === "official");
  }
}

function setTableHead(html) {
  if (els.pricesTableHead) {
    els.pricesTableHead.innerHTML = html;
  }
}

function renderOfflineTable() {
  if (!els.pricesTable) {
    return;
  }

  els.pricesTable.innerHTML = `
    <tr>
      <td colspan="8">
        Kan geen verbinding maken met de backend. Start de server via:
        <strong>cd C:\\Users\\user\\sranan-prijsscanner\\backend</strong> en <strong>npm start</strong>.
      </td>
    </tr>
  `;
}

function showPriceResult(data) {
  const verdict = String(data.verdict || "").toLowerCase();
  const type = verdict.includes("goedkoop")
    ? "good"
    : verdict.includes("duur")
      ? "expensive"
      : "average";

  els.result.className = `result show ${type}`;
  els.result.innerHTML = `
    <h3>Resultaat</h3>
    <div class="result-grid">
      <p><span>Product</span><strong>${escapeHtml(data.product)}</strong></p>
      <p><span>Jouw prijs</span><strong>${formatCurrency(data.your_price)}</strong></p>
      <p><span>Gemiddelde prijs</span><strong>${formatCurrency(data.average_price_per_unit)}</strong></p>
      <p><span>Advies</span><strong>${escapeHtml(data.verdict || "Gemiddeld")}</strong></p>
    </div>
  `;
}

function showResult(type, message) {
  if (!els.result) {
    return;
  }

  els.result.className = `result show ${type}`;
  els.result.innerHTML = `<strong>${escapeHtml(message)}</strong>`;
}

function setApiStatus(isConnected) {
  const statusText = isConnected
    ? "Verbonden met localhost:3000"
    : "Geen verbinding met localhost:3000";

  setText(els.apiStatus, statusText);
  setText(els.healthText, statusText);

  if (els.statusDot) {
    els.statusDot.classList.toggle("connected", isConnected);
    els.statusDot.classList.toggle("failed", !isConnected);
  }
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function formatCurrency(value) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "SRD 0,00";
  }

  const formattedAmount = new Intl.NumberFormat("nl-SR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return `SRD ${formattedAmount}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
