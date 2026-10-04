// =========================================================
// AI CivicFix — Global Helpers & UI Shell Components
// Shared across all HTML pages
// =========================================================

window.esc = function (value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

window.renderGlobalHeader = function (options = {}) {
  const isCitizen = options.role === "citizen";
  const user = window.AppState?.currentUser;
  const inSubdir = window.location.pathname.includes("/citizen/") ||
                   window.location.pathname.includes("/admin/") ||
                   window.location.pathname.includes("/field/");
  const homeLink = isCitizen ? (inSubdir ? "home.html" : "citizen/home.html") : (inSubdir ? "../login.html" : "login.html");

  return `
    <header class="topbar">
      <a href="${homeLink}" class="brand">
        <div class="brand-mark">CF</div>
        <div>
          <div>AI CivicFix</div>
          <div class="brand-sub">KMC Civic Services</div>
        </div>
      </a>
      <div class="row">
        <span class="demo-label">Hackathon Prototype</span>
        ${user ? `<button class="ghost-btn small-btn" data-action="logout" type="button">Logout</button>` : `<a href="${inSubdir ? '../login.html' : 'login.html'}" class="secondary-btn small-btn">Switch Role</a>`}
      </div>
    </header>
  `;
};

window.renderCitizenNav = function (activeTab = "home") {
  return `
    <nav class="citizen-bottom-nav">
      <a href="home.html" ${activeTab === "home" ? 'aria-current="page"' : ""}>
        <span style="font-size:20px;">⌂</span>
        <span>Home</span>
      </a>
      <a href="report.html" ${activeTab === "report" ? 'aria-current="page"' : ""}>
        <span style="font-size:20px;">＋</span>
        <span>Report</span>
      </a>
      <a href="reports.html" ${activeTab === "reports" ? 'aria-current="page"' : ""}>
        <span style="font-size:20px;">□</span>
        <span>My Reports</span>
      </a>
    </nav>
  `;
};

window.renderAdminSidebar = function (activeItem = "dashboard") {
  return `
    <aside class="sidebar">
      <a href="dashboard.html" class="brand">
        <div class="brand-mark">CF</div>
        <div>
          <div>AI CivicFix</div>
          <div class="brand-sub">Municipal Operations</div>
        </div>
      </a>

      <nav class="sidebar-nav">
        <a href="dashboard.html" class="${activeItem === "dashboard" ? "active" : ""}">
          <span>📊</span> Dashboard
        </a>
        <a href="master-issues.html" class="${activeItem === "issues" ? "active" : ""}">
          <span>📁</span> Master Incidents
        </a>
        <a href="department.html" class="${activeItem === "department" ? "active" : ""}">
          <span>🏛️</span> Department
        </a>
        <a href="map.html" class="${activeItem === "map" ? "active" : ""}">
          <span>🗺️</span> Incident Map
        </a>
        <a href="resolution.html" class="${activeItem === "resolution" ? "active" : ""}">
          <span>✅</span> Resolution
        </a>
        <a href="analytics.html" class="${activeItem === "analytics" ? "active" : ""}">
          <span>📈</span> Analytics
        </a>
      </nav>

      <div style="margin-top:auto;padding-top:24px;">
        <span class="demo-label" style="display:block;text-align:center;">Kolhapur (KMC)</span>
      </div>
    </aside>
  `;
};

window.renderAdminTopbar = function () {
  const user = (window.Auth && window.Auth.getCurrentUser()) || window.AppState?.currentUser || { name: "KMC Demo Administrator", role: "SUPER_ADMIN" };
  const roleDisplay = user.role === "SUPER_ADMIN" ? "Super Admin" :
                      user.role === "DEPARTMENT_ADMIN" ? "Department Admin" :
                      user.role === "FIELD_OFFICER" ? "Field Officer" :
                      user.role === "CITIZEN" ? "Citizen" : (user.role || "");
  return `
    <header class="admin-topbar">
      <div>
        <strong>${window.esc(user.name || "User")}</strong>
        <div class="brand-sub">${window.esc(roleDisplay)}${user.department ? ` · ${window.esc(user.department)}` : ""}</div>
      </div>
      <div class="row">
        <span class="demo-label">Demo Data</span>
        <button class="ghost-btn small-btn" data-action="logout" type="button">Logout</button>
      </div>
    </header>
  `;
};
