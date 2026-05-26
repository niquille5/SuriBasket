import { getAuthUser } from "./auth.js";

export function initializeLayout() {
  markActiveNavigation();
  updateAuthNavigation();
}

function markActiveNavigation() {
  const currentPage = document.body.dataset.page || "dashboard";

  document.querySelectorAll("[data-nav-page]").forEach((link) => {
    const isActive = link.dataset.navPage === currentPage;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function updateAuthNavigation() {
  const user = getAuthUser();
  const isAdmin = user && user.role === "admin";

  document.querySelectorAll('[data-auth-link="login"]').forEach((link) => {
    const isHidden = Boolean(user);
    link.classList.toggle("is-hidden", isHidden);
    link.toggleAttribute("hidden", isHidden);
  });

  document.querySelectorAll('[data-auth-link="admin"]').forEach((link) => {
    const isHidden = !isAdmin;
    link.classList.toggle("is-hidden", isHidden);
    link.toggleAttribute("hidden", isHidden);
  });

  document.querySelectorAll('[data-auth-link="logout"]').forEach((button) => {
    const isHidden = !user;
    button.classList.toggle("is-hidden", isHidden);
    button.toggleAttribute("hidden", isHidden);
  });
}
