// =========================================================
// AI CivicFix — Main UI controller
// =========================================================

const app = document.getElementById("app");

function h(html) {
  return html;
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function go(view) {
  AppState.view = view;
  saveDemoState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function loginAs(userId) {
  const user = AppData.users.find(u => u.id === userId);
  if (!user) return;

  AppState.currentUser = { ...user };

  if (user.role === "Citizen") {
    go("citizen-home");
  } else if (user.role === "Super Admin") {
    go("admin-dashboard");
  } else if (user.role === "Department Admin") {
    go("admin-department");
  } else if (user.role === "Field Officer") {
    go("field-work");
  }
}

function logout() {
  AppState.currentUser = null;
  AppState.selectedImage = null;
  go("login");
}

function ensureCitizenDemoState() {
  if (!AppState.currentReport) {
    AppState.currentReport = {
      id: "CF-1024",
      problemType: "Pothole",
      severity: "High",
      description: "Large pothole on the road surface creating a vehicle safety hazard.",
      masterIncidentId: "KMC-042",
      status: "In Progress",
      imageUrl: "assets/report-01.svg"
    };
  }

  if (!AppState.currentMasterIncident) {
    const base = AppData.masterIssues.find(i => i.id === "KMC-042");
    AppState.currentMasterIncident = JSON.parse(JSON.stringify(base));
  }

  if (!AppState.currentWorkOrder) {
    AppState.currentWorkOrder = CivicService.generateWorkOrder(AppState.currentMasterIncident);
  }
}

function startReport() {
  AppState.currentReport = null;
  AppState.aiResult = null;
  AppState.selectedImage = null;
  go("citizen-report");
}

function handlePhotoSelected(file) {
  if (!file) return;

  CivicService.uploadImage(file).then(url => {
    AppState.selectedImage = url;
    render();
  });
}

async function runAIAnalysis() {
  const description = document.getElementById("citizen-description")?.value || "";
  const image = AppState.selectedImage || "assets/report-01.svg";

  go("citizen-analysis");

  AppState.aiResult = null;
  render();

  AppState.aiResult = await CivicService.analyzeImage(image, description);
  AppState.currentReport = {
    id: "CF-1024",
    problemType: AppState.aiResult.problemType,
    severity: AppState.aiResult.severity,
    description: AppState.aiResult.description,
    masterIncidentId: null,
    status: "AI Analyzed",
    imageUrl: image
  };

  render();
}

function useDemoLocation() {
  AppState.location = JSON.parse(JSON.stringify(AppData.location));
  render();
}

async function openDuplicateCheck() {
  if (!AppState.currentReport) return;
  const result = await CivicService.findSimilarIncident(AppState.currentReport.problemType);

  if (result.found) {
    AppState.currentMasterIncident = JSON.parse(
      JSON.stringify(AppData.masterIssues.find(i => i.id === result.incidentId))
    );
    AppState.currentMasterIncident.reportCountBefore = result.reportCount;
    go("citizen-duplicate");
  } else {
    go("citizen-confirm");
  }
}

function addToMasterIncident() {
  ensureCitizenDemoState();
  AppState.currentMasterIncident.reports = 7;
  AppState.currentMasterIncident.status = "Assigned";
  AppState.currentReport.masterIncidentId = "KMC-042";
  AppState.currentReport.status = "Incident Linked";
  saveDemoState();
  go("citizen-confirm");
}

function submitCitizenReport() {
  ensureCitizenDemoState();

  AppState.currentMasterIncident.reports = 7;
  AppState.currentReport.masterIncidentId = "KMC-042";
  AppState.currentReport.status = "In Progress";

  AppState.currentWorkOrder = CivicService.generateWorkOrder(AppState.currentMasterIncident);

  saveDemoState();
  go("citizen-success");
}

function startWork() {
  ensureCitizenDemoState();
  AppState.currentMasterIncident.status = "In Progress";
  AppState.currentReport.status = "In Progress";
  saveDemoState();
  go("field-issue");
}

function completeWork() {
  ensureCitizenDemoState();

  AppState.currentResolution = {
    masterIncidentId: "KMC-042",
    beforeImage: "assets/before-pothole.svg",
    afterImage: "assets/after-repaired.svg",
    location: AppState.location.shortAddress,
    ward: "20",
    timestamp: "Demo repair timestamp",
    aiVerification: null,
    citizenVerification: null
  };

  AppState.currentMasterIncident.status = "Resolution Submitted";
  AppState.currentReport.status = "Resolution Submitted";
  saveDemoState();
  go("admin-resolution");
}

async function runResolutionVerification() {
  if (!AppState.currentResolution) return;
  AppState.currentResolution.aiVerification = await CivicService.verifyResolution();
  saveDemoState();
  render();
}

function sendToCitizen() {
  AppState.currentMasterIncident.status = "Verification Pending";
  AppState.currentReport.status = "Citizen Verification";
  saveDemoState();
  go("citizen-verify");
}

function verifyFixed() {
  ensureCitizenDemoState();
  if (!AppState.currentResolution) {
    AppState.currentResolution = {
      masterIncidentId: "KMC-042",
      beforeImage: "assets/before-pothole.svg",
      afterImage: "assets/after-repaired.svg",
      location: AppState.location.shortAddress,
      ward: "20",
      timestamp: "Demo repair timestamp",
      aiVerification: {
        issueArea: "Appears repaired",
        location: "Matched",
        evidence: "Complete",
        verification: "READY FOR HUMAN REVIEW"
      },
      citizenVerification: "Fixed"
    };
  } else {
    AppState.currentResolution.citizenVerification = "Fixed";
  }

  AppState.currentMasterIncident.status = "Closed";
  AppState.currentReport.status = "Closed";
  saveDemoState();
  go("citizen-verify");
}

function reopenIncident() {
  ensureCitizenDemoState();
  if (AppState.currentResolution) {
    AppState.currentResolution.citizenVerification = "Reopened";
  }
  AppState.currentMasterIncident.status = "Reopened";
  AppState.currentReport.status = "Reopened";
  saveDemoState();
  go("citizen-verify");
}

function masterIssue(id = "KMC-042") {
  const issue = AppData.masterIssues.find(i => i.id === id);
  if (!issue) return;
  AppState.currentMasterIncident = JSON.parse(JSON.stringify(issue));
  AppState.currentWorkOrder = CivicService.generateWorkOrder(AppState.currentMasterIncident);
  saveDemoState();
  go("admin-master-issue");
}

function departmentForCurrentUser() {
  return AppState.currentUser?.department || "City Engineer / PWD";
}

function pageHeader(title, subtitle = "") {
  return `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">CF</div>
        <div>
          <div>AI CivicFix</div>
          <div class="brand-sub">KMC Civic Services</div>
        </div>
      </div>
      <div class="row">
        <span class="demo-label">Hackathon Prototype</span>
        ${AppState.currentUser ? `<button class="ghost-btn small-btn" onclick="logout()">Logout</button>` : ""}
      </div>
    </div>
  `;
}

function citizenNav(active) {
  return `
    <nav class="citizen-bottom-nav">
      <button onclick="go('citizen-home')" ${active === "home" ? 'aria-current="page"' : ""}>⌂<br>Home</button>
      <button onclick="startReport()" ${active === "report" ? 'aria-current="page"' : ""}>＋<br>Report</button>
      <button onclick="go('citizen-reports')" ${active === "reports" ? 'aria-current="page"' : ""}>□<br>My Reports</button>
    </nav>
  `;
}

function renderLogin() {
  const demoUsers = [
    ["citizen-1", "CITIZEN", "Report a civic problem and track my reports"],
    ["admin-1", "KMC SUPER ADMIN", "Monitor all municipal incidents and departments"],
    ["pwd-1", "PWD DEPARTMENT ADMIN", "Manage road and pothole incidents"],
    ["san-1", "SANITATION DEPARTMENT ADMIN", "Manage garbage and sanitation incidents"],
    ["water-1", "WATER DEPARTMENT ADMIN", "Manage water supply and drainage incidents"],
    ["elec-1", "ELECTRICITY DEPARTMENT ADMIN", "Manage streetlight incidents"],
    ["garden-1", "GARDEN DEPARTMENT ADMIN", "Manage trees and park incidents"],
    ["enc-1", "ENCROACHMENT DEPARTMENT ADMIN", "Manage encroachment incidents"],
    ["field-1", "FIELD OFFICER", "View assigned field work and submit resolution evidence"]
  ];

  app.innerHTML = h(`
    <div class="login-page">
      <div class="login-shell">
        <section class="login-left">
          <div>
            <span class="kicker">AI & Automation</span>
            <h1>AI CivicFix</h1>
            <p style="font-size:22px;font-weight:700;">From Citizen Complaints to Verified Municipal Action</p>
            <p>Turn citizen evidence into structured physical incidents, municipal action and verified fixes.</p>
          </div>

          <div class="stack">
            <div class="demo-label">Hackathon Prototype</div>
            <p style="margin:0;">Kolhapur, Maharashtra</p>
            <div class="flow-chain">
              <div class="flow-node" style="border-color:#FFFFFF;color:#FFFFFF;">Citizen Evidence</div>
              <div class="flow-arrow" style="color:#FFFFFF;">↓</div>
              <div class="flow-node" style="border-color:#FFFFFF;color:#FFFFFF;">Master Incident</div>
              <div class="flow-arrow" style="color:#FFFFFF;">↓</div>
              <div class="flow-node" style="border-color:#FFFFFF;color:#FFFFFF;">Verified Fix</div>
            </div>
          </div>
        </section>

        <section class="login-right">
          <div class="kicker">Demo access</div>
          <h2>Enter AI CivicFix</h2>
          <p class="muted">Use a demo role below. No password is required for the hackathon prototype.</p>

          <div class="field">
            <label class="label">Mobile / Email</label>
            <input class="input" placeholder="demo@civicfix.local">
          </div>
          <div class="field">
            <label class="label">Password</label>
            <input class="input" type="password" placeholder="Demo Mode">
          </div>
          <button class="primary-btn" style="width:100%;margin-bottom:20px;" onclick="loginAs('citizen-1')">LOGIN AS CITIZEN</button>

          <div class="divider"></div>

          <div class="demo-list">
            ${demoUsers.map(([id, title, desc]) => `
              <button class="demo-card" onclick="loginAs('${id}')">
                <strong>${title}</strong>
                <span class="muted">${desc}</span>
              </button>
            `).join("")}
          </div>
        </section>
      </div>
    </div>
  `);
}

function renderCitizenHome() {
  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="container">
          <section class="hero-card">
            <div class="kicker">KMC Civic Services</div>
            <h1>Report a Civic Problem</h1>
            <p class="muted">Take a photo of the problem and we will guide you.</p>

            <div class="hero-actions">
              <button class="big-action primary" onclick="startReport()">◉ TAKE PHOTO</button>
              <button class="big-action" onclick="startReport()">↑ UPLOAD PHOTO</button>
              <button class="big-action" onclick="go('citizen-location')">◎ USE MY LOCATION</button>
            </div>
          </section>

          <section class="section compact">
            <div class="row between">
              <div>
                <div class="kicker">Your activity</div>
                <h2 style="font-size:28px;">My Reports</h2>
              </div>
              <button class="secondary-btn small-btn" onclick="go('citizen-reports')">VIEW ALL</button>
            </div>

            <div class="grid grid-2">
              <div class="card">
                <div class="row between">
                  <strong>POTHOLE</strong>
                  <span class="status active">IN PROGRESS</span>
                </div>
                <p style="margin-bottom:4px;">Prathamesh Nagar</p>
                <p class="muted" style="margin-top:0;">CF-1024 · Ward 20</p>
                <button class="secondary-btn small-btn" onclick="go('citizen-track')">TRACK REPORT</button>
              </div>

              <div class="card">
                <div class="row between">
                  <strong>GARBAGE</strong>
                  <span class="status done">RESOLVED</span>
                </div>
                <p style="margin-bottom:4px;">Rajarampuri</p>
                <p class="muted" style="margin-top:0;">CF-1018 · Ward 18</p>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="kicker">Need help?</div>
            <p style="margin-bottom:0;">Take a photo of the problem and we will guide you through the report.</p>
          </section>
        </div>
      </main>
      ${citizenNav("home")}
    </div>
  `;
}

function renderCitizenReport() {
  const img = AppState.selectedImage;

  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="narrow">
          <div class="progress-steps">
            <div class="progress-step active">1 PHOTO</div>
            <div class="progress-step">2 LOCATION</div>
            <div class="progress-step">3 CONFIRM</div>
          </div>

          <h1 style="font-size:34px;">Report a Civic Problem</h1>
          <p class="muted">Add a photo. You do not need to choose a department.</p>

          ${img ? `
            <div class="stack">
              <div class="photo-preview">
                <img src="${img}" alt="Selected civic problem photo">
              </div>
              <button class="ghost-btn" onclick="AppState.selectedImage=null;render()">REMOVE PHOTO</button>
            </div>
          ` : `
            <label class="upload-zone" for="photo-input">
              <div>
                <div style="font-size:52px;font-weight:900;">+</div>
                <h3>TAKE PHOTO / UPLOAD PHOTO</h3>
                <p class="muted">Use your phone camera or choose an image.</p>
              </div>
            </label>
          `}

          <input id="photo-input" class="hidden" type="file" accept="image/*" capture="environment"
                 onchange="handlePhotoSelected(this.files[0])">

          <div class="field" style="margin-top:20px;">
            <label class="label">Tell us briefly what happened (optional)</label>
            <textarea id="citizen-description" class="textarea" placeholder="Example: Big pothole on the road"></textarea>
          </div>

          <button class="primary-btn" style="width:100%;" ${img ? "" : "disabled"} onclick="runAIAnalysis()">CONTINUE</button>
        </div>
      </main>
      ${citizenNav("report")}
    </div>
  `;
}

function renderCitizenAnalysis() {
  const result = AppState.aiResult;

  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="narrow">
          <div class="progress-steps">
            <div class="progress-step active">1 PHOTO</div>
            <div class="progress-step active">AI UNDERSTANDING</div>
            <div class="progress-step">3 CONFIRM</div>
          </div>

          ${!result ? `
            <div class="result-hero">
              <div class="ai-label">AI ASSISTED</div>
              <h2 style="margin-top:18px;">CHECKING YOUR PHOTO...</h2>
              <div style="margin:22px auto;width:100%;height:12px;border:2px solid #0B3D91;border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:65%;background:#0B3D91;animation:pulse 1s infinite alternate;"></div>
              </div>
              <p class="muted">Understanding the reported physical problem.</p>
            </div>
          ` : `
            <div class="stack">
              <div class="photo-preview">
                <img src="${AppState.currentReport?.imageUrl || AppState.selectedImage || "assets/report-01.svg"}" alt="Citizen report">
              </div>

              <div class="result-hero">
                <div class="ai-label">AI ASSISTED</div>
                <div class="kicker" style="margin-top:20px;">AI found</div>
                <div class="result-type">${esc(result.problemType.toUpperCase())}</div>
                <div class="status active">SEVERITY: ${esc(result.severity.toUpperCase())}</div>
                <p>${esc(result.description)}</p>
              </div>

              <div class="card">
                <div class="kicker">Recommended action</div>
                <h3>${esc(result.recommendedAction)}</h3>
                <p class="muted" style="margin-bottom:0;">This is an AI-assisted suggestion. Municipal routing is handled by configured rules.</p>
              </div>

              <button class="primary-btn" style="width:100%;" onclick="go('citizen-location')">CONTINUE</button>
            </div>
          `}
        </div>
      </main>
      ${citizenNav("report")}
    </div>
  `;

  if (!result) {
    setTimeout(async () => {
      AppState.aiResult = await CivicService.analyzeImage(AppState.selectedImage || "assets/report-01.svg", "");
      AppState.currentReport = {
        id: "CF-1024",
        problemType: AppState.aiResult.problemType,
        severity: AppState.aiResult.severity,
        description: AppState.aiResult.description,
        masterIncidentId: null,
        status: "AI Analyzed",
        imageUrl: AppState.selectedImage || "assets/report-01.svg"
      };
      render();
    }, 1400);
  }
}

function renderCitizenLocation() {
  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="narrow">
          <div class="progress-steps">
            <div class="progress-step done">1 PHOTO ✓</div>
            <div class="progress-step active">2 LOCATION</div>
            <div class="progress-step">3 CONFIRM</div>
          </div>

          <h1 style="font-size:34px;">WHERE IS THE PROBLEM?</h1>
          <p class="muted">We use your location to understand the civic service area.</p>

          <div class="address-card">
            <div class="kicker">Location</div>
            <h3>${esc(AppState.location.address)}</h3>
            <p><strong>Location captured from phone</strong></p>
            <div class="grid grid-2">
              <div>
                <div class="kicker">KMC Jurisdiction</div>
                <strong>${esc(AppState.location.jurisdiction)}</strong>
              </div>
              <div>
                <div class="kicker">Ward</div>
                <strong>${esc(AppState.location.ward)}</strong>
              </div>
            </div>
            <div style="margin-top:14px;">
              <div class="kicker">Division</div>
              <strong>${esc(AppState.location.division)}</strong>
            </div>
          </div>

          <div class="row" style="margin-top:20px;">
            <button class="secondary-btn" onclick="useDemoLocation()">◎ USE MY LOCATION</button>
            <button class="ghost-btn" onclick="useDemoLocation()">USE DEMO LOCATION</button>
          </div>

          <div class="callout" style="margin-top:16px;">
            <strong>Privacy:</strong> Citizen UI shows the service area, not raw GPS coordinates.
          </div>

          <button class="primary-btn" style="width:100%;margin-top:18px;" onclick="openDuplicateCheck()">CONTINUE</button>
        </div>
      </main>
      ${citizenNav("report")}
    </div>
  `;
}

function renderCitizenDuplicate() {
  const issue = AppState.currentMasterIncident || {};
  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="container">
          <div class="incident-highlight">
            <div class="card">
              <div class="kicker">Similar problem found</div>
              <h1 style="font-size:36px;">A similar civic problem has already been reported nearby.</h1>

              <div class="grid grid-2">
                <div class="metric card no-shadow">
                  <span class="metric-label">Distance</span>
                  <span class="metric-value">42m</span>
                </div>
                <div class="metric card no-shadow">
                  <span class="metric-label">Reports</span>
                  <span class="metric-value">6</span>
                </div>
              </div>

              <div class="address-card" style="margin-top:18px;">
                <strong>MASTER INCIDENT KMC-042</strong>
                <p style="margin-bottom:0;">Pothole · Ward 20 · ${esc(AppState.location.shortAddress)}</p>
              </div>

              <div class="row" style="margin-top:18px;">
                <button class="secondary-btn" onclick="masterIssue('KMC-042')">VIEW EXISTING INCIDENT</button>
                <button class="primary-btn" onclick="addToMasterIncident()">ADD MY REPORT</button>
              </div>
            </div>

            <div class="card">
              <div class="kicker">Nearby evidence</div>
              <div id="citizen-mini-map" class="map"></div>
              <p class="muted" style="margin-bottom:0;">Map is shown to help explain that nearby reports can belong to the same physical problem.</p>
            </div>
          </div>
        </div>
      </main>
      ${citizenNav("report")}
    </div>
  `;

  setTimeout(() => CivicMap.init("citizen-mini-map"), 50);
}

function renderCitizenConfirm() {
  ensureCitizenDemoState();
  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="narrow">
          <div class="progress-steps">
            <div class="progress-step done">1 PHOTO ✓</div>
            <div class="progress-step done">2 LOCATION ✓</div>
            <div class="progress-step active">3 CONFIRM</div>
          </div>

          <h1 style="font-size:34px;">CHECK YOUR REPORT</h1>

          <div class="stack">
            <div class="photo-preview">
              <img src="${AppState.currentReport.imageUrl}" alt="Report photo">
            </div>

            <div class="card">
              <div class="grid grid-2">
                <div>
                  <div class="kicker">Problem</div>
                  <h3>${esc(AppState.currentReport.problemType)}</h3>
                </div>
                <div>
                  <div class="kicker">Severity</div>
                  <h3>${esc(AppState.currentReport.severity)}</h3>
                </div>
              </div>
              <div class="divider"></div>
              <div class="kicker">Location</div>
              <h3>${esc(AppState.location.address)}</h3>
              <p class="muted">Ward ${esc(AppState.location.ward)}</p>
            </div>

            <div class="card">
              <div class="kicker">Master Incident</div>
              <h2>KMC-042</h2>
              <p style="margin-bottom:0;">Your report will be linked to the existing physical incident.</p>
              <div class="cluster-visual" style="margin-top:16px;">
                <div class="cluster-number">7</div>
                <div>Citizen reports after submission</div>
              </div>
            </div>

            <button class="primary-btn" style="width:100%;" onclick="submitCitizenReport()">SUBMIT REPORT</button>
          </div>
        </div>
      </main>
      ${citizenNav("report")}
    </div>
  `;
}

function renderCitizenSuccess() {
  ensureCitizenDemoState();
  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="narrow">
          <div class="result-hero">
            <div style="font-size:58px;font-weight:950;">✓</div>
            <h1 style="font-size:38px;">REPORT SUBMITTED</h1>
            <p>Your report has been linked to an existing physical civic problem.</p>
            <div class="card no-shadow" style="margin-top:20px;">
              <div class="kicker">Your ticket</div>
              <h2>CF-1024</h2>
              <div class="divider"></div>
              <div class="kicker">Master Incident</div>
              <h2>KMC-042</h2>
              <p style="margin-bottom:0;">7 citizen reports</p>
            </div>
          </div>

          <div class="row" style="margin-top:18px;">
            <button class="primary-btn" style="flex:1;" onclick="go('citizen-track')">TRACK REPORT</button>
            <button class="secondary-btn" style="flex:1;" onclick="go('citizen-reports')">MY REPORTS</button>
          </div>
        </div>
      </main>
      ${citizenNav("home")}
    </div>
  `;
}

function renderCitizenReports() {
  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="container">
          <div class="row between">
            <div>
              <div class="kicker">Citizen space</div>
              <h1 style="font-size:38px;">MY REPORTS</h1>
            </div>
            <button class="primary-btn" onclick="startReport()">REPORT A PROBLEM</button>
          </div>

          <div class="grid grid-2" style="margin-top:20px;">
            <div class="card">
              <div class="row between">
                <strong>POTHOLE</strong>
                <span class="status active">IN PROGRESS</span>
              </div>
              <p>Prathamesh Nagar</p>
              <p class="muted">CF-1024 · Ward 20 · KMC-042</p>
              <button class="secondary-btn small-btn" onclick="go('citizen-track')">TRACK</button>
            </div>
            <div class="card">
              <div class="row between">
                <strong>GARBAGE</strong>
                <span class="status done">RESOLVED</span>
              </div>
              <p>Rajarampuri</p>
              <p class="muted">CF-1018 · Ward 18</p>
            </div>
          </div>
        </div>
      </main>
      ${citizenNav("reports")}
    </div>
  `;
}

function renderCitizenTrack() {
  ensureCitizenDemoState();
  const currentStatus = AppState.currentReport?.status || "In Progress";

  const steps = [
    ["Submitted", true],
    ["AI Analyzed", true],
    ["Incident Linked", true],
    ["Routed", true],
    ["Assigned", true],
    ["In Progress", ["In Progress", "Resolution Submitted", "Citizen Verification", "Closed"].includes(currentStatus)],
    ["Resolution Submitted", ["Resolution Submitted", "Citizen Verification", "Closed"].includes(currentStatus)],
    ["Citizen Verification", ["Citizen Verification", "Closed"].includes(currentStatus)],
    ["Closed", currentStatus === "Closed"]
  ];

  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="narrow">
          <div class="row between">
            <div>
              <div class="kicker">Track report</div>
              <h1 style="font-size:38px;">CF-1024</h1>
            </div>
            <span class="status active">${esc(currentStatus.toUpperCase())}</span>
          </div>

          <div class="card">
            <h2>Pothole</h2>
            <p>${esc(AppState.location.shortAddress)}</p>
            <p class="muted">Ward 20 · Master Incident KMC-042</p>
          </div>

          <div class="card" style="margin-top:18px;">
            <div class="timeline">
              ${steps.map(([label, done]) => `
                <div class="timeline-item ${done ? "done" : ""}">
                  <div class="timeline-dot">${done ? "✓" : ""}</div>
                  <div>
                    <strong>${label}</strong>
                    ${label === "In Progress" && currentStatus === "In Progress" ? `<div class="muted">Municipal work is underway.</div>` : ""}
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="row" style="margin-top:18px;">
            ${["Citizen Verification","Closed"].includes(currentStatus) ? `<button class="primary-btn" style="flex:1;" onclick="go('citizen-verify')">VIEW VERIFICATION</button>` : ""}
            <button class="secondary-btn" style="flex:1;" onclick="go('citizen-home')">BACK HOME</button>
          </div>
        </div>
      </main>
      ${citizenNav("home")}
    </div>
  `;
}

function renderCitizenVerify() {
  ensureCitizenDemoState();

  if (!AppState.currentResolution) {
    AppState.currentResolution = {
      masterIncidentId: "KMC-042",
      beforeImage: "assets/before-pothole.svg",
      afterImage: "assets/after-repaired.svg",
      location: AppState.location.shortAddress,
      ward: "20",
      timestamp: "Demo repair timestamp",
      aiVerification: {
        issueArea: "Appears repaired",
        location: "Matched",
        evidence: "Complete",
        verification: "READY FOR HUMAN REVIEW"
      },
      citizenVerification: null
    };
  }

  const r = AppState.currentResolution;

  app.innerHTML = `
    <div class="citizen-page">
      ${pageHeader()}
      <main class="citizen-content">
        <div class="narrow">
          <div class="kicker">Final citizen check</div>
          <h1 style="font-size:38px;">PROBLEM REPORTED AS FIXED</h1>

          <div class="grid grid-2">
            <div class="card">
              <div class="kicker">Before</div>
              <img src="${r.beforeImage}" alt="Before repair" style="border:1px solid #d7e3f4;border-radius:12px;">
            </div>
            <div class="card">
              <div class="kicker">After</div>
              <img src="${r.afterImage}" alt="After repair" style="border:1px solid #d7e3f4;border-radius:12px;">
            </div>
          </div>

          <div class="card" style="margin-top:18px;">
            <div class="grid grid-2">
              <div>
                <div class="kicker">Location</div>
                <strong>${esc(r.location)}</strong>
              </div>
              <div>
                <div class="kicker">Repair time</div>
                <strong>${esc(r.timestamp)}</strong>
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:18px;">
            <div class="ai-label">AI-assisted verification</div>
            <div class="list" style="margin-top:16px;">
              <div class="list-item"><strong>Issue area:</strong> ${esc(r.aiVerification?.issueArea || "Appears repaired")}</div>
              <div class="list-item"><strong>Location:</strong> ${esc(r.aiVerification?.location || "Matched")}</div>
              <div class="list-item"><strong>Evidence:</strong> ${esc(r.aiVerification?.evidence || "Complete")}</div>
              <div class="list-item"><strong>Verification:</strong> ${esc(r.aiVerification?.verification || "READY FOR HUMAN REVIEW")}</div>
            </div>
          </div>

          ${AppState.currentMasterIncident?.status === "Closed" ? `
            <div class="result-hero" style="margin-top:18px;">
              <div style="font-size:52px;font-weight:950;">✓</div>
              <h2>MASTER INCIDENT CLOSED</h2>
              <p>Thank you for confirming the repair.</p>
              <button class="secondary-btn" onclick="go('citizen-home')">BACK HOME</button>
            </div>
          ` : AppState.currentMasterIncident?.status === "Reopened" ? `
            <div class="result-hero" style="margin-top:18px;">
              <div class="ai-label">REOPENED</div>
              <h2>MASTER INCIDENT REOPENED</h2>
              <p>Your report remains linked to the physical incident for further action.</p>
              <button class="secondary-btn" onclick="go('citizen-track')">TRACK AGAIN</button>
            </div>
          ` : `
            <div class="card" style="margin-top:18px;">
              <h2>WAS THE PROBLEM FIXED?</h2>
              <div class="grid grid-2">
                <button class="primary-btn" onclick="verifyFixed()">YES, FIXED</button>
                <button class="secondary-btn" onclick="reopenIncident()">NO, STILL A PROBLEM</button>
              </div>
            </div>
          `}
        </div>
      </main>
      ${citizenNav("reports")}
    </div>
  `;
}

function adminSidebar(active) {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">CF</div>
        <div>
          <div>AI CivicFix</div>
          <div class="brand-sub">Municipal Operations</div>
        </div>
      </div>

      <div class="sidebar-nav">
        <button class="${active==="dashboard"?"active":""}" onclick="go('admin-dashboard')">Dashboard</button>
        <button class="${active==="issues"?"active":""}" onclick="go('admin-master-issues')">Master Incidents</button>
        <button class="${active==="department"?"active":""}" onclick="go('admin-department')">Department</button>
        <button class="${active==="map"?"active":""}" onclick="go('admin-map')">Map</button>
        <button class="${active==="resolution"?"active":""}" onclick="go('admin-resolution')">Resolution</button>
        <button class="${active==="analytics"?"active":""}" onclick="go('admin-analytics')">Analytics</button>
      </div>
    </aside>
  `;
}

function adminTopbar() {
  return `
    <header class="admin-topbar">
      <div>
        <strong>${esc(AppState.currentUser?.name || "KMC Demo Administrator")}</strong>
        <div class="brand-sub">${esc(AppState.currentUser?.role || "Super Admin")}</div>
      </div>
      <div class="row">
        <span class="demo-label">Demo Data</span>
        <button class="ghost-btn small-btn" onclick="logout()">Logout</button>
      </div>
    </header>
  `;
}

function renderAdminDashboard() {
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar("dashboard")}
      <div class="admin-main">
        ${adminTopbar()}
        <main class="admin-content">
          <div class="role-banner">
            <div class="kicker">Kolhapur Municipal Corporation</div>
            <h2>KMC MUNICIPAL OPERATIONS</h2>
            <p>Incident orchestration dashboard — Demo Data</p>
          </div>

          <section class="section compact">
            <div class="grid grid-4">
              ${[
                ["128","MASTER INCIDENTS"],
                ["21","HIGH PRIORITY"],
                ["46","PENDING"],
                ["33","IN PROGRESS"],
                ["8","OVERDUE"],
                ["49","RESOLVED"],
                ["47","DUPLICATE REPORTS"],
                ["12","RELATED CLUSTERS"]
              ].map(([v,l]) => `
                <div class="card metric">
                  <span class="metric-label">${l}</span>
                  <span class="metric-value">${v}</span>
                </div>
              `).join("")}
            </div>
          </section>

          <div class="grid grid-2">
            <div class="card">
              <div class="kicker">Central command flow</div>
              <div class="flow-chain" style="margin-top:16px;">
                <div class="flow-node">CITIZEN REPORTS</div>
                <div class="flow-arrow">↓</div>
                <div class="flow-node">MASTER INCIDENTS</div>
                <div class="flow-arrow">↓</div>
                <div class="flow-node">WORK ORDERS</div>
                <div class="flow-arrow">↓</div>
                <div class="flow-node">FIELD ACTION</div>
                <div class="flow-arrow">↓</div>
                <div class="flow-node">VERIFIED FIXES</div>
              </div>
            </div>

            <div class="card">
              <div class="kicker">Featured incident</div>
              <h2>KMC-042</h2>
              <p><strong>Pothole</strong> · Ward 20 · 7 reports</p>
              <p>Prathamesh Nagar, Salokhe Nagar, Kalamba</p>
              <div class="row">
                <span class="status active">ASSIGNED</span>
                <button class="primary-btn small-btn" onclick="masterIssue('KMC-042')">OPEN INCIDENT</button>
              </div>
            </div>
          </div>

          <section class="section compact">
            <div class="row between">
              <div>
                <div class="kicker">Quick view</div>
                <h2 style="font-size:30px;">Master Incidents</h2>
              </div>
              <button class="secondary-btn small-btn" onclick="go('admin-master-issues')">VIEW ALL</button>
            </div>

            <div class="table-wrap card" style="padding:0;">
              <table class="data-table">
                <thead><tr><th>ID</th><th>Problem</th><th>Location</th><th>Ward</th><th>Reports</th><th>Department</th><th>Status</th></tr></thead>
                <tbody>
                  ${AppData.masterIssues.map(i => `
                    <tr class="clickable" onclick="masterIssue('${i.id}')">
                      <td><strong>${i.id}</strong></td>
                      <td>${i.problemType}</td>
                      <td>${i.address}</td>
                      <td>${i.ward}</td>
                      <td>${i.reports}</td>
                      <td>${i.department}</td>
                      <td><span class="status ${i.status==="Resolved"?"done":"active"}">${i.status}</span></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  `;
}

function renderAdminMasterIssues() {
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar("issues")}
      <div class="admin-main">
        ${adminTopbar()}
        <main class="admin-content">
          <div class="row between">
            <div>
              <div class="kicker">KMC municipal operations</div>
              <h1 style="font-size:42px;">MASTER INCIDENTS</h1>
            </div>
            <span class="demo-label">Demo Data</span>
          </div>

          <div class="card" style="margin:18px 0;">
            <div class="grid grid-4">
              <select class="select"><option>All Departments</option></select>
              <select class="select"><option>All Wards</option></select>
              <select class="select"><option>All Severity</option></select>
              <select class="select"><option>All Status</option></select>
            </div>
          </div>

          <div class="card" style="padding:0;">
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>ID</th><th>Problem</th><th>Location</th><th>Ward</th><th>Reports</th><th>Severity</th><th>Department</th><th>Status</th></tr>
                </thead>
                <tbody>
                  ${AppData.masterIssues.map(i => `
                    <tr class="clickable" onclick="masterIssue('${i.id}')">
                      <td><strong>${i.id}</strong></td>
                      <td>${i.problemType}</td>
                      <td>${i.address}</td>
                      <td>${i.ward}</td>
                      <td>${i.reports}</td>
                      <td>${i.severity}</td>
                      <td>${i.department}</td>
                      <td><span class="status ${i.status==="Resolved"?"done":"active"}">${i.status}</span></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;
}

function renderAdminMasterIssue() {
  ensureCitizenDemoState();
  const i = AppState.currentMasterIncident;
  const reports = AppData.citizenReports;

  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar("issues")}
      <div class="admin-main">
        ${adminTopbar()}
        <main class="admin-content">
          <div class="row between">
            <div>
              <div class="kicker">Master Incident</div>
              <h1 style="font-size:44px;">${i.id}</h1>
              <h2>${i.problemType}</h2>
            </div>
            <div class="row">
              <span class="status active">${i.severity.toUpperCase()}</span>
              <span class="status ${i.status==="Resolved"?"done":"active"}">${i.status.toUpperCase()}</span>
            </div>
          </div>

          <div class="cluster-visual" style="margin:20px 0;">
            <div class="grid grid-3" style="align-items:center;">
              <div><div class="cluster-number">7</div><div>Citizen Reports</div></div>
              <div style="font-size:34px;font-weight:950;">→<br><span style="font-size:16px;">ONE INCIDENT</span></div>
              <div><div class="cluster-number">1</div><div>Municipal Action</div></div>
            </div>
          </div>

          <div class="grid grid-2">
            <div class="card">
              <div class="kicker">Incident summary</div>
              <div class="list">
                <div class="list-item"><strong>Problem:</strong> ${i.problemType}</div>
                <div class="list-item"><strong>Location:</strong> ${i.address}</div>
                <div class="list-item"><strong>Ward:</strong> ${i.ward}</div>
                <div class="list-item"><strong>Reports:</strong> ${i.reports}</div>
                <div class="list-item"><strong>Responsible Department:</strong> ${i.department}</div>
                <div class="list-item"><strong>Assignment:</strong> ${i.assignment}</div>
              </div>
            </div>

            <div class="card">
              <div class="kicker">Automatic municipal routing</div>
              <div class="flow-chain" style="margin-top:14px;">
                <div class="flow-node">KMC</div>
                <div class="flow-arrow">↓</div>
                <div class="flow-node">WARD ${i.ward}</div>
                <div class="flow-arrow">↓</div>
                <div class="flow-node">${i.department}</div>
                <div class="flow-arrow">↓</div>
                <div class="flow-node">${i.assignment}</div>
              </div>
              <div class="callout" style="margin-top:18px;">
                <strong>Why was this routed here?</strong>
                <p style="margin-bottom:0;">AI identified a road problem. Location falls inside KMC. Ward 20 was identified. Configured routing rules map potholes to City Engineer / PWD.</p>
              </div>
            </div>
          </div>

          <section class="section compact">
            <div class="row between">
              <div>
                <div class="kicker">Citizen evidence</div>
                <h2 style="font-size:30px;">LINKED REPORTS</h2>
              </div>
              <span class="status done">LINKED — NOT DELETED</span>
            </div>

            <div class="evidence-grid">
              ${reports.map((r, idx) => `
                <div class="evidence-card">
                  <img src="assets/report-${String((idx%7)+1).padStart(2,"0")}.svg" alt="Citizen evidence ${idx+1}">
                  <strong>${r.id}</strong>
                  <div class="muted">${r.distance} · ${r.time}</div>
                  <div class="muted">${r.description}</div>
                </div>
              `).join("")}
            </div>
          </section>

          <div class="grid grid-2">
            <div class="card">
              <div class="kicker">Location</div>
              <h3>${i.address}</h3>
              <p>Ward ${i.ward}</p>
              <div id="incident-map" class="map"></div>
              <p class="muted">Map markers represent demo evidence. The exact citizen GPS is not shown here.</p>
            </div>

            <div class="action-card">
              <div class="kicker">Municipal action card</div>
              <h2>WORK ORDER ${i.workOrderId}</h2>
              <div class="list">
                <div class="list-item"><strong>Problem:</strong> Severe ${i.problemType.toLowerCase()}</div>
                <div class="list-item"><strong>Location:</strong> ${i.address}</div>
                <div class="list-item"><strong>Department:</strong> ${i.department}</div>
                <div class="list-item"><strong>Assignment:</strong> ${i.assignment}</div>
                <div class="list-item"><strong>Priority:</strong> ${i.severity}</div>
                <div class="list-item"><strong>Action:</strong> ${i.recommendedAction}</div>
              </div>

              <div style="margin-top:18px;">
                <div class="kicker">Closure evidence required</div>
                <div class="checkbox-row">Before photo</div>
                <div class="checkbox-row">After photo</div>
                <div class="checkbox-row">GPS</div>
                <div class="checkbox-row">Timestamp</div>
              </div>

              <button class="primary-btn" style="width:100%;margin-top:18px;" onclick="startWork()">START WORK</button>
            </div>
          </div>

          <section class="section compact">
            <div class="card">
              <div class="kicker">Related incident analysis</div>
              <h2 style="font-size:28px;">Possible infrastructure relationship</h2>
              <p>Nearby road crack and drainage observations are shown as a possible related pattern.</p>
              <div class="callout"><strong>Field inspection required before determining cause.</strong></div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `;

  setTimeout(() => CivicMap.init("incident-map"), 50);
}

function renderAdminDepartment() {
  const deptName = departmentForCurrentUser();
  const dept = AppData.departments.find(d => d.name === deptName) || AppData.departments[0];
  const issues = AppData.masterIssues.filter(i => i.department === dept.name);

  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar("department")}
      <div class="admin-main">
        ${adminTopbar()}
        <main class="admin-content">
          <div class="role-banner">
            <div class="kicker">Department Operations</div>
            <h2>${esc(dept.name)}</h2>
            <p>${esc(dept.officer)} · ${esc(dept.designation)}</p>
            <span class="demo-label">Official directory reference / demo use</span>
          </div>

          <section class="section compact">
            <div class="grid grid-4">
              ${[
                ["04","NEW"],
                ["06","ASSIGNED"],
                ["09","IN PROGRESS"],
                ["03","OVERDUE"],
                ["18","RESOLVED"]
              ].map(([v,l]) => `
                <div class="card metric">
                  <span class="metric-label">${l}</span>
                  <span class="metric-value">${v}</span>
                </div>
              `).join("")}
            </div>
          </section>

          <div class="row between">
            <div>
              <div class="kicker">Department queue</div>
              <h2 style="font-size:30px;">MY DEPARTMENT'S MASTER INCIDENTS</h2>
            </div>
            <span class="demo-label">${esc(dept.name)}</span>
          </div>

          <div class="card" style="padding:0;margin-top:16px;">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>ID</th><th>Problem</th><th>Location</th><th>Ward</th><th>Reports</th><th>Severity</th><th>Status</th></tr></thead>
                <tbody>
                  ${issues.length ? issues.map(i => `
                    <tr class="clickable" onclick="masterIssue('${i.id}')">
                      <td><strong>${i.id}</strong></td>
                      <td>${i.problemType}</td>
                      <td>${i.address}</td>
                      <td>${i.ward}</td>
                      <td>${i.reports}</td>
                      <td>${i.severity}</td>
                      <td><span class="status ${i.status==="Resolved"?"done":"active"}">${i.status}</span></td>
                    </tr>
                  `).join("") : `
                    <tr><td colspan="7">No seeded incidents for this department yet.</td></tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;
}

function renderAdminMap() {
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar("map")}
      <div class="admin-main">
        ${adminTopbar()}
        <main class="admin-content">
          <div class="kicker">Spatial operations</div>
          <h1 style="font-size:42px;">INCIDENT MAP</h1>
          <p class="muted">Master incidents + citizen evidence + related patterns.</p>
          <div id="incident-map" class="map"></div>
          <div class="grid grid-3" style="margin-top:18px;">
            <div class="card"><strong>Master Incidents</strong><p class="muted">Primary physical work objects</p></div>
            <div class="card"><strong>Citizen Evidence</strong><p class="muted">Reports linked to incidents</p></div>
            <div class="card"><strong>Related Incidents</strong><p class="muted">Patterns requiring inspection</p></div>
          </div>
        </main>
      </div>
    </div>
  `;

  setTimeout(() => CivicMap.init("incident-map"), 50);
}

function renderAdminResolution() {
  if (!AppState.currentResolution) {
    AppState.currentResolution = {
      masterIncidentId: "KMC-042",
      beforeImage: "assets/before-pothole.svg",
      afterImage: "assets/after-repaired.svg",
      location: AppState.location.shortAddress,
      ward: "20",
      timestamp: "Demo repair timestamp",
      aiVerification: null
    };
  }

  const r = AppState.currentResolution;

  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar("resolution")}
      <div class="admin-main">
        ${adminTopbar()}
        <main class="admin-content">
          <div class="kicker">Resolution evidence</div>
          <h1 style="font-size:42px;">RESOLUTION VERIFICATION</h1>
          <p class="muted">Before + After + Location + Timestamp → AI-assisted review → Citizen confirmation.</p>

          <div class="grid grid-2">
            <div class="card">
              <div class="kicker">Before</div>
              <img src="${r.beforeImage}" alt="Before">
            </div>
            <div class="card">
              <div class="kicker">After</div>
              <img src="${r.afterImage}" alt="After">
            </div>
          </div>

          <div class="grid grid-3" style="margin-top:18px;">
            <div class="card"><div class="kicker">Location</div><strong>${esc(r.location)}</strong></div>
            <div class="card"><div class="kicker">GPS</div><strong>Matched</strong></div>
            <div class="card"><div class="kicker">Timestamp</div><strong>${esc(r.timestamp)}</strong></div>
          </div>

          <div class="card" style="margin-top:18px;">
            <div class="ai-label">AI-assisted verification</div>
            <div class="grid grid-3" style="margin-top:16px;">
              <div class="list-item"><strong>Issue area</strong><p>${esc(r.aiVerification?.issueArea || "Pending check")}</p></div>
              <div class="list-item"><strong>Location</strong><p>${esc(r.aiVerification?.location || "Pending check")}</p></div>
              <div class="list-item"><strong>Evidence</strong><p>${esc(r.aiVerification?.evidence || "Pending check")}</p></div>
            </div>

            <p style="margin-top:18px;"><strong>${esc(r.aiVerification?.verification || "READY TO CHECK")}</strong></p>

            <div class="row">
              <button class="secondary-btn" onclick="runResolutionVerification()">RUN AI-ASSISTED CHECK</button>
              <button class="primary-btn" onclick="sendToCitizen()">SEND TO CITIZEN</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;
}

function renderAdminAnalytics() {
  app.innerHTML = `
    <div class="admin-layout">
      ${adminSidebar("analytics")}
      <div class="admin-main">
        ${adminTopbar()}
        <main class="admin-content">
          <div class="kicker">Command analytics</div>
          <h1 style="font-size:42px;">ANALYTICS</h1>
          <p class="muted">Seeded demonstration metrics for the hackathon prototype.</p>

          <div class="grid grid-2">
            <div class="card chart-box"><div class="kicker">Issues by Department</div><canvas id="departmentChart"></canvas></div>
            <div class="card chart-box"><div class="kicker">Issues by Status</div><canvas id="statusChart"></canvas></div>
            <div class="card chart-box"><div class="kicker">Issues by Problem Type</div><canvas id="problemChart"></canvas></div>
            <div class="card chart-box">
              <div class="kicker">Operational view</div>
              <div class="metric">
                <span class="metric-label">REPORTS CONSOLIDATED</span>
                <span class="metric-value">214</span>
                <div class="callout">The important operational unit is the physical incident, not the individual complaint.</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `;

  setTimeout(() => CivicCharts.init(), 50);
}

function renderFieldWork() {
  ensureCitizenDemoState();
  app.innerHTML = `
    <div class="field-page">
      ${pageHeader()}
      <main class="field-main">
        <div class="kicker">Field Operations</div>
        <h1 style="font-size:42px;">MY WORK</h1>

        <div class="work-card">
          <div class="row between">
            <div>
              <h2>KMC-042</h2>
              <h3>POTHOLE</h3>
            </div>
            <span class="status ${AppState.currentMasterIncident.status==="Closed"?"done":"active"}">${AppState.currentMasterIncident.status.toUpperCase()}</span>
          </div>

          <p><strong>Prathamesh Nagar</strong><br>Ward 20<br>7 citizen reports</p>

          <div class="callout">
            <strong>Assigned to:</strong><br>
            Concerned Sub-City Engineer
          </div>

          <button class="primary-btn" style="width:100%;margin-top:18px;" onclick="startWork()">START WORK</button>
        </div>
      </main>
    </div>
  `;
}

function renderFieldIssue() {
  ensureCitizenDemoState();

  app.innerHTML = `
    <div class="field-page">
      ${pageHeader()}
      <main class="field-main">
        <div class="kicker">Work order WO-1042</div>
        <h1 style="font-size:40px;">KMC-042</h1>

        <div class="work-card">
          <div class="work-status">WORK IN PROGRESS</div>
          <p>Severe pothole · Ward 20</p>

          <div class="callout">
            <strong>Action:</strong> Field inspection + road repair
          </div>

          <div class="divider"></div>

          <div class="field">
            <label class="label">Upload after photo</label>
            <input id="after-photo" class="input" type="file" accept="image/*" onchange="fieldAfterPhoto(this.files[0])">
          </div>

          <div id="after-preview" class="photo-preview hidden"></div>

          <button class="primary-btn" style="width:100%;margin-top:18px;" onclick="completeWork()">COMPLETE WORK</button>
        </div>
      </main>
    </div>
  `;
}

function fieldAfterPhoto(file) {
  if (!file) return;
  CivicService.uploadImage(file).then(url => {
    const box = document.getElementById("after-preview");
    if (!box) return;
    box.classList.remove("hidden");
    box.innerHTML = `<img src="${url}" alt="After photo">`;
    if (!AppState.currentResolution) {
      AppState.currentResolution = {
        masterIncidentId: "KMC-042",
        beforeImage: "assets/before-pothole.svg",
        afterImage: url,
        location: AppState.location.shortAddress,
        ward: "20",
        timestamp: "Demo repair timestamp",
        aiVerification: null
      };
    } else {
      AppState.currentResolution.afterImage = url;
    }
    saveDemoState();
  });
}

function render() {
  switch (AppState.view) {
    case "login": return renderLogin();
    case "citizen-home": return renderCitizenHome();
    case "citizen-report": return renderCitizenReport();
    case "citizen-analysis": return renderCitizenAnalysis();
    case "citizen-location": return renderCitizenLocation();
    case "citizen-duplicate": return renderCitizenDuplicate();
    case "citizen-confirm": return renderCitizenConfirm();
    case "citizen-success": return renderCitizenSuccess();
    case "citizen-reports": return renderCitizenReports();
    case "citizen-track": return renderCitizenTrack();
    case "citizen-verify": return renderCitizenVerify();
    case "admin-dashboard": return renderAdminDashboard();
    case "admin-master-issues": return renderAdminMasterIssues();
    case "admin-master-issue": return renderAdminMasterIssue();
    case "admin-department": return renderAdminDepartment();
    case "admin-map": return renderAdminMap();
    case "admin-resolution": return renderAdminResolution();
    case "admin-analytics": return renderAdminAnalytics();
    case "field-work": return renderFieldWork();
    case "field-issue": return renderFieldIssue();
    default: return renderLogin();
  }
}

function initApp() {
  if (AppState.currentUser) {
    if (AppState.view === "login") {
      if (AppState.currentUser.role === "Citizen") AppState.view = "citizen-home";
      else if (AppState.currentUser.role === "Super Admin") AppState.view = "admin-dashboard";
      else if (AppState.currentUser.role === "Department Admin") AppState.view = "admin-department";
      else AppState.view = "field-work";
    }
  }
  render();
}

initApp();
