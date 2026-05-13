import { saveLogin } from "./auth.js";
import { showMessage } from "./dom.js";

export function initLoginPage() {
  if (localStorage.getItem("authToken")) {
    window.location.href = "admin.html";
    return;
  }

  const form = document.getElementById("loginForm");
  if (form) form.addEventListener("submit", handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const message = document.getElementById("loginMessage");

  if (!username || !password) {
    showMessage(message, "error", "Vul gebruikersnaam en wachtwoord in.");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) throw new Error("Login failed");

    const result = await response.json();
    saveLogin(result.token, result.user);
    showMessage(message, "good", "Login gelukt. Je wordt doorgestuurd.");

    window.setTimeout(() => {
      window.location.href = "admin.html";
    }, 600);
  } catch (error) {
    showMessage(message, "error", "Ongeldige gebruikersnaam of wachtwoord.");
  }
}
