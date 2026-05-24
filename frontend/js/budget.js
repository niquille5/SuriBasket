import { fetchJson } from "./api.js";
import { getAuthHeaders, hasAuthToken } from "./auth.js";
import { showMessage } from "./dom.js";
import { createBudgetList } from "./budget-shared.js";

export async function initBudgetPage() {
  const elements = getBudgetElements();
  const budget = createBudgetList(elements);
  bindSaveButtons(budget, elements);

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
    copyButton: document.getElementById("copyBudgetButton"),
    saveListButton: document.getElementById("saveBudgetListButton"),
    savePurchaseButton: document.getElementById("savePurchaseButton"),
    table: document.getElementById("budgetTable"),
    total: document.getElementById("budgetTotal"),
    count: document.getElementById("budgetCount"),
    noteCount: document.getElementById("noteItemTotal"),
    message: document.getElementById("budgetMessage"),
  };
}

function bindSaveButtons(budget, elements) {
  elements.saveListButton?.addEventListener("click", () => saveBudgetList(budget));
  elements.savePurchaseButton?.addEventListener("click", () => savePurchase(budget));
}

async function saveBudgetList(budget) {
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
  } catch (error) {
    showMessage(
      document.getElementById("budgetMessage"),
      "error",
      "Opslaan is niet gelukt. Log opnieuw in als je sessie verlopen is.",
    );
  }
}

async function savePurchase(budget) {
  if (!canSaveBudget(budget)) return;

  try {
    await fetchJson("/api/purchases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        payment_method: "cash",
        items: budget.items,
      }),
    });

    showMessage(
      document.getElementById("budgetMessage"),
      "good",
      "Inkoop opgeslagen bij je geschiedenis.",
    );
  } catch (error) {
    showMessage(
      document.getElementById("budgetMessage"),
      "error",
      "Inkoop opslaan is niet gelukt.",
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
