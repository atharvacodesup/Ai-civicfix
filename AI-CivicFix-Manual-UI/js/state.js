// Simple frontend-only state.
// This is intentionally beginner-friendly and easy to replace with Firebase later.

window.AppState = {
  view: "login",
  currentUser: null,
  currentReport: null,
  currentMasterIncident: null,
  currentWorkOrder: null,
  currentResolution: null,
  selectedImage: null,
  aiResult: null,
  location: JSON.parse(JSON.stringify(window.AppData.location))
};

window.loadDemoState = function () {
  const saved = localStorage.getItem("civicfixState");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      AppState.currentUser = parsed.currentUser || null;
      AppState.currentReport = parsed.currentReport || null;
      AppState.currentMasterIncident = parsed.currentMasterIncident || null;
      AppState.currentWorkOrder = parsed.currentWorkOrder || null;
      AppState.currentResolution = parsed.currentResolution || null;
      AppState.location = parsed.location || JSON.parse(JSON.stringify(window.AppData.location));
    } catch (e) {
      console.warn("Could not load saved demo state.");
    }
  }
};

window.saveDemoState = function () {
  const stateToSave = {
    currentUser: AppState.currentUser,
    currentReport: AppState.currentReport,
    currentMasterIncident: AppState.currentMasterIncident,
    currentWorkOrder: AppState.currentWorkOrder,
    currentResolution: AppState.currentResolution,
    location: AppState.location
  };
  localStorage.setItem("civicfixState", JSON.stringify(stateToSave));
};

window.resetDemo = function () {
  localStorage.removeItem("civicfixState");
  location.reload();
};

loadDemoState();
