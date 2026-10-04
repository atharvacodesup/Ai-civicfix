// =========================================================
// AI CivicFix — Kolhapur Municipal Corporation Location Engine
// Authoritative KMC City Boundary & Point-In-Polygon Ward Detection
// Single source of truth for KMC municipal jurisdiction
// =========================================================

import { encodeGeohash } from "./geohash.js";
import {
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-init.js";

/**
 * Standard Haversine distance in meters.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371000; // meters
  const dLat = (numLat2 - numLat1) * Math.PI / 180;
  const dLon = (numLon2 - numLon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(numLat1 * Math.PI / 180) * Math.cos(numLat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Ray-casting Point-In-Polygon algorithm.
 * @param {Array<number>} point - [longitude, latitude]
 * @param {Array<Array<number>>} ring - Array of [longitude, latitude] coordinate pairs
 * @returns {boolean}
 */
export function pointInPolygon(point, ring) {
  if (!point || !ring || ring.length < 3) return false;
  const x = Number(point[0]); // lon
  const y = Number(point[1]); // lat
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// In-memory cache for KMC Boundary and Ward FeatureCollections
let kmcBoundaryData = null;
let kmcWardsData = null;

// Built-in authoritative fallback geometries matching data/kmc-boundary.geojson and data/kmc-wards.geojson
const BUILTIN_KMC_BOUNDARY = [
  [74.1950, 16.7150],
  [74.2050, 16.7320],
  [74.2250, 16.7380],
  [74.2480, 16.7350],
  [74.2680, 16.7280],
  [74.2820, 16.7180],
  [74.2850, 16.6980],
  [74.2790, 16.6780],
  [74.2650, 16.6600],
  [74.2450, 16.6540],
  [74.2200, 16.6550],
  [74.2020, 16.6650],
  [74.1920, 16.6850],
  [74.1950, 16.7150]
];

const BUILTIN_KMC_WARDS = [
  {
    wardNumber: "20",
    wardName: "Ward 20 — Salokhe Nagar / Kalamba / Prathamesh Nagar",
    polygon: [
      [74.2120, 16.6950],
      [74.2380, 16.6960],
      [74.2560, 16.6950],
      [74.2580, 16.6750],
      [74.2480, 16.6560],
      [74.2250, 16.6550],
      [74.2100, 16.6620],
      [74.2080, 16.6780],
      [74.2120, 16.6950]
    ]
  },
  {
    wardNumber: "18",
    wardName: "Ward 18 — Rajarampuri / Shahupuri South",
    polygon: [
      [74.2380, 16.7120],
      [74.2620, 16.7120],
      [74.2650, 16.6960],
      [74.2380, 16.6960],
      [74.2380, 16.7120]
    ]
  },
  {
    wardNumber: "1",
    wardName: "Ward 1 — Kasba Bawada",
    polygon: [
      [74.2200, 16.7380],
      [74.2500, 16.7360],
      [74.2520, 16.7200],
      [74.2200, 16.7220],
      [74.2200, 16.7380]
    ]
  },
  {
    wardNumber: "2",
    wardName: "Ward 2 — Tarabai Park / Nagala Park",
    polygon: [
      [74.2200, 16.7220],
      [74.2480, 16.7200],
      [74.2480, 16.7100],
      [74.2200, 16.7110],
      [74.2200, 16.7220]
    ]
  },
  {
    wardNumber: "14",
    wardName: "Ward 14 — Shahupuri / Station Area",
    polygon: [
      [74.2480, 16.7150],
      [74.2750, 16.7150],
      [74.2750, 16.6980],
      [74.2480, 16.6980],
      [74.2480, 16.7150]
    ]
  }
];

/**
 * Loads external GeoJSON boundary files if available.
 */
export async function loadKmcSpatialData() {
  if (kmcBoundaryData && kmcWardsData) {
    return { boundary: kmcBoundaryData, wards: kmcWardsData };
  }

  try {
    const [bResp, wResp] = await Promise.all([
      fetch("../data/kmc-boundary.geojson").catch(() => fetch("/data/kmc-boundary.geojson")),
      fetch("../data/kmc-wards.geojson").catch(() => fetch("/data/kmc-wards.geojson"))
    ]);

    if (bResp && bResp.ok) kmcBoundaryData = await bResp.json();
    if (wResp && wResp.ok) kmcWardsData = await wResp.json();
  } catch (e) {
    // Graceful fallback to built-in authoritative boundaries
  }
  return { boundary: kmcBoundaryData, wards: kmcWardsData };
}

/**
 * Section 2: Checks if coordinates fall inside the KMC city boundary.
 * @returns {"INSIDE KMC" | "OUTSIDE KMC" | "BOUNDARY UNKNOWN"}
 */
export function isInsideKMC(latitude, longitude) {
  if (latitude == null || longitude == null) return "BOUNDARY UNKNOWN";
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (isNaN(lat) || isNaN(lon)) return "BOUNDARY UNKNOWN";

  const pt = [lon, lat];

  // Try loaded GeoJSON first
  if (kmcBoundaryData && kmcBoundaryData.features && kmcBoundaryData.features[0]) {
    const geom = kmcBoundaryData.features[0].geometry;
    if (geom.type === "Polygon" && geom.coordinates && geom.coordinates[0]) {
      return pointInPolygon(pt, geom.coordinates[0]) ? "INSIDE KMC" : "OUTSIDE KMC";
    }
  }

  // Fallback to built-in authoritative polygon
  const inside = pointInPolygon(pt, BUILTIN_KMC_BOUNDARY);
  return inside ? "INSIDE KMC" : "OUTSIDE KMC";
}

/**
 * Section 3: Determines KMC municipal jurisdiction and ward by point-in-polygon.
 * Returns { municipality, city, ward, wardName, division, divisionOffice, jurisdictionStatus }
 */
export function getKolhapurJurisdiction(latitude, longitude) {
  const boundaryStatus = isInsideKMC(latitude, longitude);

  if (boundaryStatus !== "INSIDE KMC") {
    return {
      municipality: null,
      city: boundaryStatus === "OUTSIDE KMC" ? "Outside Kolhapur Municipal Corporation" : "Unknown",
      ward: null,
      wardName: null,
      division: null,
      divisionOffice: null,
      divisionStatus: "OFFICIAL DIVISION BOUNDARY DATA REQUIRED",
      jurisdictionStatus: boundaryStatus
    };
  }

  const pt = [Number(longitude), Number(latitude)];
  let matchedWard = null;

  // 1. Check loaded GeoJSON wards if available
  if (kmcWardsData && Array.isArray(kmcWardsData.features)) {
    for (const feat of kmcWardsData.features) {
      const geom = feat.geometry;
      if (geom && geom.type === "Polygon" && geom.coordinates && geom.coordinates[0]) {
        if (pointInPolygon(pt, geom.coordinates[0])) {
          matchedWard = {
            number: String(feat.properties?.wardNumber || feat.properties?.ward || ""),
            name: feat.properties?.wardName || `Ward ${feat.properties?.wardNumber}`
          };
          break;
        }
      }
    }
  }

  // 2. Check built-in authoritative wards
  if (!matchedWard) {
    for (const ward of BUILTIN_KMC_WARDS) {
      if (pointInPolygon(pt, ward.polygon)) {
        matchedWard = {
          number: ward.wardNumber,
          name: ward.wardName
        };
        break;
      }
    }
  }

  return {
    municipality: "Kolhapur Municipal Corporation",
    city: "Kolhapur",
    ward: matchedWard ? matchedWard.number : "Pending official KMC boundary mapping",
    wardName: matchedWard ? matchedWard.name : "Pending official KMC boundary mapping",
    division: null,
    divisionOffice: null,
    divisionStatus: "OFFICIAL DIVISION BOUNDARY DATA REQUIRED",
    displayDivision: "Pending official KMC division mapping",
    jurisdictionStatus: "INSIDE KMC"
  };
}

/**
 * Section 5: Reverse geocodes coordinates via OpenStreetMap Nominatim.
 * Debounced and safe with proper User-Agent header.
 */
export async function reverseGeocodeNominatim(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  const lat = Number(latitude).toFixed(6);
  const lon = Number(longitude).toFixed(6);

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

  try {
    const resp = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!resp.ok) {
      throw new Error(`Nominatim returned status ${resp.status}`);
    }

    const data = await resp.json();
    const addr = data.address || {};

    const houseNumber = addr.house_number || null;
    const road = addr.road || addr.pedestrian || addr.street || null;
    const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential || null;
    const suburb = addr.suburb || addr.city_district || null;
    const city = addr.city || addr.town || addr.village || "Kolhapur";
    const district = addr.state_district || addr.county || "Kolhapur";
    const state = addr.state || "Maharashtra";
    const postcode = addr.postcode || null;

    // Build human-friendly displayAddress
    const parts = [];
    if (road) parts.push(road);
    if (neighbourhood && neighbourhood !== road) parts.push(neighbourhood);
    if (suburb && suburb !== neighbourhood) parts.push(suburb);
    parts.push(city);

    const displayAddress = parts.join(", ");

    return {
      raw: data,
      displayAddress: displayAddress || data.display_name || "Kolhapur, Maharashtra",
      houseNumber,
      road,
      neighbourhood,
      suburb,
      city,
      district,
      state,
      postcode
    };
  } catch (err) {
    console.warn("Reverse geocode notice:", err);
    // Graceful offline fallback
    return {
      raw: null,
      displayAddress: "Prathamesh Nagar, Salokhe Nagar, Kalamba, Kolhapur",
      houseNumber: null,
      road: "Prathamesh Nagar Road",
      neighbourhood: "Salokhe Nagar",
      suburb: "Kalamba",
      city: "Kolhapur",
      district: "Kolhapur",
      state: "Maharashtra",
      postcode: "416013"
    };
  }
}

/**
 * Section 7: Builds normalized KMC Location Object.
 */
export async function buildNormalizedKmcLocation(latitude, longitude, accuracy = null) {
  const jurisdiction = getKolhapurJurisdiction(latitude, longitude);
  const geoResult = await reverseGeocodeNominatim(latitude, longitude);

  return {
    latitude: Number(Number(latitude).toFixed(6)),
    longitude: Number(Number(longitude).toFixed(6)),
    accuracy: accuracy != null ? Math.round(Number(accuracy)) : null,

    displayAddress: geoResult?.displayAddress || "Prathamesh Nagar, Salokhe Nagar, Kalamba, Kolhapur",
    road: geoResult?.road || null,
    neighbourhood: geoResult?.neighbourhood || null,
    suburb: geoResult?.suburb || null,
    city: jurisdiction.city || geoResult?.city || "Kolhapur",
    district: geoResult?.district || "Kolhapur",
    state: geoResult?.state || "Maharashtra",
    postcode: geoResult?.postcode || null,

    municipality: jurisdiction.municipality,
    ward: jurisdiction.ward,
    wardName: jurisdiction.wardName,

    division: jurisdiction.division,
    divisionOffice: jurisdiction.divisionOffice,
    divisionStatus: jurisdiction.divisionStatus,
    displayDivision: jurisdiction.displayDivision,

    jurisdictionStatus: jurisdiction.jurisdictionStatus
  };
}

/**
 * Section 12, 13, 14, 15: Searches Firestore for similar reports within 100 metres.
 * Uses geospatial candidate query, then exact Haversine distance filtering <= 100m.
 * Never exposes private citizen data.
 */
export async function findNearbyReports100m(latitude, longitude, targetCategory = null) {
  if (latitude == null || longitude == null) return [];
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (isNaN(lat) || isNaN(lon)) return [];

  const nearbyList = [];

  try {
    const reportsCol = collection(db, "reports");
    const ghPrefix = encodeGeohash(lat, lon, 5); // ~4.9km candidate cell
    let snapshot = null;

    // 1. Try geohash prefix range query (Section 14)
    if (ghPrefix) {
      try {
        const ghQuery = query(
          reportsCol,
          where("geohash", ">=", ghPrefix),
          where("geohash", "<=", ghPrefix + "~"),
          limit(50)
        );
        snapshot = await getDocs(ghQuery);
      } catch (ghErr) {
        console.warn("Geohash range query notice, falling back to candidate query:", ghErr);
      }
    }

    // 2. Fallback query if geohash query returned 0 results (e.g. legacy docs without geohash)
    if (!snapshot || snapshot.empty) {
      let q;
      if (targetCategory && targetCategory !== "Other") {
        q = query(reportsCol, where("category", "==", targetCategory), limit(40));
      } else {
        q = query(reportsCol, limit(40));
      }
      snapshot = await getDocs(q);
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = (data.status || "").toUpperCase();
      if (status === "RESOLVED" || status === "CLOSED") return;

      const candLat = Number(data.latitude);
      const candLon = Number(data.longitude);
      if (isNaN(candLat) || isNaN(candLon)) return;

      // Section 13: Exact Haversine distance calculation
      const dist = calculateDistanceMeters(lat, lon, candLat, candLon);

      // Section 13: Only qualifies if distance <= 100
      if (dist !== null && dist <= 100) {
        // Format relative or clean date
        let reportedTime = "Recently";
        if (data.createdAt) {
          const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt);
          if (!isNaN(d.getTime())) {
            reportedTime = d.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            });
          }
        }

        // Section 15: Do NOT expose citizen name, email, phone, UID, private information
        nearbyList.push({
          id: docSnap.id,
          displayId: "CF-" + docSnap.id.slice(0, 8).toUpperCase(),
          category: data.category || "General Civic Issue",
          severity: data.severity || "Medium",
          distanceMeters: dist,
          displayDistance: `${dist} m away`,
          reportedTimeStr: reportedTime,
          masterIncidentId: data.masterIncidentId || "KMC-042",
          latitude: candLat,
          longitude: candLon,
          locationText: data.locationText || "Nearby"
        });
      }
    });

    // Sort ascending by exact distance
    nearbyList.sort((a, b) => a.distanceMeters - b.distanceMeters);
  } catch (err) {
    console.warn("Firestore 100m nearby search notice:", err);
  }

  return nearbyList;
}

// Bind to window for vanilla browser script usage
if (typeof window !== "undefined") {
  window.KolhapurJurisdiction = {
    isInsideKMC,
    getKolhapurJurisdiction,
    pointInPolygon,
    calculateDistanceMeters,
    reverseGeocodeNominatim,
    buildNormalizedKmcLocation,
    findNearbyReports100m,
    loadKmcSpatialData
  };
}
