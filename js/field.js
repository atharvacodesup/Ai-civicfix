// =========================================================
// AI CivicFix — Field Officer Application Logic
// Field Work Queue, Work Execution & After-Photo Resolution
// =========================================================

window.FieldApp = {
  async initWork() {
    let service = window.ReportsService;
    if (!service) {
      try { service = await import("../js/reports.js"); } catch (e) {}
    }

    let inc = null;
    const currentMasterId = window.AppState?.currentMasterIncident?.id;
    if (currentMasterId && service?.getMasterIncidentById) {
      inc = await service.getMasterIncidentById(currentMasterId);
    }
    if (!inc && window.AppState?.currentMasterIncident?.id) {
      inc = window.AppState.currentMasterIncident;
    }
    if (!inc && service?.getMasterIncidents) {
      const allIncidents = await service.getMasterIncidents();
      if (allIncidents && allIncidents.length > 0) {
        inc = allIncidents[0];
      }
    }

    const mount = document.getElementById("field-work-mount");

    // Empty state: Section 8: Field Officer: "No work assigned yet."
    if (!inc) {
      if (mount) {
        mount.innerHTML = `
          <div class="card" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 40px; margin-bottom: 12px;" aria-hidden="true">🛠️</div>
            <h2 style="font-size: 24px; color: var(--blue); margin-bottom: 8px;">No work assigned yet.</h2>
            <p class="muted" style="margin: 0; font-size: 15px;">When municipal work orders are dispatched to field officers, assignments will appear here.</p>
          </div>
        `;
      }
      return;
    }

    window.AppState.currentMasterIncident = inc;
    window.saveState();

    const idEl = document.getElementById("field-work-id");
    const typeEl = document.getElementById("field-work-type");
    const statusBadge = document.getElementById("field-work-status");
    const addrEl = document.getElementById("field-work-addr");
    const wardEl = document.getElementById("field-work-ward");
    const coordsEl = document.getElementById("field-work-coords");
    const calloutEl = document.getElementById("field-work-callout");
    const startWorkBtn = document.getElementById("field-start-btn");

    if (idEl) idEl.textContent = inc.id;
    if (typeEl) typeEl.textContent = (inc.problemType || inc.category || "CIVIC ISSUE").toUpperCase();
    if (statusBadge) {
      statusBadge.textContent = (inc.status || "ASSIGNED").toUpperCase();
      statusBadge.style.display = "inline-block";
    }
    if (addrEl) addrEl.textContent = inc.address || inc.locationText || "Kolhapur Service Area";
    if (wardEl) wardEl.textContent = inc.ward ? `Ward ${inc.ward}` : "--";
    if (coordsEl && inc.latitude && inc.longitude) {
      coordsEl.textContent = `Coordinates: ${Number(inc.latitude).toFixed(6)}, ${Number(inc.longitude).toFixed(6)}`;
    }
    if (calloutEl) {
      calloutEl.innerHTML = `<strong>Assigned Officer / Unit:</strong><br>${window.esc ? window.esc(inc.assignment || inc.responsibleUnit || "Field Operations") : (inc.assignment || "Field Operations")}`;
    }
    if (startWorkBtn) {
      startWorkBtn.style.display = "block";
      startWorkBtn.onclick = async () => {
        inc.status = "In Progress";
        window.AppState.currentMasterIncident = inc;
        if (window.AppState.currentReport) {
          window.AppState.currentReport.status = "In Progress";
          if (service?.updateReportStatus && window.AppState.currentReport.id) {
            try {
              await service.updateReportStatus(
                window.AppState.currentReport.id,
                "WORK_IN_PROGRESS",
                "Field officer started repair work on site",
                "FIELD_OFFICER"
              );
            } catch (e) {
              console.warn("Could not update report status in Firestore:", e);
            }
          }
        }
        window.saveState();
        window.location.href = "issue.html";
      };
    }
  },

  initIssue() {
    const photoInput = document.getElementById("after-photo-input");
    const previewWrap = document.getElementById("after-preview-wrap");
    const previewImg = document.getElementById("after-preview-img");
    const completeBtn = document.getElementById("field-complete-btn");

    const currentInc = window.AppState?.currentMasterIncident;
    const currentRep = window.AppState?.currentReport;

    // Populate issue headers dynamically
    const headerTitle = document.querySelector(".field-main h1");
    const headerKicker = document.querySelector(".field-main .kicker");
    const issueAddress = document.getElementById("field-issue-address");
    const issueWard = document.getElementById("field-issue-ward");
    const issueCoords = document.getElementById("field-issue-coords");

    if (currentInc) {
      if (headerTitle) headerTitle.textContent = currentInc.id;
      if (headerKicker) headerKicker.textContent = `Work Order ${currentInc.workOrderId || "WO-" + currentInc.id}`;
      if (issueAddress) issueAddress.textContent = currentInc.address || currentInc.locationText || "Location recorded";
      if (issueWard) issueWard.textContent = currentInc.ward || "20";
      if (issueCoords && currentInc.latitude && currentInc.longitude) {
        issueCoords.textContent = `Coordinates: ${Number(currentInc.latitude).toFixed(6)}, ${Number(currentInc.longitude).toFixed(6)}`;
      }
    }

    if (photoInput) {
      photoInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let dataUrl;
        try {
          if (typeof window.uploadImageToCloudinary === "function") {
            const res = await window.uploadImageToCloudinary(file);
            dataUrl = typeof res === "string" ? res : res.imageUrl;
          } else {
            dataUrl = await window.CivicService.uploadImage(file);
          }
        } catch (err) {
          dataUrl = await window.CivicService.uploadImage(file);
        }

        if (previewWrap) previewWrap.classList.remove("hidden");
        if (previewImg) previewImg.src = dataUrl;

        const masterId = currentInc?.id || currentRep?.masterIncidentId || "KMC-INCIDENT";
        const beforeImg = currentRep?.imageUrl || "../assets/before-pothole.svg";
        const locText = currentInc?.address || currentRep?.locationText || window.AppState.currentLocation?.address || "Kolhapur";
        const wardText = currentInc?.ward || currentRep?.ward || "20";

        if (!window.AppState.currentResolution) {
          window.AppState.currentResolution = {
            masterIncidentId: masterId,
            beforeImage: beforeImg,
            afterImage: dataUrl,
            location: locText,
            ward: wardText,
            timestamp: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            aiVerification: null,
            citizenVerification: null
          };
        } else {
          window.AppState.currentResolution.afterImage = dataUrl;
          window.AppState.currentResolution.timestamp = "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        window.saveState();
      });
    }

    if (completeBtn) {
      completeBtn.addEventListener("click", async () => {
        let service = window.ReportsService;
        if (!service) {
          try { service = await import("../js/reports.js"); } catch (e) {}
        }

        const masterId = currentInc?.id || currentRep?.masterIncidentId || "KMC-INCIDENT";
        const beforeImg = currentRep?.imageUrl || "../assets/before-pothole.svg";
        const afterImg = window.AppState.currentResolution?.afterImage || "../assets/after-repaired.svg";
        const locText = currentInc?.address || currentRep?.locationText || "Kolhapur";
        const wardText = currentInc?.ward || currentRep?.ward || "20";

        if (!window.AppState.currentResolution) {
          window.AppState.currentResolution = {
            masterIncidentId: masterId,
            beforeImage: beforeImg,
            afterImage: afterImg,
            location: locText,
            ward: wardText,
            timestamp: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            aiVerification: null,
            citizenVerification: null
          };
        }

        if (window.AppState.currentMasterIncident) {
          window.AppState.currentMasterIncident.status = "Resolution Submitted";
        }
        if (window.AppState.currentReport) {
          window.AppState.currentReport.status = "Resolution Submitted";
          if (service?.updateReportStatus && window.AppState.currentReport.id) {
            try {
              await service.updateReportStatus(
                window.AppState.currentReport.id,
                "RESOLUTION_SUBMITTED",
                "Field officer completed repair and submitted resolution evidence",
                "FIELD_OFFICER"
              );
            } catch (e) {
              console.warn("Could not update report status in Firestore:", e);
            }
          }
        }
        window.saveState();
        alert("Work completed and resolution evidence submitted.");
        window.location.href = "../admin/resolution.html";
      });
    }
  }
};
