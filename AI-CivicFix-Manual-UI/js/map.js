window.CivicMap = {
  map: null,

  init(elementId = "incident-map") {
    const el = document.getElementById(elementId);
    if (!el || typeof L === "undefined") return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Illustrative map center for Kolhapur. This is NOT the citizen's exact GPS.
    this.map = L.map(elementId).setView([16.7050, 74.2433], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(this.map);

    // Illustrative coordinates used only to render a city-context map.
    // Never display these values as the citizen's exact GPS.
    const master = [16.7050, 74.2433];
    L.circle(master, {
      radius: 100,
      color: "#0B3D91",
      fillColor: "#0B3D91",
      fillOpacity: 0.08,
      weight: 2
    }).addTo(this.map);

    L.marker(master).addTo(this.map).bindPopup("KMC-042 — Master Incident").openPopup();

    const points = [
      [16.70515, 74.24295],
      [16.70485, 74.24355],
      [16.70535, 74.24372],
      [16.70460, 74.24315],
      [16.70550, 74.24280],
      [16.70472, 74.24262]
    ];

    points.forEach((point, index) => {
      L.circleMarker(point, {
        radius: 5,
        color: "#0B3D91",
        fillColor: "#0B3D91",
        fillOpacity: 0.9,
        weight: 1
      }).addTo(this.map).bindPopup(`Citizen report ${index + 1}`);
    });
  }
};
