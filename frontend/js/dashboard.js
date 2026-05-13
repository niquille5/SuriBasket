import { fetchJson } from "./api.js";
import { setText } from "./dom.js";

export async function initDashboardPage() {
  try {
    const summary = await fetchJson("/api/summary");
    setDashboardCounts(summary);
  } catch (error) {
    setDashboardCounts({
      products: 0,
      prices: 0,
      stores: 0,
      variants: 0,
      official_products: 0,
      importers: 0,
    });
  }
}

function setDashboardCounts(summary) {
  setText(document.getElementById("productCount"), summary.products);
  setText(document.getElementById("priceCount"), summary.prices);
  setText(document.getElementById("storeCount"), summary.stores);
  setText(document.getElementById("variantCount"), summary.variants);
  setText(document.getElementById("officialCount"), summary.official_products);
  setText(document.getElementById("importerCount"), summary.importers);
}
