// =========================================================
// AI CivicFix — Real Duplicate Detection & Clustering Service
// Multi-signal evidence comparison: Location (40%), Image (30%),
// Category (20%), and Time (10%).
// =========================================================

import {
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { db } from "./firebase-init.js";

/**
 * Calculates geographical distance between two lat/lon points using the Haversine formula.
 * @returns {number|null} Distance in meters, or null if coordinates are missing.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371000; // Earth radius in meters
  const dLat = (numLat2 - numLat1) * Math.PI / 180;
  const dLon = (numLon2 - numLon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(numLat1 * Math.PI / 180) * Math.cos(numLat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes an 8x8 perceptual average hash (aHash) for a browser image.
 * Lightweight, fast, and does not require machine learning.
 * @param {string} imageSrc - Base64 Data URL, Blob URL, or Image URL.
 * @returns {Promise<string|null>} 64-bit binary string or null if failed.
 */
export async function computeImageHash(imageSrc) {
  if (!imageSrc) return null;
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 1800);

    try {
      const img = new Image();
      if (!imageSrc.startsWith("data:") && !imageSrc.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 8;
          canvas.height = 8;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);

          ctx.drawImage(img, 0, 0, 8, 8);
          const imgData = ctx.getImageData(0, 0, 8, 8).data;

          // Convert to grayscale and compute average
          const grays = [];
          let sum = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            const gray = Math.round(0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]);
            grays.push(gray);
            sum += gray;
          }
          const avg = sum / 64;

          // Build 64-bit binary hash
          let hash = "";
          for (let i = 0; i < 64; i++) {
            hash += grays[i] >= avg ? "1" : "0";
          }
          resolve(hash);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      };
      img.src = imageSrc;
    } catch (e) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Compares two 64-bit hashes and returns similarity percentage (0.0 to 1.0).
 */
export function compareImageHashes(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0.5;
  let matches = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] === hash2[i]) matches++;
  }
  return matches / hash1.length;
}

/**
 * Maps related categories to evaluate category similarity.
 */
export const RELATED_CATEGORY_GROUPS = [
  ["Pothole", "Road Damage", "Footpath Damage"],
  ["Garbage", "Waste Dumping", "Waste Not Collected"],
  ["Water Leakage", "Drainage", "Sewer Overflow", "Sanitary Pipe Leakage"],
  ["Broken Streetlight", "Streetlight Not Working", "High Mast Light"],
  ["Fallen Tree", "Tree Branch Problem", "Park Problem"],
  ["Road Encroachment", "Footpath Encroachment", "Public Space Obstruction"]
];

export function areCategoriesRelated(cat1, cat2) {
  if (!cat1 || !cat2) return false;
  if (cat1.toLowerCase() === cat2.toLowerCase()) return true;
  for (const group of RELATED_CATEGORY_GROUPS) {
    if (group.some(c => c.toLowerCase() === cat1.toLowerCase()) &&
        group.some(c => c.toLowerCase() === cat2.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Computes multi-signal duplicate score between an incoming report and a candidate report.
 * Weights: Location (40%), Image (30%), Category (20%), Time (10%).
 */
export async function computeMultiSignalScore(current, candidate) {
  // 1. Location Proximity (40%)
  let locScore = 0;
  const distance = calculateDistanceMeters(
    current.latitude, current.longitude,
    candidate.latitude, candidate.longitude
  );

  if (distance !== null) {
    if (distance <= 35) locScore = 1.0;
    else if (distance <= 80) locScore = 0.85;
    else if (distance <= 150) locScore = 0.65;
    else if (distance <= 300) locScore = 0.35;
    else locScore = 0.0;
  } else if (current.ward && candidate.ward && String(current.ward).trim() === String(candidate.ward).trim()) {
    locScore = 0.40;
  }

  // 2. Category & Issue Component Match (20%)
  let catScore = 0;
  let isSecondaryMatchOnly = false;
  const currentTypes = (Array.isArray(current.issueComponents) && current.issueComponents.length > 0)
    ? current.issueComponents.map(c => (c.issueType || c).toLowerCase())
    : [String(current.category || "").toLowerCase()];
  const candidateTypes = (Array.isArray(candidate.issueComponents) && candidate.issueComponents.length > 0)
    ? candidate.issueComponents.map(c => (c.issueType || c).toLowerCase())
    : [String(candidate.category || "").toLowerCase()];

  const primaryCurrent = (current.category || "").toLowerCase();
  const primaryCandidate = (candidate.category || "").toLowerCase();

  if (primaryCurrent && primaryCandidate && primaryCurrent === primaryCandidate) {
    catScore = 1.0;
  } else if (currentTypes.some(t => candidateTypes.includes(t))) {
    // Shares a component (e.g. Report A: Pothole, Report B: Sanitary Pipe Leakage + Pothole)
    catScore = 0.75;
    isSecondaryMatchOnly = true;
  } else if (areCategoriesRelated(current.category, candidate.category)) {
    catScore = 0.65;
  }

  // 3. Time Proximity (10%)
  let timeScore = 0.1;
  const now = Date.now();
  const candTime = candidate.createdAt?.toMillis
    ? candidate.createdAt.toMillis()
    : (candidate.createdAt?.seconds ? candidate.createdAt.seconds * 1000 : new Date(candidate.createdAt || 0).getTime());

  if (candTime > 0) {
    const diffDays = Math.abs(now - candTime) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) timeScore = 1.0;
    else if (diffDays <= 3) timeScore = 0.8;
    else if (diffDays <= 7) timeScore = 0.6;
    else if (diffDays <= 14) timeScore = 0.4;
    else timeScore = 0.15;
  }

  // 4. Image Similarity (30%)
  let imgScore = 0.5; // neutral fallback
  if (current.imageHash && (candidate.imageHash || candidate.imageUrl)) {
    try {
      const candHash = candidate.imageHash || await computeImageHash(candidate.imageUrl);
      if (candHash) {
        const sim = compareImageHashes(current.imageHash, candHash);
        if (sim >= 0.85) imgScore = 1.0;
        else if (sim >= 0.72) imgScore = 0.75;
        else if (sim >= 0.60) imgScore = 0.45;
        else imgScore = 0.10;
      }
    } catch (e) {
      imgScore = 0.5;
    }
  }

  // Final weighted normalized score
  const totalScore = (locScore * 0.40) + (imgScore * 0.30) + (catScore * 0.20) + (timeScore * 0.10);

  return {
    totalScore: Math.min(Math.max(totalScore, 0), 1),
    distance,
    locScore,
    imgScore,
    catScore,
    timeScore,
    isSecondaryMatchOnly
  };
}

/**
 * Searches existing Firestore reports for possible duplicates or related incidents.
 * @param {Object} reportInput
 * @returns {Promise<Object>} Duplicate analysis result
 */
export async function detectDuplicateReport(reportInput = {}) {
  const category = reportInput.category || "Pothole";
  const issueComponents = reportInput.issueComponents || [];
  const latitude = reportInput.latitude;
  const longitude = reportInput.longitude;
  const ward = reportInput.ward || "20";
  const address = reportInput.locationText || "Kolhapur";
  const imageUrl = reportInput.imageUrl || reportInput.selectedImage;

  // Compute image hash for incoming photo
  let imageHash = reportInput.imageHash || null;
  if (!imageHash && imageUrl) {
    try {
      imageHash = await computeImageHash(imageUrl);
    } catch (e) {}
  }

  const currentPayload = {
    category,
    issueComponents,
    latitude,
    longitude,
    ward,
    address,
    imageHash
  };

  try {
    // Filter candidates in Firestore across all component categories
    const categoriesToSearch = new Set([category]);
    if (Array.isArray(issueComponents)) {
      issueComponents.forEach(c => {
        if (c.issueType) categoriesToSearch.add(c.issueType);
      });
    }

    let targetCategories = [];
    categoriesToSearch.forEach(cat => {
      targetCategories.push(cat);
      for (const group of RELATED_CATEGORY_GROUPS) {
        if (group.some(c => c.toLowerCase() === cat.toLowerCase())) {
          group.forEach(g => targetCategories.push(g));
          break;
        }
      }
    });
    // Unique list capped to 25 items for Firestore limit
    targetCategories = Array.from(new Set(targetCategories)).slice(0, 25);

    const reportsCol = collection(db, "reports");
    const q = query(reportsCol, where("category", "in", targetCategories), limit(25));
    const snapshot = await getDocs(q);

    const candidates = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Exclude closed or resolved reports
      const status = (data.status || "").toUpperCase();
      if (status !== "RESOLVED" && status !== "CLOSED") {
        candidates.push({ id: docSnap.id, ...data });
      }
    });

    let bestMatch = null;
    let highestScore = 0;
    let bestDetails = null;

    for (const cand of candidates) {
      const evaluation = await computeMultiSignalScore(currentPayload, cand);
      if (evaluation.totalScore > highestScore) {
        highestScore = evaluation.totalScore;
        bestMatch = cand;
        bestDetails = evaluation;
      }
    }

    const normalizedPercent = Math.round(highestScore * 100);

    // Section 19: If only a secondary issue component matches (e.g. Sanitary Pipe Leakage + Pothole vs Pothole),
    // suggest "Possible related incident" and do NOT automatically merge as an exact duplicate.
    if (highestScore >= 0.65 && bestMatch && !bestDetails?.isSecondaryMatchOnly) {
      const masterIncidentId = bestMatch.masterIncidentId || `KMC-${bestMatch.id.slice(0, 4).toUpperCase()}`;
      return {
        duplicateStatus: "POSSIBLE_DUPLICATE",
        duplicateScore: normalizedPercent,
        isDuplicate: true,
        possibleDuplicateReportId: bestMatch.id,
        masterIncidentId: masterIncidentId,
        matchedReport: bestMatch,
        distanceMeters: bestDetails?.distance,
        displayDistance: bestDetails?.distance != null ? `${bestDetails.distance}m` : "Nearby",
        imageHash: imageHash,
        title: "Possible duplicate detected",
        message: "Your report may refer to an existing civic incident in this area. It will be linked as additional evidence to increase priority."
      };
    } else if ((highestScore >= 0.40 || bestDetails?.isSecondaryMatchOnly) && bestMatch) {
      const masterIncidentId = bestMatch.masterIncidentId || `KMC-${bestMatch.id.slice(0, 4).toUpperCase()}`;
      return {
        duplicateStatus: "POSSIBLY_RELATED",
        duplicateScore: normalizedPercent,
        isDuplicate: true,
        possibleDuplicateReportId: bestMatch.id,
        masterIncidentId: masterIncidentId,
        matchedReport: bestMatch,
        distanceMeters: bestDetails?.distance,
        displayDistance: bestDetails?.distance != null ? `${bestDetails.distance}m` : "Nearby",
        imageHash: imageHash,
        title: "Possible related incident found",
        message: "A related civic problem exists nearby. Linking your report coordinates municipal response for this location."
    } else {
      // No duplicate: generate a new clean Master Incident ID
      const newMasterId = `KMC-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        duplicateStatus: "NO_DUPLICATE",
        duplicateScore: normalizedPercent,
        isDuplicate: false,
        possibleDuplicateReportId: null,
        masterIncidentId: newMasterId,
        matchedReport: null,
        distanceMeters: null,
        displayDistance: null,
        imageHash: imageHash,
        title: "No likely duplicate found",
        message: "No existing civic issue matches this location and category. A new Master Incident will be created."
      };
    }
  } catch (error) {
    console.warn("Firestore duplicate detection query notice:", error);
    // Graceful offline fallback
    const fallbackId = `KMC-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      duplicateStatus: "NO_DUPLICATE",
      duplicateScore: 0,
      isDuplicate: false,
      possibleDuplicateReportId: null,
      masterIncidentId: fallbackId,
      matchedReport: null,
      distanceMeters: null,
      displayDistance: null,
      title: "No duplicate detected",
      message: "Your report will create a new Master Incident."
    };
  }
}

// Global binding for vanilla browser environment
if (typeof window !== "undefined") {
  window.DuplicateService = {
    detectDuplicateReport,
    calculateDistanceMeters,
    computeImageHash,
    compareImageHashes,
    computeMultiSignalScore
  };
}
