// =========================================================
// AI CivicFix — Service Abstraction Layer
// Ready for future Cloudinary, Firestore, and Gemini integration
// =========================================================

window.CivicService = {
  async uploadImage(file) {
    if (!file) return null;
    if (typeof window.uploadImageToCloudinary === "function") {
      return await window.uploadImageToCloudinary(file);
    }
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ imageUrl: e.target.result });
      reader.onerror = () => resolve({ imageUrl: URL.createObjectURL(file) });
      reader.readAsDataURL(file);
    });
  },

  async analyzeImage(imageSource, description = "") {
    let analyzeFn = window.analyzeCivicImage;
    if (!analyzeFn) {
      try {
        const mod = await import("./ai-service.js");
        analyzeFn = mod.analyzeCivicImage;
      } catch (e) {
        try {
          const mod2 = await import("../js/ai-service.js");
          analyzeFn = mod2.analyzeCivicImage;
        } catch (e2) {}
      }
    }

    if (analyzeFn && imageSource) {
      const aiRes = await analyzeFn(imageSource, description);
      return {
        problemType: aiRes.category,
        category: aiRes.category,
        severity: aiRes.severity,
        confidence: aiRes.confidence,
        description: aiRes.summary,
        summary: aiRes.summary,
        observations: aiRes.observations,
        recommendedAction: aiRes.recommendedAction
      };
    }

    throw new Error("AI analysis service is not available.");
  },

  async findSimilarIncident(problemType = "Pothole") {
    // 50ms lookup
    await new Promise(resolve => setTimeout(resolve, 50));

    const mapping = {
      "Pothole": { incidentId: "KMC-042", distance: "42m", reportCount: 6 },
      "Road Damage": { incidentId: "KMC-042", distance: "42m", reportCount: 6 },
      "Footpath Damage": { incidentId: "KMC-042", distance: "42m", reportCount: 6 },
      "Garbage": { incidentId: "KMC-043", distance: "65m", reportCount: 12 },
      "Waste Dumping": { incidentId: "KMC-043", distance: "65m", reportCount: 12 },
      "Waste Not Collected": { incidentId: "KMC-043", distance: "65m", reportCount: 12 },
      "Drainage": { incidentId: "KMC-044", distance: "50m", reportCount: 4 },
      "Water Leakage": { incidentId: "KMC-044", distance: "50m", reportCount: 4 },
      "Sewer Overflow": { incidentId: "KMC-044", distance: "50m", reportCount: 4 },
      "Broken Streetlight": { incidentId: "KMC-045", distance: "30m", reportCount: 2 },
      "Streetlight Not Working": { incidentId: "KMC-045", distance: "30m", reportCount: 2 },
      "High Mast Light": { incidentId: "KMC-045", distance: "30m", reportCount: 2 },
      "Fallen Tree": { incidentId: "KMC-046", distance: "80m", reportCount: 5 },
      "Tree Branch Problem": { incidentId: "KMC-046", distance: "80m", reportCount: 5 },
      "Park Problem": { incidentId: "KMC-046", distance: "80m", reportCount: 5 },
      "Road Encroachment": { incidentId: "KMC-047", distance: "45m", reportCount: 3 },
      "Footpath Encroachment": { incidentId: "KMC-047", distance: "45m", reportCount: 3 },
      "Public Space Obstruction": { incidentId: "KMC-047", distance: "45m", reportCount: 3 }
    };

    const match = mapping[problemType] || mapping["Pothole"];
    return {
      found: true,
      incidentId: match.incidentId,
      distance: match.distance,
      reportCount: match.reportCount,
      problemType: problemType
    };
  },

  createReport(reportData = {}) {
    const report = {
      id: reportData.id || ("CF-" + Math.floor(1000 + Math.random() * 9000)),
      citizenId: reportData.citizenId || (window.AppState?.currentUser?.uid || "citizen"),
      problemType: reportData.problemType || reportData.category || "General Civic Issue",
      severity: reportData.severity || "Normal",
      description: reportData.description || "",
      location: reportData.location || reportData.locationText || (window.AppState.currentLocation ? window.AppState.currentLocation.address : "Kolhapur service area"),
      ward: reportData.ward || "20",
      masterIncidentId: reportData.masterIncidentId || null,
      status: reportData.status || "REPORT_SUBMITTED",
      imageUrl: reportData.imageUrl || window.AppState.selectedImage || null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    window.AppState.currentReport = report;
    window.saveState();
    return report;
  },

  getReport(id) {
    return window.AppState.currentReport;
  },

  getMasterIncident(id) {
    return window.AppState.currentMasterIncident;
  },

  generateWorkOrder(incident) {
    const inc = incident || window.AppState.currentMasterIncident;
    if (!inc) {
      return {
        id: "WO-PENDING",
        masterIncidentId: "None",
        issue: "No active issue",
        reports: 0,
        location: "Kolhapur",
        ward: "--",
        priority: "Normal",
        department: "Municipal Department",
        assignment: "Field Operations",
        crew: "Configured Field Team",
        action: "Site inspection",
        closureEvidence: ["Before photo", "After photo", "GPS", "Timestamp"]
      };
    }
    return {
      id: inc.workOrderId || ("WO-" + (inc.id || "1001")),
      masterIncidentId: inc.id || "KMC-INCIDENT",
      issue: (inc.problemType || inc.category || "Civic Issue"),
      reports: Number(inc.reportsCount || inc.reports) || 1,
      location: inc.address || inc.locationText || "Kolhapur",
      ward: inc.ward || "--",
      priority: inc.severity || "Normal",
      department: inc.department || "City Engineer / PWD",
      assignment: inc.assignment || inc.responsibleUnit || "Field Operations",
      crew: inc.department === "City Engineer / PWD" ? "Road Maintenance Team" : "Configured Field Team",
      action: inc.recommendedAction || "Field inspection and site repair",
      closureEvidence: ["Before photo", "After photo", "GPS", "Timestamp"]
    };
  },

  submitResolution(data = {}) {
    const resolution = {
      masterIncidentId: data.masterIncidentId || window.AppState?.currentMasterIncident?.id || null,
      beforeImage: data.beforeImage || null,
      afterImage: data.afterImage || null,
      location: data.location || (window.AppState.currentLocation ? window.AppState.currentLocation.address : "Kolhapur"),
      ward: data.ward || "20",
      timestamp: data.timestamp || "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aiVerification: data.aiVerification || null,
      citizenVerification: null
    };

    window.AppState.currentResolution = resolution;
    if (window.AppState.currentMasterIncident) {
      window.AppState.currentMasterIncident.status = "Resolution Submitted";
    }
    if (window.AppState.currentReport) {
      window.AppState.currentReport.status = "Resolution Submitted";
    }
    window.saveState();
    return resolution;
  },

  async verifyResolution() {
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = {
      issueArea: "Appears repaired",
      location: "Matched",
      evidence: "Complete",
      verification: "READY FOR HUMAN REVIEW"
    };

    if (window.AppState.currentResolution) {
      window.AppState.currentResolution.aiVerification = result;
      window.saveState();
    }
    return result;
  },

  confirmResolution(decision = "Fixed") {
    if (!window.AppState.currentResolution) {
      return null;
    }
    window.AppState.currentResolution.citizenVerification = decision;

    const newStatus = decision === "Fixed" ? "Closed" : "Reopened";
    if (window.AppState.currentMasterIncident) {
      window.AppState.currentMasterIncident.status = newStatus;
    }
    if (window.AppState.currentReport) {
      window.AppState.currentReport.status = newStatus;
    }
    window.saveState();
    return newStatus;
  }
};
