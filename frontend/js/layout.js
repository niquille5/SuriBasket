import { getAuthUser } from "./auth.js";

export function initializeLayout() {
  markActiveNavigation();
  updateAuthNavigation();
}

function markActiveNavigation() {
  const currentPage = document.body.dataset.page || "dashboard";

  document.querySelectorAll("[data-nav-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.navPage === currentPage);
  });
}

function updateAuthNavigation() {
  const user = getAuthUser();
  const isAdmin = user && user.role === "admin";

  document.querySelectorAll('[data-auth-link="login"]').forEach((link) => {
    link.classList.toggle("is-hidden", Boolean(user));
  });

  document.querySelectorAll('[data-auth-link="admin"]').forEach((link) => {
    link.classList.toggle("is-hidden", !isAdmin);
  });

  document.querySelectorAll('[data-auth-link="logout"]').forEach((button) => {
    button.classList.toggle("is-hidden", !user);
  });
}
