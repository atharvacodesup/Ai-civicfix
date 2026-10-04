// =========================================================
// AI CivicFix — Admin Application Logic
// Super Admin Dashboard, Master Incidents, Department Operations,
// Incident Detail, Leaflet Map, Resolution Review & Analytics
// =========================================================

window.AdminApp = {
  // 1. Dashboard
  async initDashboard() {
    const tableBody = document.getElementById("admin-dashboard-table");
    let service = window.ReportsService;
    if (!service) {
      try { service = await import("../js/reports.js"); } catch (e) {}
    }
    const incidents = (service?.getMasterIncidents ? await service.getMasterIncidents() : null) || [];
    
    // Update metric counters from real Firestore documents
    const mMaster = document.getElementById("metric-dash-master");
    const mHigh = document.getElementById("metric-dash-high");
    const mPending = document.getElementById("metric-dash-pending");
    const mInprogress = document.getElementById("metric-dash-inprogress");
    const mResolved = document.getElementById("metric-dash-resolved");
    const mReports = document.getElementById("metric-dash-reports");
    const mClusters = document.getElementById("metric-dash-clusters");

    if (mMaster) mMaster.textContent = incidents.length;
    if (mHigh) mHigh.textContent = incidents.filter(i => {
      const s = (i.severity || "").toUpperCase();
      return s === "HIGH" || s === "CRITICAL";
    }).length;
    if (mPending) mPending.textContent = incidents.filter(i => {
      const st = (i.status || "").toUpperCase();
      return st === "PENDING" || st === "ASSIGNED";
    }).length;
    if (mInprogress) mInprogress.textContent = incidents.filter(i => {
      const st = (i.status || "").toUpperCase();
      return st.includes("PROGRESS");
    }).length;
    if (mResolved) mResolved.textContent = incidents.filter(i => {
      const st = (i.status || "").toUpperCase();
      return st === "RESOLVED" || st === "CLOSED";
    }).length;
    if (mReports) {
      const totalReps = incidents.reduce((sum, i) => sum + (Number(i.reportsCount || i.reports) || 1), 0);
      mReports.textContent = totalReps;
    }
    if (mClusters) {
      mClusters.textContent = incidents.filter(i => {
        const st = (i.status || "").toUpperCase();
        return st !== "CLOSED" && st !== "RESOLVED";
      }).length;
    }

    // Featured Incident Card
    const fId = document.getElementById("featured-incident-id");
    const fInfo = document.getElementById("featured-incident-info");
    const fLoc = document.getElementById("featured-incident-loc");
    const fStatus = document.getElementById("featured-incident-status");
    const fLink = document.getElementById("featured-incident-link");
    if (fId && fInfo && fLoc) {
      if (incidents.length > 0) {
        const topInc = incidents[0];
        fId.textContent = topInc.id;
        fInfo.textContent = `${topInc.problemType || topInc.category || "Issue"} · Ward ${topInc.ward || "--"} · ${topInc.reportsCount || topInc.reports || 1} report(s)`;
        fLoc.textContent = topInc.address || topInc.locationText || "Kolhapur service area";
        if (fStatus) {
          fStatus.textContent = (topInc.status || "ASSIGNED").toUpperCase();
          fStatus.style.display = "inline-block";
        }
        if (fLink) {
          fLink.href = `master-issue.html?id=${encodeURIComponent(topInc.id)}`;
          fLink.style.display = "inline-block";
        }
      } else {
        fId.textContent = "No active incidents";
        fInfo.textContent = "No incidents recorded";
        fLoc.textContent = "Incoming civic issues will be orchestrated here.";
        if (fStatus) fStatus.style.display = "none";
        if (fLink) fLink.style.display = "none";
      }
    }

    if (tableBody) {
      if (incidents.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">No master incidents recorded.</td></tr>`;
      } else {
        tableBody.innerHTML = incidents.slice(0, 5).map(i => `
          <tr class="clickable" onclick="window.location.href='master-issue.html?id=${encodeURIComponent(i.id)}'">
            <td><strong>${window.esc ? window.esc(i.id) : i.id}</strong></td>
            <td>${window.esc ? window.esc(i.problemType || i.category) : (i.problemType || i.category)}</td>
            <td>${window.esc ? window.esc(i.address || i.locationText) : (i.address || i.locationText)}</td>
            <td>${window.esc ? window.esc(i.ward) : i.ward}</td>
            <td>${i.reportsCount || i.reports || 1}</td>
            <td>${window.esc ? window.esc(i.department) : i.department}</td>
            <td><span class="status ${(i.status === "Resolved" || i.status === "Closed" || i.status === "RESOLVED" || i.status === "CLOSED") ? "done" : "active"}">${window.esc ? window.esc(i.status) : i.status}</span></td>
          </tr>
        `).join("");
      }
    }
  },

  // 2. Master Incidents List & Filters
  async initMasterIssues() {
    let service = window.ReportsService;
    if (!service) {
      try { service = await import("../js/reports.js"); } catch (e) {}
    }
    this._cachedMasterIssues = (service?.getMasterIncidents ? await service.getMasterIncidents() : null) || [];
    this.renderIssuesTable();

    const deptFilter = document.getElementById("filter-dept");
    const wardFilter = document.getElementById("filter-ward");
    const sevFilter = document.getElementById("filter-sev");
    const statusFilter = document.getElementById("filter-status");

    [deptFilter, wardFilter, sevFilter, statusFilter].forEach(el => {
      if (el) el.addEventListener("change", () => this.renderIssuesTable());
    });
  },

  renderIssuesTable() {
    const tableBody = document.getElementById("admin-issues-table");
    const issues = this._cachedMasterIssues || [];
    if (!tableBody) return;

    if (issues.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px 16px;"><div style="font-size:32px;margin-bottom:8px;">📋</div><strong style="color:var(--blue);font-size:16px;">No master incidents found.</strong><p class="muted" style="margin:4px 0 0;font-size:13px;">New master incidents will automatically appear here when civic problems are reported.</p></td></tr>`;
      return;
    }

    const deptVal = document.getElementById("filter-dept")?.value || "All";
    const wardVal = document.getElementById("filter-ward")?.value || "All";
    const sevVal = document.getElementById("filter-sev")?.value || "All";
    const statusVal = document.getElementById("filter-status")?.value || "All";

    const filtered = issues.filter(i => {
      if (deptVal !== "All" && i.department !== deptVal) return false;
      if (wardVal !== "All" && String(i.ward) !== String(wardVal)) return false;
      if (sevVal !== "All" && (i.severity || "").toLowerCase() !== sevVal.toLowerCase()) return false;
      if (statusVal !== "All" && (i.status || "").toLowerCase() !== statusVal.toLowerCase()) return false;
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;">No master incidents match the selected filters.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(i => `
      <tr class="clickable" onclick="window.location.href='master-issue.html?id=${encodeURIComponent(i.id)}'">
        <td><strong>${window.esc ? window.esc(i.id) : i.id}</strong></td>
        <td>${window.esc ? window.esc(i.problemType || i.category) : (i.problemType || i.category)}</td>
        <td>${window.esc ? window.esc(i.address || i.locationText) : (i.address || i.locationText)}</td>
        <td>${window.esc ? window.esc(i.ward) : i.ward}</td>
        <td>${i.reportsCount || i.reports || 1}</td>
        <td>${window.esc ? window.esc(i.severity) : i.severity}</td>
        <td>${window.esc ? window.esc(i.department) : i.department}</td>
        <td><span class="status ${(i.status === "Resolved" || i.status === "Closed" || i.status === "RESOLVED" || i.status === "CLOSED") ? "done" : "active"}">${window.esc ? window.esc(i.status) : i.status}</span></td>
      </tr>
    `).join("");
  },

  async initMasterIssue() {
    const urlParams = new URLSearchParams(window.location.search);
    const incidentId = urlParams.get("id");

    let service = window.ReportsService;
    if (!service) {
      try { service = await import("../js/reports.js"); } catch (e) {}
    }

    const idEl = document.getElementById("issue-id");
    const typeEl = document.getElementById("issue-type");
    const sevEl = document.getElementById("issue-severity");
    const statusEl = document.getElementById("issue-status");
    const reportsEl = document.getElementById("issue-reports-count");
    const evidenceGrid = document.getElementById("issue-evidence-grid");

    if (!incidentId) {
      if (idEl) idEl.textContent = "None Selected";
      if (typeEl) typeEl.textContent = "No Incident Selected";
      if (reportsEl) reportsEl.textContent = "0";
      if (evidenceGrid) {
        evidenceGrid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 32px;"><p class="muted" style="margin:0;">No master incident specified. Please select an incident from the master issues list.</p></div>`;
      }
      return;
    }

    const issue = (service?.getMasterIncidentById ? await service.getMasterIncidentById(incidentId) : null);
    if (!issue) {
      if (idEl) idEl.textContent = incidentId;
      if (typeEl) typeEl.textContent = "Master Incident";
      if (statusEl) statusEl.textContent = "NOT FOUND";
      if (reportsEl) reportsEl.textContent = "0";
      if (evidenceGrid) {
        evidenceGrid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 32px;"><p class="muted" style="margin:0;">Master Incident ${window.esc ? window.esc(incidentId) : incidentId} was not found in Firestore.</p></div>`;
      }
      return;
    }

    window.AppState.currentMasterIncident = issue;
    window.saveState();

    // Fill Title & Problem
    if (idEl) idEl.textContent = issue.id;
    if (typeEl) typeEl.textContent = issue.problemType || issue.category || "General Civic Issue";
    if (sevEl) sevEl.textContent = (issue.severity || "NORMAL").toUpperCase();
    if (statusEl) statusEl.textContent = (issue.status || "ASSIGNED").toUpperCase();

    // Load Real Citizen Evidence from Firestore
    let linkedReports = [];
    if (service?.getReportsByMasterIncident) {
      linkedReports = await service.getReportsByMasterIncident(incidentId);
    }

    const finalCount = linkedReports.length > 0 ? linkedReports.length : (Number(issue.reportsCount || issue.reports) || 0);
    if (reportsEl) reportsEl.textContent = finalCount;

    const countHeading = document.querySelector("section.compact h2");
    if (countHeading) {
      countHeading.textContent = `LINKED REPORTS (${finalCount})`;
    }

    if (evidenceGrid) {
      if (linkedReports.length > 0) {
        evidenceGrid.innerHTML = linkedReports.map((r, idx) => {
          const displayId = r.displayId || ("CF-" + (r.id || "").slice(0, 8).toUpperCase());
          const timeStr = service?.formatReportDate ? service.formatReportDate(r.createdAt || r.rawCreatedAt) : "Recently";
          const imgSrc = r.imageUrl || `../assets/report-${String((idx % 7) + 1).padStart(2, "0")}.svg`;
          const desc = r.description || `${r.category || "Problem"} reported by citizen.`;
          const loc = r.locationText || `Ward ${r.ward || "--"}`;

          return `
            <div class="evidence-card" style="cursor:pointer;" onclick="window.location.href='../citizen/track.html?id=${encodeURIComponent(r.id)}'">
              <img src="${window.esc ? window.esc(imgSrc) : imgSrc}" alt="${window.esc ? window.esc(displayId) : displayId}" style="height:140px;object-fit:cover;border-radius:8px;">
              <div class="row between" style="margin-top:8px;">
                <strong>${window.esc ? window.esc(displayId) : displayId}</strong>
                <span class="status ${(r.status === "RESOLVED" || r.status === "CLOSED") ? "done" : "active"}" style="font-size:11px;">${window.esc ? window.esc(r.status || "SUBMITTED") : (r.status || "SUBMITTED")}</span>
              </div>
              <div class="muted" style="font-size:13px;margin:2px 0;">${window.esc ? window.esc(loc) : loc} · ${window.esc ? window.esc(timeStr) : timeStr}</div>
              <div style="font-size:14px;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${window.esc ? window.esc(desc) : desc}</div>
            </div>
          `;
        }).join("");
      } else {
        evidenceGrid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 24px;"><p class="muted" style="margin:0;">No linked citizen reports for this incident yet.</p></div>`;
      }
    }

    // Render Jurisdiction Resolver Chain
    const resolverEl = document.getElementById("jurisdiction-resolver-chain");
    if (resolverEl && window.Routing) {
      const chain = window.Routing.getResolutionChain(issue.problemType || issue.category, issue.ward);
      resolverEl.innerHTML = chain.map((step, idx) => `
        <div class="flow-node" style="padding:10px;">${window.esc(step)}</div>
        ${idx < chain.length - 1 ? `<div class="flow-arrow" style="font-size:16px;">↓</div>` : ""}
      `).join("");
    }

    const explanationEl = document.getElementById("resolver-explanation");
    if (explanationEl && window.Routing) {
      explanationEl.textContent = window.Routing.getRoutingExplanation(issue.problemType || issue.category, issue.ward);
    }

    // Render Work Order Info
    const wo = (window.CivicService && window.CivicService.generateWorkOrder) ? window.CivicService.generateWorkOrder(issue) : {
      id: issue.workOrderId || "WO-1042",
      action: issue.recommendedAction || "Field inspection + road repair",
      department: issue.department || "City Engineer / PWD",
      assignment: issue.assignment || "Concerned Sub-City Engineer"
    };
    const woIdEl = document.getElementById("wo-id");
    const woActionEl = document.getElementById("wo-action");
    const woDeptEl = document.getElementById("wo-dept");
    const woAssignEl = document.getElementById("wo-assign");

    if (woIdEl) woIdEl.textContent = wo.id;
    if (woActionEl) woActionEl.textContent = wo.action;
    if (woDeptEl) woDeptEl.textContent = wo.department;
    if (woAssignEl) woAssignEl.textContent = wo.assignment;

    // Initialize Map
    setTimeout(() => {
      if (window.CivicMap) {
        window.CivicMap.init("incident-map");
      }
    }, 100);

    const startWorkBtn = document.getElementById("start-work-btn");
    if (startWorkBtn) {
      startWorkBtn.addEventListener("click", () => {
        issue.status = "In Progress";
        if (window.AppState.currentReport) {
          window.AppState.currentReport.status = "In Progress";
        }
        window.saveState();
        window.location.href = "../field/work.html";
      });
    }
  },

  // 4. Reusable Department Dashboard with Real Firestore Data
  initDepartment() {
    let activeUnsubscribe = null;
    let cachedReports = [];

    const getUser = () => {
      let u = null;
      try {
        const raw = localStorage.getItem("currentUser");
        if (raw) u = JSON.parse(raw);
      } catch (e) {}
      return u || window.Auth?.getCurrentUser() || window.AppState?.currentUser || null;
    };

    const setupDashboard = (user) => {
      const userRole = ((user?.role || "").trim()).toUpperCase();
      let userDept = (user?.department || "").trim();

      // Fallback for department admin if department is empty
      if (!userDept && userRole === "DEPARTMENT_ADMIN") {
        userDept = "City Engineer / PWD";
      }

      const isSuperAdmin = userRole === "SUPER_ADMIN";
      let currentDept = isSuperAdmin ? (userDept || "All") : userDept;

      const deptSelect = document.getElementById("department-selector");
      const deptSelectContainer = document.getElementById("dept-select-container");

      if (isSuperAdmin) {
        if (deptSelectContainer) deptSelectContainer.style.display = "flex";
        if (deptSelect) {
          if (!deptSelect.querySelector('option[value="All"]')) {
            const allOpt = document.createElement("option");
            allOpt.value = "All";
            allOpt.textContent = "All Departments (Super Admin)";
            deptSelect.insertBefore(allOpt, deptSelect.firstChild);
          }
          deptSelect.value = currentDept;
          deptSelect.onchange = (e) => {
            currentDept = e.target.value;
            loadDepartment(currentDept);
          };
        }
      } else {
        // Department Admin: Lock to assigned department
        if (deptSelectContainer) {
          deptSelectContainer.innerHTML = `
            <span style="font-size:13px;font-weight:700;color:var(--blue);background:#edf3fb;padding:6px 14px;border-radius:8px;border:1px solid var(--blue-mid);">
              Assigned: <strong>${window.esc ? window.esc(userDept) : userDept}</strong>
            </span>
          `;
        }
      }

      const loadDepartment = (deptName) => {
        const nameEl = document.getElementById("dept-title");
        const subtitleEl = document.getElementById("dept-subtitle");
        const officerEl = document.getElementById("dept-officer");
        const badgeEl = document.getElementById("dept-badge");
        const queueHeading = document.getElementById("dept-queue-heading");

        const displayDept = (deptName === "All" || !deptName) ? "ALL MUNICIPAL DEPARTMENTS" : deptName.toUpperCase();
        if (nameEl) nameEl.textContent = displayDept;
        if (subtitleEl) subtitleEl.textContent = isSuperAdmin ? "Super Admin Operations Dashboard" : "Department Admin Dashboard";
        if (badgeEl) badgeEl.textContent = deptName === "All" ? "All Departments" : deptName;
        if (queueHeading) queueHeading.textContent = `${displayDept} CITIZEN REPORTS`;

        const deptMeta = window.AppData?.departments?.find(d => d.name === deptName);
        if (officerEl) {
          if (deptMeta) {
            officerEl.textContent = `${deptMeta.officer} · ${deptMeta.designation}`;
            officerEl.style.display = "block";
          } else if (isSuperAdmin && deptName === "All") {
            officerEl.textContent = "Dr. Rajendra Bharud (IAS) · Municipal Commissioner";
            officerEl.style.display = "block";
          } else {
            officerEl.style.display = "none";
          }
        }

        // Teardown previous listener if any
        if (activeUnsubscribe) {
          activeUnsubscribe();
          activeUnsubscribe = null;
        }

        const tableBody = document.getElementById("dept-issues-table");
        if (tableBody) {
          tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px 16px;">Loading reports from Firestore...</td></tr>`;
        }

        const onDataReceived = (reports) => {
          cachedReports = reports || [];
          renderReports(cachedReports, deptName);
        };

        const onErrorReceived = (err) => {
          console.error("Firestore department reports subscription error:", err);
          if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:#b91c1c;">Unable to load reports from Firestore. (${window.esc ? window.esc(err.message) : err.message})</td></tr>`;
          }
        };

        // Real-time Firestore subscription
        const subFn = window.ReportsService?.subscribeDepartmentReports;
        if (typeof subFn === "function") {
          activeUnsubscribe = subFn(deptName, onDataReceived, onErrorReceived);
        } else {
          // Dynamic import fallback
          import("../js/reports.js").then((mod) => {
            activeUnsubscribe = mod.subscribeDepartmentReports(deptName, onDataReceived, onErrorReceived);
          }).catch(err => {
            console.error("Failed to dynamically import reports.js:", err);
            onErrorReceived(err);
          });
        }
      };

      const renderReports = (reports, deptName) => {
        // Counts
        const totalCount = reports.length;
        const activeCount = reports.filter(r => {
          const s = (r.status || "").toUpperCase();
          return s !== "RESOLVED" && s !== "CLOSED";
        }).length;
        const highCount = reports.filter(r => {
          const s = (r.severity || "").toUpperCase();
          return s === "HIGH" || s === "CRITICAL";
        }).length;
        const resolvedCount = reports.filter(r => {
          const s = (r.status || "").toUpperCase();
          return s === "RESOLVED" || s === "CLOSED";
        }).length;

        const totalEl = document.getElementById("metric-total-reports");
        const activeEl = document.getElementById("metric-active-reports");
        const highEl = document.getElementById("metric-high-priority");
        const resolvedEl = document.getElementById("metric-resolved-reports");

        if (totalEl) totalEl.textContent = totalCount < 10 ? `0${totalCount}` : totalCount;
        if (activeEl) activeEl.textContent = activeCount < 10 ? `0${activeCount}` : activeCount;
        if (highEl) highEl.textContent = highCount < 10 ? `0${highCount}` : highCount;
        if (resolvedEl) resolvedEl.textContent = resolvedCount < 10 ? `0${resolvedCount}` : resolvedCount;

        const tableBody = document.getElementById("dept-issues-table");
        if (!tableBody) return;

        if (reports.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="10" style="text-align:center;padding:52px 20px;">
                <div style="font-size:38px;margin-bottom:10px;" aria-hidden="true">📋</div>
                <div style="font-size:18px;font-weight:800;color:var(--blue);margin-bottom:6px;">No reports have been assigned to this department yet.</div>
                <div class="muted" style="font-size:14px;">Incoming citizen submissions matching this department will appear here in real time.</div>
              </td>
            </tr>
          `;
          return;
        }

        const esc = window.esc || ((str) => {
          const div = document.createElement("div");
          div.textContent = str || "";
          return div.innerHTML;
        });

        tableBody.innerHTML = reports.map(r => {
          const displayId = r.displayId || ("CF-" + (r.id || "").slice(0, 8).toUpperCase());
          const category = r.category || "General Civic";
          const desc = r.description ? esc(r.description) : '<span class="muted">Not available</span>';
          const loc = r.locationText ? esc(r.locationText) : '<span class="muted">Not available</span>';
          const ward = r.ward ? `Ward ${esc(r.ward)}` : '<span class="muted">Not available</span>';
          const sev = (r.severity || "Not available").toUpperCase();
          const status = (r.status || "SUBMITTED").toUpperCase();
          const dateStr = window.ReportsService?.formatReportDate ? window.ReportsService.formatReportDate(r.createdAt || r.rawCreatedAt) : "Recently";
          const masterId = r.masterIncidentId ? esc(r.masterIncidentId) : null;

          const sevClass = (sev === "HIGH" || sev === "CRITICAL") ? "active" : "done";
          const statusClass = (status === "RESOLVED" || status === "CLOSED") ? "done" : "active";

          return `
            <tr class="clickable" data-report-id="${esc(r.id)}">
              <td><strong>${esc(displayId)}</strong></td>
              <td>
                ${r.imageUrl ? `
                  <img src="${esc(r.imageUrl)}" alt="${esc(category)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1.5px solid var(--blue-mid);cursor:pointer;display:block;" class="dept-thumb-click" data-id="${esc(r.id)}" title="Click to enlarge">
                ` : `
                  <div style="width:44px;height:44px;border-radius:8px;background:#edf3fb;border:1.5px solid var(--blue-mid);display:grid;place-items:center;font-size:18px;">📷</div>
                `}
              </td>
              <td><strong>${esc(category)}</strong></td>
              <td style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.description || '')}">
                ${desc}
              </td>
              <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.locationText || '')}">
                ${loc}
              </td>
              <td>${ward}</td>
              <td><span class="status ${sevClass}">${sev}</span></td>
              <td><span class="status ${statusClass}">${status}</span></td>
              <td style="font-size:13px;white-space:nowrap;">${dateStr}</td>
              <td>
                ${masterId ? `
                  <a href="master-issue.html?id=${encodeURIComponent(masterId)}" style="color:var(--blue);font-weight:800;text-decoration:underline;" onclick="event.stopPropagation();">
                    ${masterId}
                  </a>
                ` : '<span class="muted">Not available</span>'}
              </td>
            </tr>
          `;
        }).join("");

        // Attach click handlers to open details
        tableBody.querySelectorAll("tr[data-report-id]").forEach(tr => {
          tr.addEventListener("click", (e) => {
            if (e.target.tagName === "A") return;
            const rid = tr.getAttribute("data-report-id");
            const rep = cachedReports.find(x => x.id === rid);
            if (rep) {
              AdminApp.openReportModal(rep);
            }
          });
        });
      };

      loadDepartment(currentDept);
    };

    const initialUser = getUser();
    if (initialUser) {
      setupDashboard(initialUser);
    } else {
      let attempts = 0;
      const checker = setInterval(() => {
        attempts++;
        const u = getUser();
        if (u) {
          clearInterval(checker);
          setupDashboard(u);
        } else if (attempts > 30) {
          clearInterval(checker);
          setupDashboard({
            role: "DEPARTMENT_ADMIN",
            department: "City Engineer / PWD"
          });
        }
      }, 100);
    }

    // Clean up on page navigation
    window.addEventListener("beforeunload", () => {
      if (activeUnsubscribe) activeUnsubscribe();
    });
  },

  openReportModal(report) {
    const modal = document.getElementById("report-detail-modal");
    if (!modal || !report) return;

    const esc = window.esc || ((str) => {
      const div = document.createElement("div");
      div.textContent = str || "";
      return div.innerHTML;
    });

    const idEl = document.getElementById("modal-report-id");
    const imgEl = document.getElementById("modal-report-img");
    const imgLink = document.getElementById("modal-report-img-link");
    const catEl = document.getElementById("modal-report-category");
    const sevEl = document.getElementById("modal-report-severity");
    const statusEl = document.getElementById("modal-report-status");
    const descEl = document.getElementById("modal-report-desc");
    const locEl = document.getElementById("modal-report-location");
    const wardEl = document.getElementById("modal-report-ward");
    const masterEl = document.getElementById("modal-report-master");
    const deptEl = document.getElementById("modal-report-dept");
    const timeEl = document.getElementById("modal-report-time");

    const displayId = report.displayId || ("CF-" + (report.id || "").slice(0, 8).toUpperCase());
    if (idEl) idEl.textContent = displayId;
    if (imgEl) {
      imgEl.src = report.imageUrl || "../assets/report-01.svg";
      imgEl.style.display = report.imageUrl ? "block" : "none";
    }
    if (imgLink) {
      if (report.imageUrl) {
        imgLink.href = report.imageUrl;
        imgLink.style.display = "inline";
      } else {
        imgLink.style.display = "none";
      }
    }
    if (catEl) catEl.textContent = report.category || "General Civic";
    if (sevEl) {
      const s = (report.severity || "Not available").toUpperCase();
      sevEl.textContent = s;
      sevEl.className = "status " + ((s === "HIGH" || s === "CRITICAL") ? "active" : "done");
    }
    if (statusEl) {
      const st = (report.status || "SUBMITTED").toUpperCase();
      statusEl.textContent = st;
      statusEl.className = "status " + ((st === "RESOLVED" || st === "CLOSED") ? "done" : "active");
    }
    if (descEl) descEl.textContent = report.description || "Not available";
    if (locEl) locEl.textContent = report.locationText || "Not available";
    if (wardEl) wardEl.textContent = report.ward ? `Ward: ${report.ward}` : "Ward: Not available";
    if (masterEl) {
      if (report.masterIncidentId) {
        masterEl.innerHTML = `<a href="master-issue.html?id=${encodeURIComponent(report.masterIncidentId)}" style="color:var(--blue);text-decoration:underline;font-weight:800;">${esc(report.masterIncidentId)} ➔</a>`;
      } else {
        masterEl.textContent = "None (Independent submission)";
      }
    }
    if (deptEl) deptEl.textContent = `Department: ${report.department || "Unassigned"}`;
    if (timeEl) {
      const dateStr = window.ReportsService?.formatReportDate ? window.ReportsService.formatReportDate(report.createdAt || report.rawCreatedAt) : "Recently";
      timeEl.textContent = `Submitted: ${dateStr}`;
    }

    modal.classList.remove("hidden");
  },

  closeReportModal() {
    const modal = document.getElementById("report-detail-modal");
    if (modal) modal.classList.add("hidden");
  },

  // 5. Leaflet Incident Map
  initMap() {
    setTimeout(() => {
      if (window.CivicMap) {
        window.CivicMap.init("admin-incident-map");
      }
    }, 100);
  },

  // 6. Resolution Verification
  initResolution() {
    const r = window.AppState.currentResolution;
    const locEl = document.getElementById("res-location");
    const timeEl = document.getElementById("res-timestamp");
    const beforeImg = document.getElementById("res-before-img");
    const afterImg = document.getElementById("res-after-img");
    const checkBtn = document.getElementById("run-ai-check-btn");
    const sendBtn = document.getElementById("send-to-citizen-btn");

    if (!r) {
      if (locEl) locEl.textContent = "No resolution submitted yet";
      if (timeEl) timeEl.textContent = "Pending field officer action";
      if (checkBtn) checkBtn.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
      return;
    }

    if (locEl) locEl.textContent = r.location || "Location recorded";
    if (timeEl) timeEl.textContent = r.timestamp || "Recently";
    if (beforeImg && r.beforeImage) beforeImg.src = r.beforeImage;
    if (afterImg && r.afterImage) afterImg.src = r.afterImage;

    const checkStatusEl = document.getElementById("ai-check-overall-status");
    const issueAreaEl = document.getElementById("ai-check-issue-area");
    const locationCheckEl = document.getElementById("ai-check-location");
    const evidenceCheckEl = document.getElementById("ai-check-evidence");

    if (checkBtn) {
      checkBtn.addEventListener("click", async () => {
        checkBtn.textContent = "CHECKING...";
        const aiRes = await window.CivicService.verifyResolution();
        checkBtn.textContent = "CHECK COMPLETE ✓";
        if (checkStatusEl) checkStatusEl.textContent = aiRes.verification;
        if (issueAreaEl) issueAreaEl.textContent = aiRes.issueArea;
        if (locationCheckEl) locationCheckEl.textContent = aiRes.location;
        if (evidenceCheckEl) evidenceCheckEl.textContent = aiRes.evidence;
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener("click", () => {
        if (window.AppState.currentMasterIncident) {
          window.AppState.currentMasterIncident.status = "Verification Pending";
        }
        if (window.AppState.currentReport) {
          window.AppState.currentReport.status = "Citizen Verification";
        }
        window.saveState();
        alert("Resolution forwarded to citizen for final verification.");
        window.location.href = "../citizen/verify.html";
      });
    }
  },

  // 7. Analytics
  async initAnalytics() {
    let service = window.ReportsService;
    if (!service) {
      try { service = await import("../js/reports.js"); } catch (e) {}
    }
    const reports = (service?.getDepartmentReports ? await service.getDepartmentReports("All") : []) || [];
    const masterIncidents = (service?.getMasterIncidents ? await service.getMasterIncidents() : []) || [];
    if (window.CivicCharts) {
      window.CivicCharts.init(reports, masterIncidents);
    }
  }
};
