import { budgetAllowedCategories, budgetPresets } from "./budget-data.js";
import { escapeHtml, setText, showMessage } from "./dom.js";
import { formatCurrency, getPackageText } from "./format.js";

export function createBudgetList(elements) {
  const budget = {
    products: [],
    items: [],

    setProducts(prices) {
      budget.products = buildBudgetProducts(prices);
      renderProductOptions();
      budget.render();
    },

    addProduct(product, quantity = 1) {
      if (!product) {
        showMessage(elements.message, "error", "Product niet gevonden.");
        return;
      }

      const existing = budget.items.find((item) => item.key === product.key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        budget.items.push({ ...product, quantity });
      }

      budget.render();
      showMessage(
        elements.message,
        "good",
        product.product_name + " toegevoegd.",
      );
    },

    render() {
      renderBudgetTable();
    },
  };

  bindBudgetButtons();
  return budget;

  function bindBudgetButtons() {
    if (elements.addButton) {
      elements.addButton.addEventListener("click", () => {
        const key = elements.productSelect.value;
        const quantity = Number(elements.quantityInput.value);

        if (!key || !quantity || quantity <= 0) {
          showMessage(
            elements.message,
            "error",
            "Kies een product en vul een geldig aantal in.",
          );
          return;
        }

        const product = budget.products.find((item) => item.key === key);
        budget.addProduct(product, quantity);
      });
    }

    if (elements.clearButton) {
      elements.clearButton.addEventListener("click", () => {
        budget.items = [];
        budget.render();
        showMessage(elements.message, "average", "Begroting leeggemaakt.");
      });
    }

    if (elements.copyButton) {
      elements.copyButton.addEventListener("click", copyBudgetSummary);
    }

    if (elements.noteToggle && elements.notePanel) {
      elements.noteToggle.addEventListener("click", () => {
        const isMinimized = elements.notePanel.classList.toggle("is-minimized");
        elements.noteToggle.textContent = isMinimized ? "Open" : "Minimaliseer";
        elements.noteToggle.setAttribute("aria-expanded", String(!isMinimized));
      });
    }

    document.querySelectorAll("[data-preset]").forEach((button) => {
      button.addEventListener("click", () => loadPreset(button.dataset.preset));
    });
  }

  function renderProductOptions() {
    if (!elements.productSelect) return;

    if (!budget.products.length) {
      elements.productSelect.innerHTML =
        '<option value="">Geen producten gevonden</option>';
      return;
    }

    elements.productSelect.innerHTML =
      '<option value="">Kies een product</option>' +
      budget.products
        .map(
          (item) =>
            '<option value="' +
            escapeHtml(item.key) +
            '">' +
            escapeHtml(item.product_name) +
            " | " +
            escapeHtml(item.unit) +
            " - " +
            formatCurrency(item.price) +
            "</option>",
        )
        .join("");
  }

  function loadPreset(presetName) {
    const preset = budgetPresets[presetName] || [];

    preset.forEach((entry) => {
      const product = findBudgetProduct(entry.match);
      if (product) budget.addProduct(product, entry.quantity);
    });

    budget.render();
    showMessage(
      elements.message,
      "good",
      "Pakket toegevoegd aan je begroting.",
    );
  }

  function findBudgetProduct(match) {
    const needle = match.toLowerCase();
    const matches = budget.products.filter((item) =>
      item.product_name.toLowerCase().includes(needle),
    );

    return matches.sort((a, b) => {
      if (a.isPublicPrice !== b.isPublicPrice) {
        return a.isPublicPrice ? -1 : 1;
      }

      return b.price - a.price;
    })[0];
  }

  function renderBudgetTable() {
    if (!elements.table) return;

    if (!budget.items.length) {
      elements.table.innerHTML =
        elements.table.tagName === "TBODY"
          ? '<tr><td colspan="6">Kies een pakket of voeg producten toe.</td></tr>'
          : '<p class="muted">Klik op Voeg toe bij een product om het hier te plaatsen.</p>';
      updateTotals();
      return;
    }

    if (elements.table.tagName === "TBODY") renderFullTable();
    else renderNoteList();

    bindTableControls();
    updateTotals();
  }

  function renderFullTable() {
    elements.table.innerHTML = budget.items
      .map((item) => {
        const subtotal = item.price * item.quantity;
        return (
          "<tr>" +
          "<td><strong>" +
          escapeHtml(item.product_name) +
          '</strong><span class="muted">' +
          escapeHtml(item.store_name) +
          " | " +
          escapeHtml(item.unit) +
          "</span></td>" +
          "<td>" +
          escapeHtml(item.category) +
          "</td>" +
          '<td class="price">' +
          formatCurrency(item.price) +
          "</td>" +
          '<td><input class="quantity-input" type="number" min="1" step="1" value="' +
          item.quantity +
          '" data-budget-key="' +
          escapeHtml(item.key) +
          '"></td>' +
          '<td class="price">' +
          formatCurrency(subtotal) +
          "</td>" +
          '<td><button type="button" class="table-button" data-remove-budget="' +
          escapeHtml(item.key) +
          '">Verwijder</button></td>' +
          "</tr>"
        );
      })
      .join("");
  }

  function renderNoteList() {
    elements.table.innerHTML = budget.items
      .map((item) => {
        const subtotal = item.price * item.quantity;
        return (
          '<article class="note-item">' +
          "<div><strong>" +
          escapeHtml(item.product_name) +
          "</strong><span>" +
          escapeHtml(item.category) +
          " | " +
          escapeHtml(item.unit) +
          "</span></div>" +
          '<div class="note-controls">' +
          '<input class="quantity-input" type="number" min="1" step="1" value="' +
          item.quantity +
          '" data-budget-key="' +
          escapeHtml(item.key) +
          '">' +
          "<strong>" +
          formatCurrency(subtotal) +
          "</strong>" +
          '<button type="button" class="table-button" data-remove-budget="' +
          escapeHtml(item.key) +
          '">x</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function bindTableControls() {
    elements.table.querySelectorAll("[data-budget-key]").forEach((input) => {
      input.addEventListener("input", () =>
        updateQuantity(input.dataset.budgetKey, Number(input.value)),
      );
    });

    elements.table
      .querySelectorAll("[data-remove-budget]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          budget.items = budget.items.filter(
            (item) => item.key !== button.dataset.removeBudget,
          );
          budget.render();
        });
      });
  }

  function updateQuantity(key, quantity) {
    const item = budget.items.find((entry) => entry.key === key);
    if (!item || !quantity || quantity <= 0) return;
    item.quantity = quantity;
    budget.render();
  }

  async function copyBudgetSummary() {
    if (!budget.items.length) {
      showMessage(
        elements.message,
        "error",
        "Er is nog geen begroting om te kopieren.",
      );
      return;
    }

    const lines = budget.items.map(
      (item) =>
        item.quantity +
        " x " +
        item.product_name +
        " (" +
        item.unit +
        ")" +
        " = " +
        formatCurrency(item.price * item.quantity),
    );
    const text =
      "Begroting Suri Basket\n" +
      lines.join("\n") +
      "\nTotaal: " +
      formatCurrency(getTotal());

    try {
      await navigator.clipboard.writeText(text);
      showMessage(elements.message, "good", "Begroting gekopieerd.");
    } catch (error) {
      showMessage(
        elements.message,
        "average",
        escapeHtml(text).replaceAll("\n", "<br>"),
        true,
      );
    }
  }

  function updateTotals() {
    setText(elements.total, formatCurrency(getTotal()));
    setText(elements.count, budget.items.length + " producten geselecteerd");
    setText(elements.noteCount, budget.items.length);
  }

  function getTotal() {
    return budget.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }
}

export function buildBudgetProducts(prices) {
  const map = new Map();

  prices.forEach((item) => {
    if (!budgetAllowedCategories.includes(item.category || "")) return;

    const unit = getPackageText(item);
    const key = [item.product_name, unit].join(" | ");
    const price = Number(item.price);
    if (!key || Number.isNaN(price)) return;

    if (!map.has(key)) {
      map.set(key, {
        key,
        product_id: item.product_id || null,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        category: item.category || "Algemeen",
        unit,
        priceTotal: price,
        priceCount: 1,
        price,
        storeNames: new Set([item.store_name || "Onbekend"]),
        store_name: item.store_name || "Onbekend",
        isPublicPrice: item.source_type === "public_product_list",
      });
      return;
    }

    const current = map.get(key);
    current.priceTotal += price;
    current.priceCount += 1;
    current.price = current.priceTotal / current.priceCount;
    current.storeNames.add(item.store_name || "Onbekend");
    current.store_name = getStoreLabel(current);
    current.isPublicPrice =
      current.isPublicPrice || item.source_type === "public_product_list";
  });

  return [...map.values()]
    .map((item) => ({
      key: item.key,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      category: item.category,
      unit: item.unit,
      price: roundMoney(item.price),
      store_name: getStoreLabel(item),
      isPublicPrice: item.isPublicPrice,
    }))
    .sort((a, b) => a.product_name.localeCompare(b.product_name));
}

function getStoreLabel(item) {
  if (!item.storeNames || item.storeNames.size <= 1) {
    return item.store_name || "Onbekend";
  }

  return "Gemiddelde van " + item.storeNames.size + " winkels";
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}
