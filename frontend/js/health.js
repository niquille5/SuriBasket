import { fetchJson } from "./api.js";
import { setText } from "./dom.js";

export async function checkHealth() {
  try {
    await fetchJson("/api");
    await fetchHealthWithTimeout();
    setApiStatus("online");
  } catch (error) {
    if (error.message === "Database offline") {
      setApiStatus("database-offline");
      return;
    }

    setApiStatus("offline");
  }
}

async function fetchHealthWithTimeout() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch("/api/health", { signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data.database !== "online") {
      throw new Error("Database offline");
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

function setApiStatus(status) {
  const statusText = {
    online: "API online, database online",
    "database-offline": "API online, database offline",
    offline: "Geen verbinding met localhost:3000"
  }[status];

  setText(document.getElementById("apiStatus"), statusText);
  setText(document.getElementById("healthText"), statusText);

  const statusDot = document.querySelector(".status-dot");
  if (statusDot) {
    statusDot.classList.toggle("connected", status === "online");
    statusDot.classList.toggle("failed", status !== "online");
  }
}
