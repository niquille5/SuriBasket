import { postJson } from "./api.js";
import { saveLogin } from "./auth.js";
import { setHidden, setText, showMessage } from "./dom.js";
import { setButtonLoading } from "./ui.js";

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

  setButtonLoading(submitButton, true, "Inloggen...");

  try {
    const result = await postJson("/api/login", { username, password });
    rememberUser(username);
    saveLogin(result.token, result.user);
    showMessage(message, "good", "Login gelukt. Je wordt doorgestuurd.");

    window.setTimeout(() => {
      redirectAfterLogin(result.user);
    }, 600);
  } catch (error) {
    showMessage(message, "error", "Ongeldige gebruikersnaam of wachtwoord.");
  } finally {
    setButtonLoading(submitButton, false);
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

  setButtonLoading(submitButton, true, "Account maken...");

  try {
    const result = await postJson("/api/register", { username, password });
    saveLogin(result.token, result.user);
    showMessage(message, "good", "Account gemaakt. Je wordt doorgestuurd.");

    window.setTimeout(() => {
      redirectAfterLogin(result.user);
    }, 600);
  } catch (error) {
    showMessage(message, "error", "Account maken is niet gelukt.");
  } finally {
    setButtonLoading(submitButton, false);
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

  setHidden(loginForm, isRegister);
  setHidden(registerForm, !isRegister);
  setHidden(showRegisterButton, isRegister);
  setHidden(showLoginButton, !isRegister);

  setText("authModeLabel", isRegister ? "Nieuw account" : "Welkom terug");
  setText("authTitle", isRegister ? "Account maken" : "Inloggen");
  setText(
    "authIntro",
    isRegister
      ? "Maak een account om je begrotingen en inkopen te bewaren."
      : "Log in om je begrotingen en opgeslagen budgetten verder te gebruiken.",
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
