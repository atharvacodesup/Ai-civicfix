// =========================================================
// AI CivicFix — Firestore Citizen Reports Service
// Source of truth for reports, masterIncidents, and workflowEvents
// =========================================================

import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth, db } from "./firebase-init.js";
import { encodeGeohash } from "./geohash.js";

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

// Canonical unit mapping for the 6 exact municipal departments
export function getResponsibleUnit(department) {
  switch (department) {
    case "City Engineer / PWD":
      return "Road Maintenance Team";
    case "Health & Sanitation":
      return "Sanitation Team";
    case "Water Supply & Drainage":
      return "Water / Drainage Field Team";
    case "Electricity":
      return "Electrical Field Team";
    case "Garden":
      return "Garden Field Team";
    case "Encroachment":
      return "Encroachment Field Team";
    default:
      return "Concerned Sub-City Engineer";
  }
}

// 1. Create a citizen report in Firestore
export async function createCitizenReport(reportInput = {}) {
  const user = await getAuthenticatedUser();
  if (!user || !user.uid) {
    throw new Error("User must be authenticated to submit a report.");
  }

  const category = reportInput.category || window.AppState?.currentAIResult?.problemType || window.AppState?.currentReport?.problemType || "Pothole";
  const severity = reportInput.severity || window.AppState?.currentAIResult?.severity || window.AppState?.currentReport?.severity || "High";

  let dept = reportInput.department;
  if (!dept) {
    if (window.Routing?.resolve) {
      dept = window.Routing.resolve(category).department;
    } else {
      dept = "City Engineer / PWD";
    }
  }

  // Ensure department is strictly one of the canonical names
  const validDepartments = [
    "City Engineer / PWD",
    "Health & Sanitation",
    "Water Supply & Drainage",
    "Electricity",
    "Garden",
    "Encroachment",
    "Manual Department Review Required"
  ];
  if (!validDepartments.includes(dept)) {
    dept = "City Engineer / PWD";
  }

  const responsibleUnit = reportInput.responsibleUnit || getResponsibleUnit(dept);

  const duplicateStatus = reportInput.duplicateStatus || window.AppState?.currentReport?.duplicateStatus || "NO_DUPLICATE";
  const duplicateScore = reportInput.duplicateScore !== undefined
    ? reportInput.duplicateScore
    : (window.AppState?.currentReport?.duplicateScore ?? 0);
  const possibleDuplicateReportId = reportInput.possibleDuplicateReportId !== undefined
    ? reportInput.possibleDuplicateReportId
    : (window.AppState?.currentReport?.possibleDuplicateReportId || null);

  const masterIncidentId = reportInput.masterIncidentId !== undefined
    ? reportInput.masterIncidentId
    : (window.AppState?.currentMasterIncident?.id || window.AppState?.currentReport?.masterIncidentId || `KMC-${Math.floor(1000 + Math.random() * 9000)}`);

  const status = reportInput.status || "REPORT_SUBMITTED";
  const currentStage = reportInput.currentStage || "REPORT_SUBMITTED";

  // Multi-Issue & Multi-Department metadata
  const issueComponents = Array.isArray(reportInput.issueComponents) && reportInput.issueComponents.length > 0
    ? reportInput.issueComponents
    : (window.AppState?.currentReport?.issueComponents || window.AppState?.currentAIResult?.issueComponents || []);
  const primaryIssue = reportInput.primaryIssue || window.AppState?.currentReport?.primaryIssue || null;
  const overallSeverity = reportInput.overallSeverity || window.AppState?.currentReport?.overallSeverity || severity;
  const requiresMultipleDepartments = reportInput.requiresMultipleDepartments !== undefined
    ? reportInput.requiresMultipleDepartments
    : (window.AppState?.currentReport?.requiresMultipleDepartments ?? (issueComponents.length > 1));
  const departmentCount = reportInput.departmentCount !== undefined
    ? reportInput.departmentCount
    : (window.AppState?.currentReport?.departmentCount ?? (requiresMultipleDepartments ? 2 : 1));
  const primaryDepartment = reportInput.primaryDepartment || window.AppState?.currentReport?.primaryDepartment || dept;
  const supportingDepartments = Array.isArray(reportInput.supportingDepartments)
    ? reportInput.supportingDepartments
    : (window.AppState?.currentReport?.supportingDepartments || []);
  const departmentAssignments = Array.isArray(reportInput.departmentAssignments)
    ? reportInput.departmentAssignments
    : (window.AppState?.currentReport?.departmentAssignments || []);
  const workOrders = Array.isArray(reportInput.workOrders)
    ? reportInput.workOrders
    : (window.AppState?.currentReport?.workOrders || []);
  const routingStatus = reportInput.routingStatus || window.AppState?.currentReport?.routingStatus || "CONFIRMED";

  // Build complete document schema according to Section 16 & 17:
  const docData = {
    citizenId: user.uid,
    citizenEmail: user.email || null,
    imageUrl: reportInput.imageUrl || window.AppState?.imageUrl || null,
    cloudinaryPublicId: reportInput.cloudinaryPublicId || window.AppState?.cloudinaryPublicId || null,
    description: reportInput.description !== undefined ? reportInput.description : (window.AppState?.customDescription || null),

    // Backward-compatible core civic problem fields
    category: category,
    severity: severity,
    aiConfidence: (reportInput.aiConfidence !== undefined && reportInput.aiConfidence !== null)
      ? reportInput.aiConfidence
      : (window.AppState?.currentAIResult?.confidence ?? 91),
    aiSummary: reportInput.aiSummary || window.AppState?.currentAIResult?.summary || window.AppState?.currentAIResult?.description || `${category} identified by AI CivicFix.`,
    aiObservations: reportInput.aiObservations || window.AppState?.currentAIResult?.observations || [
      `${category} detected on corridor`,
      "Visible municipal infrastructure defect requiring maintenance"
    ],
    recommendedAction: reportInput.recommendedAction || window.AppState?.currentAIResult?.recommendedAction || "Field inspection and site repair",
    aiAnalysisStatus: reportInput.aiAnalysisStatus || "COMPLETED",

    // Section 16 & 17: Multi-issue & Multi-department fields
    issueComponents: issueComponents,
    primaryIssue: primaryIssue,
    overallSeverity: overallSeverity,
    requiresMultipleDepartments: requiresMultipleDepartments,
    departmentCount: departmentCount,
    primaryDepartment: primaryDepartment,
    supportingDepartments: supportingDepartments,
    departmentAssignments: departmentAssignments,
    workOrders: workOrders,
    routingStatus: routingStatus,

    latitude: (reportInput.latitude !== undefined && reportInput.latitude !== null)
      ? reportInput.latitude
      : (window.AppState?.currentLocation?.latitude ?? null),
    longitude: (reportInput.longitude !== undefined && reportInput.longitude !== null)
      ? reportInput.longitude
      : (window.AppState?.currentLocation?.longitude ?? null),
    accuracy: reportInput.accuracy !== undefined
      ? reportInput.accuracy
      : (window.AppState?.currentLocation?.accuracy ?? null),

    displayAddress: reportInput.displayAddress || reportInput.locationText || window.AppState?.currentLocation?.displayAddress || window.AppState?.currentLocation?.address || null,
    locationText: reportInput.locationText || reportInput.displayAddress || window.AppState?.currentLocation?.address || null,
    road: reportInput.road || window.AppState?.currentLocation?.road || null,
    neighbourhood: reportInput.neighbourhood || window.AppState?.currentLocation?.neighbourhood || null,
    suburb: reportInput.suburb || window.AppState?.currentLocation?.suburb || null,
    city: reportInput.city || window.AppState?.currentLocation?.city || "Kolhapur",
    district: reportInput.district || window.AppState?.currentLocation?.district || "Kolhapur",
    state: reportInput.state || window.AppState?.currentLocation?.state || "Maharashtra",
    postcode: reportInput.postcode || window.AppState?.currentLocation?.postcode || null,

    municipality: reportInput.municipality || window.AppState?.currentLocation?.municipality || "Kolhapur Municipal Corporation",
    ward: reportInput.ward !== undefined
      ? reportInput.ward
      : (window.AppState?.currentLocation?.ward || null),
    wardName: reportInput.wardName || window.AppState?.currentLocation?.wardName || null,
    division: reportInput.division || window.AppState?.currentLocation?.division || null,
    divisionOffice: reportInput.divisionOffice || window.AppState?.currentLocation?.divisionOffice || null,
    jurisdictionStatus: reportInput.jurisdictionStatus || window.AppState?.currentLocation?.jurisdictionStatus || "INSIDE KMC",
    jurisdiction: reportInput.jurisdiction || window.AppState?.currentLocation?.jurisdiction || "YES",

    department: primaryDepartment || dept,
    responsibleUnit: responsibleUnit,

    nearbySimilarCount: reportInput.nearbySimilarCount !== undefined
      ? reportInput.nearbySimilarCount
      : (window.AppState?.currentLocation?.nearbySimilarCount ?? 0),
    duplicateStatus: duplicateStatus,
    duplicateScore: duplicateScore,
    possibleDuplicateReportId: possibleDuplicateReportId,
    masterIncidentId: masterIncidentId || null,
    imageHash: reportInput.imageHash || window.AppState?.currentReport?.imageHash || null,
    geohash: (reportInput.latitude != null && reportInput.longitude != null)
      ? encodeGeohash(reportInput.latitude, reportInput.longitude, 7)
      : (window.AppState?.currentLocation?.latitude != null ? encodeGeohash(window.AppState.currentLocation.latitude, window.AppState.currentLocation.longitude, 7) : null),

    status: status,
    currentStage: currentStage,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const reportsCol = collection(db, "reports");
  const docRef = await addDoc(reportsCol, docData);

  // 1. If masterIncidentId is present: update or create the masterIncident record
  if (masterIncidentId) {
    try {
      const masterDocRef = doc(db, "masterIncidents", masterIncidentId);
      const masterSnap = await getDoc(masterDocRef);

      if (masterSnap.exists()) {
        const updatePayload = {
          reportsCount: increment(1),
          latestReportId: docRef.id,
          updatedAt: serverTimestamp()
        };
        // Merge multi-issue data if available
        if (issueComponents.length > 0) {
          updatePayload.issueComponents = issueComponents;
          updatePayload.primaryDepartment = primaryDepartment;
          updatePayload.supportingDepartments = supportingDepartments;
          updatePayload.departmentAssignments = departmentAssignments;
          updatePayload.departmentCount = departmentCount;
          updatePayload.requiresMultipleDepartments = requiresMultipleDepartments;
          updatePayload.workOrders = workOrders;
        }
        await updateDoc(masterDocRef, updatePayload);
      } else {
        await setDoc(masterDocRef, {
          id: masterIncidentId,
          problemType: category,
          category: category,
          severity: overallSeverity,
          address: docData.locationText || "Kolhapur",
          locationText: docData.locationText || "Kolhapur",
          latitude: docData.latitude,
          longitude: docData.longitude,
          ward: docData.ward || "20",
          department: primaryDepartment || dept,
          primaryDepartment: primaryDepartment || dept,
          supportingDepartments: supportingDepartments,
          departmentAssignments: departmentAssignments,
          departmentCount: departmentCount,
          requiresMultipleDepartments: requiresMultipleDepartments,
          issueComponents: issueComponents,
          workOrders: workOrders,
          assignment: responsibleUnit,
          responsibleUnit: responsibleUnit,
          status: "ASSIGNED",
          recommendedAction: docData.recommendedAction,
          workOrderId: "WO-" + (masterIncidentId.replace(/[^0-9]/g, "") || "1042"),
          reportsCount: 1,
          latestReportId: docRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (mErr) {
      console.warn("Could not sync masterIncident:", mErr);
    }
  }

  // 2. Log workflowEvent in workflowEvents collection
  try {
    const eventsCol = collection(db, "workflowEvents");
    await addDoc(eventsCol, {
      reportId: docRef.id,
      masterIncidentId: masterIncidentId || null,
      type: "REPORT_SUBMITTED",
      fromStatus: null,
      toStatus: status,
      message: `Report submitted by citizen and routed to ${dept}`,
      actorId: user.uid,
      actorRole: "CITIZEN",
      createdAt: serverTimestamp()
    });
  } catch (wErr) {
    console.warn("Could not log workflowEvent:", wErr);
  }

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
    if (data.deletedForCitizen === true || data.deleted === true) {
      return; // Soft-removed reports are hidden from citizen My Reports view
    }
    reports.push({
      id: docSnap.id,
      displayId: "CF-" + docSnap.id.slice(0, 8).toUpperCase(),
      ...data,
      rawCreatedAt: data.createdAt,
      rawUpdatedAt: data.updatedAt
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

// 2b. Real-time citizen reports subscription
export function subscribeCitizenReports(specificUid = null, onUpdate, onError) {
  let uid = specificUid;
  if (!uid && auth.currentUser) {
    uid = auth.currentUser.uid;
  }
  if (!uid) {
    if (typeof onError === "function") onError(new Error("User not authenticated"));
    return () => {};
  }

  const reportsCol = collection(db, "reports");
  const q = query(reportsCol, where("citizenId", "==", uid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const reports = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.deletedForCitizen === true || data.deleted === true) {
          return; // Soft-removed reports are hidden from citizen My Reports view
        }
        reports.push({
          id: docSnap.id,
          displayId: "CF-" + docSnap.id.slice(0, 8).toUpperCase(),
          ...data,
          rawCreatedAt: data.createdAt,
          rawUpdatedAt: data.updatedAt
        });
      });

      // Sort descending by createdAt in JavaScript
      reports.sort((a, b) => {
        const timeA = a.rawCreatedAt?.toMillis ? a.rawCreatedAt.toMillis() : (a.rawCreatedAt?.seconds ? a.rawCreatedAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
        const timeB = b.rawCreatedAt?.toMillis ? b.rawCreatedAt.toMillis() : (b.rawCreatedAt?.seconds ? b.rawCreatedAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
        return timeB - timeA;
      });

      if (typeof onUpdate === "function") {
        onUpdate(reports);
      }
    },
    (error) => {
      console.error("Firestore onSnapshot error for citizen reports:", error);
      if (typeof onError === "function") {
        onError(error);
      }
    }
  );

  return unsubscribe;
}

// Helper to check if a report is in an editable initial stage (description updates)
export function isReportEditable(report) {
  if (!report) return false;
  if (report.deletedForCitizen === true || report.deleted === true) return false;
  const status = (report.status || "").toUpperCase();
  return status === "REPORT_SUBMITTED" || status === "SUBMITTED" || status === "PENDING";
}

// Helper to check if a report can be removed by the citizen from their view
// Available for all own report statuses (SUBMITTED, ASSIGNED, WORK_IN_PROGRESS, RESOLVED, CLOSED)
export function isReportRemovable(report) {
  if (!report) return false;
  if (report.deletedForCitizen === true || report.deleted === true) return false;
  return true;
}

// Citizen UPDATE: Update citizen-editable fields (description) on own report
export async function updateCitizenReport(reportId, updateData = {}) {
  const user = await getAuthenticatedUser();
  if (!user || !user.uid) {
    throw new Error("You must be signed in to edit this report.");
  }
  if (!reportId) {
    throw new Error("Report ID is required.");
  }

  const reportRef = doc(db, "reports", reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) {
    throw new Error("Report not found.");
  }

  const existingData = snap.data();
  if (existingData.citizenId !== user.uid) {
    throw new Error("Unauthorized: You can only edit your own reports.");
  }

  if (!isReportEditable(existingData)) {
    throw new Error("This report cannot be edited because municipal processing has already started.");
  }

  const payload = {
    updatedAt: serverTimestamp()
  };

  if (updateData.description !== undefined) {
    payload.description = updateData.description.trim();
  }

  await updateDoc(reportRef, payload);

  // Log workflow audit event
  try {
    const eventsCol = collection(db, "workflowEvents");
    await addDoc(eventsCol, {
      reportId: reportId,
      masterIncidentId: existingData.masterIncidentId || null,
      type: "REPORT_UPDATED",
      fromStatus: existingData.status,
      toStatus: existingData.status,
      message: "Citizen updated report description",
      actorId: user.uid,
      actorRole: "CITIZEN",
      createdAt: serverTimestamp()
    });
  } catch (wErr) {
    console.warn("Could not log update workflowEvent:", wErr);
  }

  return { id: reportId, ...existingData, ...payload };
}

// Citizen-side soft removal: removes report from citizen's My Reports view
// Works for all own report statuses (SUBMITTED, WORK_IN_PROGRESS, RESOLVED, CLOSED, etc.)
// Preserves municipal history, Master Incidents, workflow events, and resolution data completely intact!
export async function removeCitizenReport(reportId) {
  const user = await getAuthenticatedUser();
  if (!user || !user.uid) {
    throw new Error("You must be signed in to remove this report.");
  }
  if (!reportId) {
    throw new Error("Report ID is required.");
  }

  const reportRef = doc(db, "reports", reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) {
    throw new Error("Report not found.");
  }

  const existingData = snap.data();
  if (existingData.citizenId !== user.uid) {
    throw new Error("Unauthorized: You can only remove your own reports.");
  }

  // Master Incident Safety (Section 13) & Resolution History (Section 14):
  // DO NOT delete the Master Incident. DO NOT delete other citizens' reports.
  // DO NOT delete workflow events, resolution data, proof-of-fix, or municipal history.
  // Perform citizen-side soft removal only:
  await updateDoc(reportRef, {
    deletedForCitizen: true,
    deletedForCitizenAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Log workflow audit event (preserves complete history)
  try {
    const eventsCol = collection(db, "workflowEvents");
    await addDoc(eventsCol, {
      reportId: reportId,
      masterIncidentId: existingData.masterIncidentId || null,
      type: "CITIZEN_REMOVED",
      fromStatus: existingData.status,
      toStatus: existingData.status,
      message: "Report removed from citizen My Reports list",
      actorId: user.uid,
      actorRole: "CITIZEN",
      createdAt: serverTimestamp()
    });
  } catch (wErr) {
    console.warn("Could not log workflowEvent:", wErr);
  }

  return { id: reportId, deletedForCitizen: true };
}

// Backwards-compatible alias for deleteCitizenReport
export async function deleteCitizenReport(reportId) {
  return removeCitizenReport(reportId);
}

// 3. Real-time department reports subscription
export function subscribeDepartmentReports(department, onUpdate, onError) {
  const reportsCol = collection(db, "reports");
  let q;

  const deptTrimmed = (department || "").trim();
  if (deptTrimmed === "All" || deptTrimmed === "") {
    q = query(reportsCol);
  } else {
    q = query(reportsCol, where("department", "==", deptTrimmed));
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const reports = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reports.push({
          id: docSnap.id,
          displayId: "CF-" + docSnap.id.slice(0, 8).toUpperCase(),
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

      if (typeof onUpdate === "function") {
        onUpdate(reports);
      }
    },
    (error) => {
      console.error("Firestore onSnapshot error for department:", deptTrimmed, error);
      if (typeof onError === "function") {
        onError(error);
      }
    }
  );

  return unsubscribe;
}

// 4. One-time fetch of department reports
export async function getDepartmentReports(department) {
  const reportsCol = collection(db, "reports");
  let q;

  const deptTrimmed = (department || "").trim();
  if (deptTrimmed === "All" || deptTrimmed === "") {
    q = query(reportsCol);
  } else {
    q = query(reportsCol, where("department", "==", deptTrimmed));
  }

  const snapshot = await getDocs(q);
  const reports = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    reports.push({
      id: docSnap.id,
      displayId: "CF-" + docSnap.id.slice(0, 8).toUpperCase(),
      ...data,
      rawCreatedAt: data.createdAt
    });
  });

  reports.sort((a, b) => {
    const timeA = a.rawCreatedAt?.toMillis ? a.rawCreatedAt.toMillis() : (a.rawCreatedAt?.seconds ? a.rawCreatedAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
    const timeB = b.rawCreatedAt?.toMillis ? b.rawCreatedAt.toMillis() : (b.rawCreatedAt?.seconds ? b.rawCreatedAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
    return timeB - timeA;
  });

  return reports;
}

// 5. Get single report by document ID
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
    displayId: "CF-" + docSnap.id.slice(0, 8).toUpperCase(),
    ...data
  };
}

// 6. Get workflow history events for a report
export async function getWorkflowEvents(reportId) {
  if (!reportId) return [];
  try {
    const eventsCol = collection(db, "workflowEvents");
    const q = query(eventsCol, where("reportId", "==", reportId));
    const snapshot = await getDocs(q);

    const events = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      events.push({
        id: docSnap.id,
        ...data,
        rawCreatedAt: data.createdAt
      });
    });

    events.sort((a, b) => {
      const timeA = a.rawCreatedAt?.toMillis ? a.rawCreatedAt.toMillis() : (a.rawCreatedAt?.seconds ? a.rawCreatedAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
      const timeB = b.rawCreatedAt?.toMillis ? b.rawCreatedAt.toMillis() : (b.rawCreatedAt?.seconds ? b.rawCreatedAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
      return timeA - timeB; // ascending
    });

    return events;
  } catch (err) {
    console.error("Error fetching workflowEvents for report:", reportId, err);
    return [];
  }
}

// 7. Subscribe to real-time workflow events for a report
export function subscribeWorkflowEvents(reportId, onUpdate) {
  if (!reportId) return () => {};
  const eventsCol = collection(db, "workflowEvents");
  const q = query(eventsCol, where("reportId", "==", reportId));

  return onSnapshot(q, (snapshot) => {
    const events = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      events.push({
        id: docSnap.id,
        ...data,
        rawCreatedAt: data.createdAt
      });
    });

    events.sort((a, b) => {
      const timeA = a.rawCreatedAt?.toMillis ? a.rawCreatedAt.toMillis() : (a.rawCreatedAt?.seconds ? a.rawCreatedAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
      const timeB = b.rawCreatedAt?.toMillis ? b.rawCreatedAt.toMillis() : (b.rawCreatedAt?.seconds ? b.rawCreatedAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
      return timeA - timeB; // ascending
    });

    if (typeof onUpdate === "function") {
      onUpdate(events);
    }
  });
}

// 8. Add a custom workflow event
export async function addWorkflowEvent(eventData = {}) {
  const user = await getAuthenticatedUser();
  const eventsCol = collection(db, "workflowEvents");
  const docRef = await addDoc(eventsCol, {
    reportId: eventData.reportId || null,
    masterIncidentId: eventData.masterIncidentId || null,
    type: eventData.type || "STATUS_CHANGE",
    fromStatus: eventData.fromStatus || null,
    toStatus: eventData.toStatus || "UPDATED",
    message: eventData.message || "",
    actorId: user ? user.uid : (eventData.actorId || "SYSTEM"),
    actorRole: eventData.actorRole || "CITIZEN",
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

// 9. Update report status and log workflow event
export async function updateReportStatus(reportId, newStatus, message = "", actorRole = "DEPARTMENT_ADMIN", additionalData = {}) {
  const user = await getAuthenticatedUser();
  const actorId = user ? user.uid : "SYSTEM";
  const reportRef = doc(db, "reports", reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) {
    throw new Error("Report not found: " + reportId);
  }
  const oldData = snap.data();
  const oldStatus = oldData.status;

  await updateDoc(reportRef, {
    status: newStatus,
    currentStage: newStatus,
    updatedAt: serverTimestamp(),
    ...additionalData
  });

  const eventsCol = collection(db, "workflowEvents");
  await addDoc(eventsCol, {
    reportId: reportId,
    masterIncidentId: oldData.masterIncidentId || null,
    type: "STATUS_CHANGE",
    fromStatus: oldStatus,
    toStatus: newStatus,
    message: message || `Status updated to ${newStatus}`,
    actorId: actorId,
    actorRole: actorRole,
    createdAt: serverTimestamp()
  });

  return { id: reportId, status: newStatus };
}

// 10. Query master incidents from Firestore
export async function getMasterIncidents() {
  const colRef = collection(db, "masterIncidents");
  const snap = await getDocs(colRef);
  const list = [];
  snap.forEach((docSnap) => {
    list.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });
  return list;
}

// 11. Get master incident by ID from Firestore
export async function getMasterIncidentById(id) {
  if (!id) return null;
  const docRef = doc(db, "masterIncidents", id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

// 12. Get citizen reports linked to a master incident
export async function getReportsByMasterIncident(masterIncidentId) {
  if (!masterIncidentId) return [];
  const reportsCol = collection(db, "reports");
  const q = query(reportsCol, where("masterIncidentId", "==", masterIncidentId));
  const snap = await getDocs(q);
  const reports = [];
  snap.forEach((d) => {
    reports.push({
      id: d.id,
      displayId: "CF-" + d.id.slice(0, 8).toUpperCase(),
      ...d.data(),
      rawCreatedAt: d.data().createdAt
    });
  });
  reports.sort((a, b) => {
    const timeA = a.rawCreatedAt?.toMillis ? a.rawCreatedAt.toMillis() : (a.rawCreatedAt?.seconds ? a.rawCreatedAt.seconds * 1000 : new Date(a.createdAt || 0).getTime());
    const timeB = b.rawCreatedAt?.toMillis ? b.rawCreatedAt.toMillis() : (b.rawCreatedAt?.seconds ? b.rawCreatedAt.seconds * 1000 : new Date(b.createdAt || 0).getTime());
    return timeB - timeA;
  });
  return reports;
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
    getResponsibleUnit,
    createCitizenReport,
    getCitizenReports,
    getDepartmentReports,
    subscribeDepartmentReports,
    getReportById,
    getWorkflowEvents,
    subscribeWorkflowEvents,
    addWorkflowEvent,
    updateReportStatus,
    getMasterIncidents,
    getMasterIncidentById,
    getReportsByMasterIncident,
    formatReportDate,
    subscribeCitizenReports,
    isReportEditable,
    isReportRemovable,
    updateCitizenReport,
    deleteCitizenReport,
    removeCitizenReport
  };
}
