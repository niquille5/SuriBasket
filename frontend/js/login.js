import { saveLogin } from "./auth.js";
import { showMessage } from "./dom.js";

export function initLoginPage() {
  fillRememberedUser();
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document
    .getElementById("registerForm")
    ?.addEventListener("submit", handleRegister);
  document
    .getElementById("showRegisterButton")
    ?.addEventListener("click", () => showAuthMode("register"));
  document
    .getElementById("showLoginButton")
    ?.addEventListener("click", () => showAuthMode("login"));
  document
    .getElementById("forgotPasswordButton")
    ?.addEventListener("click", showForgotPasswordMessage);
  document
    .getElementById("googleLoginButton")
    ?.addEventListener("click", showGoogleLoginMessage);
}

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const message = document.getElementById("loginMessage");
  const submitButton = event.submitter;

  if (!username || !password) {
    showMessage(message, "error", "Vul gebruikersnaam en wachtwoord in.");
    return;
  }

  setButtonLoading(submitButton, "Inloggen...");

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) throw new Error("Login failed");

    const result = await response.json();
    rememberUser(username);
    saveLogin(result.token, result.user);
    showMessage(message, "good", "Login gelukt. Je wordt doorgestuurd.");

    window.setTimeout(() => {
      redirectAfterLogin(result.user);
    }, 600);
  } catch (error) {
    showMessage(message, "error", "Ongeldige gebruikersnaam of wachtwoord.");
  } finally {
    setButtonLoading(submitButton);
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;
  const passwordConfirm = document.getElementById("registerPasswordConfirm").value;
  const message = document.getElementById("registerMessage");
  const submitButton = event.submitter;

  if (!username || !password) {
    showMessage(message, "error", "Vul een gebruikersnaam en wachtwoord in.");
    return;
  }

  if (password.length < 6) {
    showMessage(message, "error", "Gebruik minimaal 6 tekens voor je wachtwoord.");
    return;
  }

  if (password !== passwordConfirm) {
    showMessage(message, "error", "De wachtwoorden zijn niet hetzelfde.");
    return;
  }

  setButtonLoading(submitButton, "Account maken...");

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Register failed");
    }

    const result = await response.json();
    saveLogin(result.token, result.user);
    showMessage(message, "good", "Account gemaakt. Je wordt doorgestuurd.");

    window.setTimeout(() => {
      redirectAfterLogin(result.user);
    }, 600);
  } catch (error) {
    showMessage(message, "error", "Account maken is niet gelukt.");
  } finally {
    setButtonLoading(submitButton);
  }
}

function redirectAfterLogin(user) {
  window.location.href = user && user.role === "admin" ? "admin.html" : "begroting.html";
}

function showAuthMode(mode) {
  const isRegister = mode === "register";
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegisterButton = document.getElementById("showRegisterButton");
  const showLoginButton = document.getElementById("showLoginButton");

  if (loginForm) loginForm.hidden = isRegister;
  if (registerForm) registerForm.hidden = !isRegister;
  if (showRegisterButton) showRegisterButton.hidden = isRegister;
  if (showLoginButton) showLoginButton.hidden = !isRegister;

  setText("authModeLabel", isRegister ? "Nieuw account" : "Welkom terug");
  setText("authTitle", isRegister ? "Account maken" : "Inloggen");
  setText(
    "authIntro",
    isRegister
      ? "Maak een account om je begrotingen en inkopen te bewaren."
      : "Log in om je begrotingen en inkoopgeschiedenis verder te gebruiken.",
  );
  setText("authSwitchText", isRegister ? "Heb je al een account?" : "Nog geen account?");
}

function fillRememberedUser() {
  const rememberedUsername = localStorage.getItem("suriBasketRememberedUser");
  const usernameInput = document.getElementById("loginUsername");
  const rememberInput = document.getElementById("rememberLogin");

  if (rememberedUsername && usernameInput) {
    usernameInput.value = rememberedUsername;
  }

  if (rememberedUsername && rememberInput) {
    rememberInput.checked = true;
  }
}

function rememberUser(username) {
  const rememberInput = document.getElementById("rememberLogin");

  if (rememberInput?.checked) {
    localStorage.setItem("suriBasketRememberedUser", username);
    return;
  }

  localStorage.removeItem("suriBasketRememberedUser");
}

function showForgotPasswordMessage() {
  const message = document.getElementById("loginMessage");
  showMessage(
    message,
    "average",
    "Wachtwoord herstellen is voorbereid voor een volgende versie.",
  );
}

function showGoogleLoginMessage() {
  const message = document.getElementById("loginMessage");
  showMessage(
    message,
    "average",
    "Google login is visueel voorbereid. Gebruik nu je Suri Basket account.",
  );
}

function setButtonLoading(button, text) {
  if (!button) return;

  if (text) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
    button.classList.add("is-loading");
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  button.classList.remove("is-loading");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
