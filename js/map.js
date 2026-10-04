// =========================================================
// AI CivicFix — Leaflet Map Initialization
// Shared between citizen/duplicate.html, admin/master-issue.html, admin/map.html
// =========================================================

window.CivicMap = {
  instances: {},

  init(elementId = "incident-map") {
    const el = document.getElementById(elementId);
    if (!el || typeof L === "undefined") {
      if (el) {
        el.innerHTML = `
          <div style="display:grid;place-items:center;height:100%;background:#edf3fb;color:#0B3D91;padding:20px;text-align:center;">
            <div>
              <strong>Map View (Kolhapur Service Area)</strong>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.8;">OpenStreetMap visualization loaded for KMC operational zone.</p>
            </div>
          </div>
        `;
      }
      return;
    }

    if (this.instances[elementId]) {
      this.instances[elementId].remove();
      delete this.instances[elementId];
    }

    try {
      const defaultCenter = [16.691307, 74.244866];
      const inc = window.AppState?.currentMasterIncident;
      const rep = window.AppState?.currentReport;

      let centerPos = defaultCenter;
      if (inc && inc.latitude && inc.longitude) {
        centerPos = [inc.latitude, inc.longitude];
      } else if (rep && rep.latitude && rep.longitude) {
        centerPos = [rep.latitude, rep.longitude];
      }

      const map = L.map(elementId, { scrollWheelZoom: false }).setView(centerPos, 15);
      this.instances[elementId] = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      // Only plot markers if a REAL incident or report is active in state
      if (inc && inc.id && inc.latitude && inc.longitude) {
        const masterPos = [inc.latitude, inc.longitude];
        L.circle(masterPos, {
          radius: 100,
          color: "#0B3D91",
          fillColor: "#0B3D91",
          fillOpacity: 0.1,
          weight: 2
        }).addTo(map);

        L.marker(masterPos).addTo(map).bindPopup(
          `<strong>${window.esc ? window.esc(inc.id) : inc.id} — Master Incident</strong><br>${window.esc ? window.esc(inc.problemType || inc.category || "Issue") : "Issue"} · Ward ${window.esc ? window.esc(inc.ward || "--") : "--"}`
        );
      } else if (rep && rep.latitude && rep.longitude) {
        const repPos = [rep.latitude, rep.longitude];
        L.marker(repPos).addTo(map).bindPopup(
          `<strong>Citizen Report Location</strong><br>${window.esc ? window.esc(rep.locationText || "Kolhapur") : "Kolhapur"}`
        );
      }

      // Force layout invalidation after DOM render
      setTimeout(() => map.invalidateSize(), 150);
    } catch (e) {
      console.warn("Leaflet initialization note:", e);
    }
  }
};
