import { fetchJson } from "./api.js";
import { escapeHtml, showMessage } from "./dom.js";
import { formatCurrency, getPackageText } from "./format.js";

export async function initScannerPage() {
  await loadProductSuggestions();
  bindPriceForm();
}

async function loadProductSuggestions() {
  const suggestions = document.getElementById("productSuggestions");
  if (!suggestions) return;

  try {
    const products = await fetchJson("/api/products");
    const labels = [
      ...new Set(
        products
          .filter((item) => item.product_name)
          .map((item) => item.product_name + " | " + getPackageText(item)),
      ),
    ].sort();
    suggestions.innerHTML = labels
      .map((label) => '<option value="' + escapeHtml(label) + '"></option>')
      .join("");
  } catch (error) {
    suggestions.innerHTML = "";
  }
}

function bindPriceForm() {
  const form = document.getElementById("priceForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const product = document.getElementById("productInput").value.trim();
    const price = Number(document.getElementById("priceInput").value);

    if (!product || !price || price <= 0) {
      showMessage(
        document.getElementById("result"),
        "error",
        "Vul een productnaam en een geldige prijs in.",
      );
      return;
    }

    try {
      const data = await fetchJson(
        "/api/check-price/" + encodeURIComponent(product) + "/" + price,
      );
      showPriceResult(data);
    } catch (error) {
      showMessage(
        document.getElementById("result"),
        "error",
        "Product niet gevonden of de backend staat nog uit.",
      );
    }
  });
}

function showPriceResult(data) {
  const result = document.getElementById("result");
  const verdict = String(data.verdict || "").toLowerCase();
  const type = verdict.includes("goedkoop")
    ? "good"
    : verdict.includes("duur")
      ? "expensive"
      : "average";

  result.className = "result show " + type;
  result.innerHTML =
    "<h3>Resultaat</h3>" +
    '<div class="result-grid">' +
    "<p><span>Product</span><strong>" +
    escapeHtml(data.product) +
    "</strong></p>" +
    "<p><span>Jouw prijs</span><strong>" +
    formatCurrency(data.your_price) +
    "</strong></p>" +
    "<p><span>Gemiddelde prijs</span><strong>" +
    formatCurrency(data.average_price_per_unit) +
    "</strong></p>" +
    "<p><span>Advies</span><strong>" +
    escapeHtml(data.verdict || "Gemiddeld") +
    "</strong></p>" +
    "</div>";
}
