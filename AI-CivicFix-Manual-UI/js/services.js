// Service abstraction layer.
// Later these functions can call Firebase, Cloudinary and Gemini.
// For now they use deterministic demo logic.

window.CivicService = {
  async analyzeImage(imageSource, description = "") {
    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
      problemType: "Pothole",
      severity: "High",
      description: description || "Large pothole on the road surface creating a vehicle safety hazard.",
      recommendedAction: "Field inspection and road repair",
      mode: "demo"
    };
  },

  async uploadImage(file) {
    if (!file) return null;
    return URL.createObjectURL(file);
  },

  async findSimilarIncident(problemType) {
    if (problemType === "Pothole") {
      return {
        found: true,
        incidentId: "KMC-042",
        distance: "42m",
        reportCount: 6,
        problemType: "Pothole"
      };
    }
    return { found: false };
  },

  routeIncident(problemType) {
    return window.AppData.routingRules[problemType] || {
      department: "Configured Municipal Unit",
      assignment: "Configured Field Team"
    };
  },

  generateWorkOrder(incident) {
    return {
      id: incident.workOrderId || "WO-1042",
      issue: "Severe " + incident.problemType.toLowerCase(),
      reports: incident.reports,
      location: incident.address,
      ward: incident.ward,
      priority: incident.severity,
      department: incident.department,
      assignment: incident.assignment,
      crew: incident.department === "City Engineer / PWD"
        ? "Road Maintenance Team"
        : "Configured Field Team",
      action: incident.recommendedAction,
      closureEvidence: ["Before photo", "After photo", "GPS", "Timestamp"]
    };
  },

  async verifyResolution() {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      issueArea: "Appears repaired",
      location: "Matched",
      evidence: "Complete",
      verification: "READY FOR HUMAN REVIEW"
    };
  }
};
