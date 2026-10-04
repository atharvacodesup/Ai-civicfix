window.CivicCharts = {
  charts: [],

  destroy() {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
  },

  init() {
    if (typeof Chart === "undefined") return;

    this.destroy();

    const departmentCanvas = document.getElementById("departmentChart");
    const statusCanvas = document.getElementById("statusChart");
    const problemCanvas = document.getElementById("problemChart");

    const common = {
      plugins: {
        legend: {
          labels: { color: "#0B3D91" }
        }
      },
      scales: {
        x: { ticks: { color: "#0B3D91" }, grid: { color: "#dce7f7" } },
        y: { ticks: { color: "#0B3D91" }, grid: { color: "#dce7f7" } }
      }
    };

    if (departmentCanvas) {
      this.charts.push(new Chart(departmentCanvas, {
        type: "bar",
        data: {
          labels: ["PWD", "Sanitation", "Water", "Electricity", "Garden", "Encroachment"],
          datasets: [{ label: "Master Incidents", data: [42,31,19,14,9,7], backgroundColor: "#0B3D91" }]
        },
        options: common
      }));
    }

    if (statusCanvas) {
      this.charts.push(new Chart(statusCanvas, {
        type: "doughnut",
        data: {
          labels: ["Pending", "Assigned", "In Progress", "Resolved"],
          datasets: [{ data: [46, 21, 33, 49], backgroundColor: ["#0B3D91","#285aa5","#5d82ba","#9db6d8"], borderColor:"#FFFFFF" }]
        },
        options: {
          plugins: { legend: { labels: { color: "#0B3D91" } } }
        }
      }));
    }

    if (problemCanvas) {
      this.charts.push(new Chart(problemCanvas, {
        type: "bar",
        data: {
          labels: ["Pothole", "Garbage", "Drainage", "Streetlight", "Tree", "Encroachment"],
          datasets: [{ label: "Reports", data: [38, 29, 17, 13, 8, 6], backgroundColor: "#0B3D91" }]
        },
        options: common
      }));
    }
  }
};
