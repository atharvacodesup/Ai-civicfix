// =========================================================
// AI CivicFix — Real Firebase Authentication & Role Routing
// =========================================================

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { auth, db } from "./firebase-init.js";

// Helper: Determine login.html path based on current directory depth
function getLoginPath() {
  const path = window.location.pathname.replace(/\\/g, "/");
  if (
    path.includes("/citizen/") ||
    path.includes("/admin/") ||
    path.includes("/field/")
  ) {
    return "../login.html";
  }
  return "login.html";
}

// Helper: Determine path prefix based on directory depth
function getPathPrefix() {
  const path = window.location.pathname.replace(/\\/g, "/");
  const inSubdir =
    path.includes("/citizen/") ||
    path.includes("/admin/") ||
    path.includes("/field/");
  return inSubdir ? "../" : "";
}

// Helper: Map role to target dashboard route
function getRedirectForRole(role) {
  const r = (role || "").toUpperCase();
  if (r === "CITIZEN") return "citizen/home.html";
  if (r === "DEPARTMENT_ADMIN") return "admin/department.html";
  if (r === "FIELD_OFFICER") return "field/work.html";
  if (r === "SUPER_ADMIN") return "admin/dashboard.html";
  return null;
}

// Convert Firebase / auth errors into readable user messages
function mapAuthError(error, isGoogle = false) {
  if (!error) {
    return isGoogle
      ? "Unable to sign in with Google. Please try again."
      : "Unable to sign in. Please try again.";
  }

  const code = error.code || "";

  if (isGoogle) {
    if (code === "auth/popup-closed-by-user") {
      return "Google sign-in was cancelled.";
    }

    if (code === "auth/popup-blocked") {
      return "Your browser blocked the Google sign-in window.";
    }

    if (code === "auth/cancelled-popup-request") {
      return "Please try Google sign-in again.";
    }

    if (code === "auth/network-request-failed") {
      return "Network error. Please try again.";
    }

    if (code === "auth/unauthorized-domain") {
      return "This development domain is not authorized for Google sign-in in Firebase.";
    }

    if (code === "auth/account-exists-with-different-credential") {
      return "An account with this email already exists using another sign-in method.";
    }

    if (code === "firestore/profile-read-failed" || code === "firestore/profile-write-failed") {
      return "Google Authentication succeeded, but your user profile could not be loaded. Please try again.";
    }

    if (typeof error.message === "string" && !error.message.startsWith("Firebase:") && !error.message.includes("(")) {
      return error.message;
    }

    return "Unable to sign in with Google. Please try again.";
  }

  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "Incorrect email or password.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many login attempts. Please try again later.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error. Please check your internet connection.";
  }

  if (code === "custom/profile-missing" || error.message === "PROFILE_NOT_FOUND") {
    return "Your account is not configured for AI CivicFix.";
  }

  if (
    code === "validation/empty-fields" ||
    code === "validation/missing-fields" ||
    error.message === "Please enter both email and password."
  ) {
    return "Please enter both email and password.";
  }

  if (code === "custom/invalid-role" || error.message === "Your account has an unassigned role.") {
    return "Your account has an unassigned role.";
  }

  if (typeof error.message === "string" && !error.message.startsWith("Firebase:") && !error.message.includes("(")) {
    return error.message;
  }

  return "Unable to sign in. Please try again.";
}

// Auth State Tracking
let currentFirebaseUser = null;

onAuthStateChanged(auth, (user) => {
  currentFirebaseUser = user;
});

function getCurrentFirebaseUser() {
  return currentFirebaseUser || auth.currentUser || null;
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not parse currentUser from localStorage:", e);
  }
  return window.AppState?.currentUser || null;
}

// Staff / Standard Email & Password Login
async function loginUser(email, password) {
  // 1. Trim email
  const trimmedEmail = (email || "").trim();

  // 2. Validate email is not empty
  // 3. Validate password is not empty
  if (!trimmedEmail || !password) {
    const err = new Error("Please enter both email and password.");
    err.code = "validation/empty-fields";
    throw err;
  }

  // 4. Call Firebase Auth signInWithEmailAndPassword
  const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);

  // 5. Get authenticated Firebase user
  const user = userCredential.user;

  // 6. Use Firebase user's UID
  const uid = user.uid;

  // 7. Read users/{uid} from Firestore
  const userDocRef = doc(db, "users", uid);
  const docSnap = await getDoc(userDocRef);

  if (!docSnap.exists()) {
    const err = new Error("Your account is not configured for AI CivicFix.");
    err.code = "custom/profile-missing";
    throw err;
  }

  // 8. Read profile fields
  const profile = docSnap.data();

  // 9. Build current user object
  const currentUser = {
    uid: user.uid,
    email: user.email,
    name: profile.name || "User",
    role: profile.role,
    department: profile.department || null
  };

  // 10. Store in localStorage as compatibility layer for frontend dashboards
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  if (window.AppState) {
    window.AppState.currentUser = currentUser;
    if (typeof window.saveState === "function") {
      window.saveState();
    }
  }

  // Role Redirection
  const relativeRedirect = getRedirectForRole(profile.role);
  if (!relativeRedirect) {
    const err = new Error("Your account has an unassigned role.");
    err.code = "custom/invalid-role";
    throw err;
  }

  const prefix = getPathPrefix();
  const finalRedirect = prefix + relativeRedirect;

  window.location.href = finalRedirect;

  return {
    success: true,
    user: currentUser,
    redirect: finalRedirect
  };
}

// Google Authentication ONLY for Citizens
async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  let result;
  try {
    result = await signInWithPopup(auth, provider);
  } catch (authError) {
    console.error("Firebase Google Auth signInWithPopup error:", authError);
    if (authError.code) console.error("Auth Error Code:", authError.code);
    if (authError.message) console.error("Auth Error Message:", authError.message);
    if (authError.customData) console.error("Auth Error CustomData:", authError.customData);
    throw authError;
  }

  const user = result.user;
  const uid = user.uid;

  let docSnap;
  try {
    const userDocRef = doc(db, "users", uid);
    docSnap = await getDoc(userDocRef);
  } catch (firestoreReadError) {
    console.error("FIRESTORE PROFILE FAILURE (getDoc users/" + uid + "):", firestoreReadError);
    const err = new Error("Google Authentication succeeded; Firestore profile operation failed.");
    err.code = "firestore/profile-read-failed";
    err.originalError = firestoreReadError;
    throw err;
  }

  let profile;
  if (!docSnap.exists()) {
    // 4. New Citizen profile creation: ALWAYS role = CITIZEN
    profile = {
      uid: user.uid,
      name: user.displayName || "Citizen",
      email: user.email,
      role: "CITIZEN",
      department: null,
      photoURL: user.photoURL || null,
      provider: "google.com",
      createdAt: serverTimestamp()
    };

    try {
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, profile);
    } catch (firestoreWriteError) {
      console.error("FIRESTORE PROFILE FAILURE (setDoc users/" + uid + "):", firestoreWriteError);
      const err = new Error("Google Authentication succeeded; Firestore profile operation failed.");
      err.code = "firestore/profile-write-failed";
      err.originalError = firestoreWriteError;
      throw err;
    }
  } else {
    // 5. Existing Citizen: preserve role, department, createdAt
    const existing = docSnap.data();
    profile = {
      uid: user.uid,
      name: existing.name || user.displayName || "Citizen",
      email: user.email || existing.email,
      role: existing.role || "CITIZEN",
      department: existing.department || null,
      photoURL: user.photoURL || existing.photoURL || null,
      provider: existing.provider || "google.com"
    };
  }

  // 8. LocalStorage Compatibility State
  const currentUserObj = {
    uid: profile.uid,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    department: profile.department
  };

  localStorage.setItem("currentUser", JSON.stringify(currentUserObj));
  if (window.AppState) {
    window.AppState.currentUser = currentUserObj;
    if (typeof window.saveState === "function") {
      window.saveState();
    }
  }

  // 6. Redirection: Citizens to citizen/home.html
  const relativeRedirect = getRedirectForRole(profile.role) || "citizen/home.html";
  const prefix = getPathPrefix();
  const finalRedirect = prefix + relativeRedirect;

  window.location.href = finalRedirect;

  return {
    success: true,
    user: currentUserObj,
    redirect: finalRedirect
  };
}

// Core Logout Function
let isLoggingOut = false;
async function logoutUser() {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    await signOut(auth);
    localStorage.removeItem("currentUser");
    try {
      const saved = localStorage.getItem("civicfixState");
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.currentUser = null;
        localStorage.setItem("civicfixState", JSON.stringify(parsed));
      }
    } catch (e) {}
    if (window.AppState) {
      window.AppState.currentUser = null;
    }
    window.location.href = getLoginPath();
  } catch (error) {
    console.error("Logout failed:", error);
    // Still clear stale local UI session if appropriate
    localStorage.removeItem("currentUser");
    try {
      const saved = localStorage.getItem("civicfixState");
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.currentUser = null;
        localStorage.setItem("civicfixState", JSON.stringify(parsed));
      }
    } catch (e) {}
    if (window.AppState) {
      window.AppState.currentUser = null;
    }
    window.location.href = getLoginPath();
  } finally {
    isLoggingOut = false;
  }
}

// Protected Route Guard
function checkAutoProtect() {
  const path = window.location.pathname.replace(/\\/g, "/");
  const isProtected =
    path.includes("/citizen/") ||
    path.includes("/admin/") ||
    path.includes("/field/");

  if (isProtected) {
    const user = getCurrentUser();
    if (!user) {
      window.location.replace(getLoginPath());
      return false;
    }
  }
  return true;
}

// Protected Route Helpers
function requireAuth(redirectTo = null) {
  const user = getCurrentUser();
  if (!user) {
    const target = redirectTo || getLoginPath();
    window.location.href = target;
    return false;
  }
  return true;
}

function requireRole(allowedRoles, redirectUnauthorized = null) {
  if (!requireAuth()) return false;
  const user = getCurrentUser();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(user.role)) {
    window.location.href = redirectUnauthorized || getLoginPath();
    return false;
  }
  return true;
}

// Attach to existing / future logout buttons
function bindLogoutButtons() {
  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.removeEventListener("click", handleLogoutClick);
    button.addEventListener("click", handleLogoutClick);
  });
}

function handleLogoutClick(e) {
  if (e && e.preventDefault) e.preventDefault();
  logoutUser();
}

// Global click delegation so dynamically rendered topbars & headers always work
document.addEventListener("click", (e) => {
  const logoutBtn = e.target.closest('[data-action="logout"]');
  if (logoutBtn) {
    e.preventDefault();
    logoutUser();
  }
});

// Run protection check
checkAutoProtect();

// Handle back-forward cache (bfcache) navigation
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    checkAutoProtect();
  }
});

// Bind buttons on DOM readiness
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindLogoutButtons);
} else {
  bindLogoutButtons();
}

export {
  loginUser,
  loginWithGoogle,
  logoutUser,
  getCurrentUser,
  getCurrentFirebaseUser,
  requireAuth,
  requireRole,
  mapAuthError,
  getLoginPath,
  auth,
  db
};

// Global compatibility window object
window.Auth = {
  loginUser,
  login: loginUser,
  loginWithGoogle,
  logoutUser,
  logout: logoutUser,
  getCurrentUser,
  getCurrentFirebaseUser,
  requireAuth,
  requireRole,
  mapAuthError,
  getLoginPath,
  auth,
  db
};

window.loginUser = loginUser;
window.loginWithGoogle = loginWithGoogle;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.getCurrentFirebaseUser = getCurrentFirebaseUser;
window.getLoginPath = getLoginPath;
