// =========================================================
// AI CivicFix — Chart.js Analytics (Real Firestore Data)
// Initialized in admin/analytics.html via AdminApp.initAnalytics()
// =========================================================

window.CivicCharts = {
  charts: [],

  destroy() {
    this.charts.forEach(chart => {
      try { chart.destroy(); } catch (e) {}
    });
    this.charts = [];
  },

  init(reports = [], masterIncidents = []) {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js library is not loaded.");
      return;
    }

    this.destroy();

    // 1. Update consolidated report metric and callout in DOM
    const metricReportsEl = document.getElementById("metric-analytics-reports");
    const calloutEl = document.getElementById("analytics-impact-callout");
    const repCount = Array.isArray(reports) ? reports.length : 0;
    const incCount = Array.isArray(masterIncidents) ? masterIncidents.length : 0;

    if (metricReportsEl) {
      metricReportsEl.textContent = repCount;
    }
    if (calloutEl) {
      if (repCount === 0) {
        calloutEl.innerHTML = `<strong>Consolidation Impact:</strong> 0 citizen complaints recorded. Master Incidents will aggregate duplicate dispatches as reports arrive.`;
      } else {
        calloutEl.innerHTML = `<strong>Consolidation Impact:</strong> ${repCount} citizen complaint(s) mapped to ${incCount} Master Incident(s), eliminating municipal duplicate dispatches.`;
      }
    }

    // 2. Aggregate real data
    // Department breakdown
    const deptKeys = [
      { label: "PWD", match: "City Engineer / PWD" },
      { label: "Sanitation", match: "Health & Sanitation" },
      { label: "Water", match: "Water Supply & Drainage" },
      { label: "Electricity", match: "Electricity" },
      { label: "Garden", match: "Garden" },
      { label: "Encroachment", match: "Encroachment" }
    ];
    const deptCounts = deptKeys.map(k => {
      return reports.filter(r => (r.department || "").includes(k.match) || (r.primaryDepartment || "").includes(k.match)).length;
    });

    // Status breakdown
    const statusKeys = ["Pending", "Assigned", "In Progress", "Resolved"];
    const statusCounts = [
      reports.filter(r => {
        const s = (r.status || "").toUpperCase();
        return s === "SUBMITTED" || s === "REPORT_SUBMITTED" || s === "PENDING";
      }).length,
      reports.filter(r => {
        const s = (r.status || "").toUpperCase();
        return s === "ASSIGNED" || s === "DEPARTMENT_ASSIGNED" || s === "FIELD_OFFICER_ASSIGNED";
      }).length,
      reports.filter(r => {
        const s = (r.status || "").toUpperCase();
        return s.includes("PROGRESS");
      }).length,
      reports.filter(r => {
        const s = (r.status || "").toUpperCase();
        return s === "RESOLVED" || s === "CLOSED";
      }).length
    ];

    // Problem type breakdown
    const problemKeys = ["Pothole", "Garbage", "Drainage", "Streetlight", "Tree", "Encroachment"];
    const problemCounts = problemKeys.map(k => {
      return reports.filter(r => {
        const cat = (r.category || r.problemType || "").toLowerCase();
        return cat.includes(k.toLowerCase());
      }).length;
    });

    const departmentCanvas = document.getElementById("departmentChart");
    const statusCanvas = document.getElementById("statusChart");
    const problemCanvas = document.getElementById("problemChart");

    const common = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#0B3D91", font: { weight: "bold" } }
        }
      },
      scales: {
        x: { ticks: { color: "#0B3D91" }, grid: { color: "#dce7f7" } },
        y: {
          ticks: { color: "#0B3D91", stepSize: 1, precision: 0 },
          grid: { color: "#dce7f7" },
          beginAtZero: true
        }
      }
    };

    if (departmentCanvas) {
      this.charts.push(new Chart(departmentCanvas, {
        type: "bar",
        data: {
          labels: deptKeys.map(k => k.label),
          datasets: [{
            label: "Citizen Reports",
            data: deptCounts,
            backgroundColor: "#0B3D91"
          }]
        },
        options: common
      }));
    }

    if (statusCanvas) {
      this.charts.push(new Chart(statusCanvas, {
        type: "doughnut",
        data: {
          labels: statusKeys,
          datasets: [{
            data: repCount === 0 ? [0, 0, 0, 0] : statusCounts,
            backgroundColor: ["#0B3D91", "#285aa5", "#5d82ba", "#9db6d8"],
            borderColor: "#FFFFFF",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: "#0B3D91", font: { weight: "bold" } }
            }
          }
        }
      }));
    }

    if (problemCanvas) {
      this.charts.push(new Chart(problemCanvas, {
        type: "bar",
        data: {
          labels: problemKeys,
          datasets: [{
            label: "Citizen Reports",
            data: problemCounts,
            backgroundColor: "#0B3D91"
          }]
        },
        options: common
      }));
    }
  }
};
