// =========================================================
// AI CivicFix — Firestore Citizen Reports Service
// Handles creating, querying, and retrieving citizen reports
// =========================================================

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth, db } from "./firebase-init.js";

// Helper to reliably get authenticated Firebase user (waiting if initializing)
export async function getAuthenticatedUser() {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
    setTimeout(() => resolve(auth.currentUser || null), 2500);
  });
}

// 1. Create a citizen report in Firestore
export async function createCitizenReport(reportInput = {}) {
  const user = await getAuthenticatedUser();
  if (!user || !user.uid) {
    throw new Error("User must be authenticated to submit a report.");
  }

  // Exact schema from requirements:
  const docData = {
    citizenId: user.uid,
    citizenEmail: user.email || null,

    imageUrl: reportInput.imageUrl || window.AppState?.imageUrl || null,
    cloudinaryPublicId: reportInput.cloudinaryPublicId || window.AppState?.cloudinaryPublicId || null,

    description: reportInput.description !== undefined ? reportInput.description : (window.AppState?.customDescription || null),

    category: reportInput.category !== undefined ? reportInput.category : null,
    severity: reportInput.severity !== undefined ? reportInput.severity : null,

    latitude: (reportInput.latitude !== undefined && reportInput.latitude !== null)
      ? reportInput.latitude
      : (window.AppState?.currentLocation?.latitude ?? null),
    longitude: (reportInput.longitude !== undefined && reportInput.longitude !== null)
      ? reportInput.longitude
      : (window.AppState?.currentLocation?.longitude ?? null),

    locationText: reportInput.locationText !== undefined
      ? reportInput.locationText
      : (window.AppState?.currentLocation?.address || null),
    ward: reportInput.ward !== undefined
      ? reportInput.ward
      : (window.AppState?.currentLocation?.ward || null),

    department: null,

    status: "SUBMITTED",

    masterIncidentId: null,

    createdAt: serverTimestamp()
  };

  const reportsCol = collection(db, "reports");
  const docRef = await addDoc(reportsCol, docData);

  return {
    id: docRef.id,
    displayId: "CF-" + docRef.id.slice(0, 8).toUpperCase(),
    ...docData,
    createdAt: new Date().toISOString()
  };
}

// 2. Query citizen reports for authenticated user
export async function getCitizenReports(specificUid = null) {
  let uid = specificUid;
  if (!uid) {
    const user = await getAuthenticatedUser();
    if (!user || !user.uid) {
      return [];
    }
    uid = user.uid;
  }

  const reportsCol = collection(db, "reports");
  const q = query(reportsCol, where("citizenId", "==", uid));
  const snapshot = await getDocs(q);

  const reports = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    reports.push({
      id: docSnap.id,
      ...data,
      rawCreatedAt: data.createdAt
    });
  });

  // Sort descending by createdAt in JavaScript to avoid composite index requirements
  reports.sort((a, b) => {
    const timeA = a.rawCreatedAt?.toMillis ? a.rawCreatedAt.toMillis() : (a.rawCreatedAt?.seconds ? a.rawCreatedAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
    const timeB = b.rawCreatedAt?.toMillis ? b.rawCreatedAt.toMillis() : (b.rawCreatedAt?.seconds ? b.rawCreatedAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
    return timeB - timeA;
  });

  return reports;
}

// 3. Get single report by document ID
export async function getReportById(reportId) {
  if (!reportId) return null;
  const docRef = doc(db, "reports", reportId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data
  };
}

// Format Firestore timestamp or Date into readable string
export function formatReportDate(timestamp) {
  if (!timestamp) return "Recently";
  let d;
  if (typeof timestamp.toDate === "function") {
    d = timestamp.toDate();
  } else if (timestamp.seconds) {
    d = new Date(timestamp.seconds * 1000);
  } else {
    d = new Date(timestamp);
  }
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Expose on window for vanilla JS scripts
if (typeof window !== "undefined") {
  window.ReportsService = {
    getAuthenticatedUser,
    createCitizenReport,
    getCitizenReports,
    getReportById,
    formatReportDate
  };
}
