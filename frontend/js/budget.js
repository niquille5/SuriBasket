import { fetchJson } from "./api.js";
import { showMessage } from "./dom.js";
import { createBudgetList } from "./budget-shared.js";

export async function initBudgetPage() {
  const budget = createBudgetList(getBudgetElements());

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
    quantityInput: document.getElementById("budgetQuantityInput"),
    addButton: document.getElementById("addBudgetItemButton"),
    clearButton: document.getElementById("clearBudgetButton"),
    copyButton: document.getElementById("copyBudgetButton"),
    table: document.getElementById("budgetTable"),
    total: document.getElementById("budgetTotal"),
    count: document.getElementById("budgetCount"),
    noteCount: document.getElementById("noteItemTotal"),
    message: document.getElementById("budgetMessage"),
  };
}
