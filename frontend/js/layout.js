const navItems = [
  { page: "dashboard", href: "index.html", label: "Dashboard" },
  { page: "products", href: "producten.html", label: "Producten" },
  { page: "scanner", href: "scanner.html", label: "Prijscheck" },
  { page: "budget", href: "begroting.html", label: "Begroting" },
  { page: "about", href: "over.html", label: "Over" }
];

export function renderLayout() {
  const page = document.body.dataset.page || "dashboard";
  const headerTarget = document.getElementById("siteHeader");
  const footerTarget = document.getElementById("siteFooter");

  if (headerTarget) {
    headerTarget.outerHTML = buildHeader(page);
  }

  if (footerTarget) {
    footerTarget.outerHTML = buildFooter(page);
  }
}

function buildHeader(activePage) {
  const authUser = getAuthUser();
  const links = navItems
    .map((item) => {
      const activeClass = item.page === activePage ? ' class="active"' : "";
      return `<a${activeClass} href="${item.href}">${item.label}</a>`;
    })
    .join("");
  const authLinks = authUser && authUser.role === "admin"
    ? `<a${activePage === "admin" ? ' class="active"' : ""} href="admin.html">Admin</a><button type="button" class="nav-logout" id="navLogoutButton">Uitloggen</button>`
    : `<a${activePage === "login" ? ' class="active"' : ""} href="login.html">Login</a>`;

  return `
    <header class="site-header">
      <div class="topbar">
        <span>Warung-ready prijsinformatie</span>
        <span id="apiStatus">API status wordt gecontroleerd...</span>
      </div>
      <nav class="navbar" aria-label="Hoofdnavigatie">
        <a class="brand" href="login.html">
          <span class="brand-mark">SB</span>
          <span>
            <strong>Suri Basket</strong>
            <small>Warung prijzen, checks en begrotingen</small>
          </span>
        </a>
        <div class="nav-links">${links}${authLinks}</div>
      </nav>
    </header>
  `;
}

function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser"));
  } catch (error) {
    return null;
  }
}

function buildFooter(page) {
  const footerText = {
    dashboard: "Prijsinformatie, publicatielijsten en consumentenvergelijking.",
    products: "Productdata uit jouw lokale backend.",
    scanner: "Prijsadvies gebaseerd op jouw lokale database.",
    budget: "Begrotingen op basis van lokale prijsregistraties.",
    about: "Projectstructuur voor frontend, backend en database.",
    login: "Authenticatie voor beveiligde toegang.",
    admin: "Autorisatie voor adminfuncties."
  };

  return `
    <footer>
      <strong>Suri Basket</strong>
      <p>${footerText[page] || footerText.dashboard}</p>
    </footer>
  `;
}
