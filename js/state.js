// =========================================================
// AI CivicFix — State Management
// Central frontend state persisted in localStorage
// =========================================================

window.AppState = {
  currentUser: null,
  currentReport: null,
  currentMasterIncident: null,
  currentWorkOrder: null,
  currentResolution: null,
  currentLocation: null,
  currentAIResult: null,
  selectedImage: null,
  imageUrl: null,
  cloudinaryPublicId: null
};

window.loadState = function () {
  // 1. Load primary currentUser key (legitimate authentication session)
  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    try {
      window.AppState.currentUser = JSON.parse(savedUser);
    } catch (e) {
      window.AppState.currentUser = null;
    }
  } else {
    window.AppState.currentUser = null;
  }

  // 2. Load active session form state
  const saved = localStorage.getItem("civicfixState");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!window.AppState.currentUser && parsed.currentUser) {
        window.AppState.currentUser = parsed.currentUser;
      }
      window.AppState.currentReport = parsed.currentReport || null;
      window.AppState.currentMasterIncident = parsed.currentMasterIncident || null;
      window.AppState.currentWorkOrder = parsed.currentWorkOrder || null;
      window.AppState.currentResolution = parsed.currentResolution || null;
      window.AppState.currentLocation = parsed.currentLocation || null;
      window.AppState.currentAIResult = parsed.currentAIResult || null;
      window.AppState.selectedImage = parsed.selectedImage || null;
      window.AppState.imageUrl = parsed.imageUrl || null;
      window.AppState.cloudinaryPublicId = parsed.cloudinaryPublicId || null;
    } catch (e) {
      console.warn("Could not parse saved state:", e);
    }
  }
};

window.saveState = function () {
  if (window.AppState.currentUser) {
    localStorage.setItem("currentUser", JSON.stringify(window.AppState.currentUser));
  } else {
    localStorage.removeItem("currentUser");
  }

  const stateToSave = {
    currentUser: window.AppState.currentUser,
    currentReport: window.AppState.currentReport,
    currentMasterIncident: window.AppState.currentMasterIncident,
    currentWorkOrder: window.AppState.currentWorkOrder,
    currentResolution: window.AppState.currentResolution,
    currentLocation: window.AppState.currentLocation,
    currentAIResult: window.AppState.currentAIResult,
    selectedImage: window.AppState.selectedImage,
    imageUrl: window.AppState.imageUrl,
    cloudinaryPublicId: window.AppState.cloudinaryPublicId
  };
  localStorage.setItem("civicfixState", JSON.stringify(stateToSave));
};

window.clearState = function () {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("civicfixState");
  window.AppState = {
    currentUser: null,
    currentReport: null,
    currentMasterIncident: null,
    currentWorkOrder: null,
    currentResolution: null,
    currentLocation: null,
    currentAIResult: null,
    selectedImage: null,
    imageUrl: null,
    cloudinaryPublicId: null
  };
};

// No-op compatibility stub for any legacy callers
window.ensureCitizenDemoState = function () {};
window.resetDemo = function () {
  window.clearState();
  window.location.reload();
};

// Initialize state immediately
window.loadState();
