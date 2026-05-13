import { fetchJson } from "./api.js";
import { setText } from "./dom.js";

export async function checkHealth() {
  try {
    await fetchJson("/api/health");
    setApiStatus(true);
  } catch (error) {
    setApiStatus(false);
  }
}

function setApiStatus(isConnected) {
  const statusText = isConnected
    ? "Verbonden met localhost:3000"
    : "Geen verbinding met localhost:3000";

  setText(document.getElementById("apiStatus"), statusText);
  setText(document.getElementById("healthText"), statusText);

  const statusDot = document.querySelector(".status-dot");
  if (statusDot) {
    statusDot.classList.toggle("connected", isConnected);
    statusDot.classList.toggle("failed", !isConnected);
  }
}
