// =========================================================
// AI CivicFix — Seeded Mock Data for KMC Demonstration
// All demo data lives here.
// =========================================================

window.AppData = {
  location: {
    address: "Prathamesh Nagar, Salokhe Nagar, Kalamba, Kolhapur",
    shortAddress: "Prathamesh Nagar, Salokhe Nagar, Kalamba",
    ward: "20",
    jurisdiction: "YES",
    division: "Auto-resolved from KMC service boundary"
  },

  users: [
    { id: "citizen-1", name: "Demo Citizen", role: "Citizen", department: null },
    { id: "pwd-1", name: "Demo PWD Admin", role: "Department Admin", department: "City Engineer / PWD", officer: "Ramesh Krishnakant Maskar", designation: "City Engineer" },
    { id: "san-1", name: "Demo Sanitation Admin", role: "Department Admin", department: "Health & Sanitation", officer: "Jaywant Powar", designation: "Chief Health Inspector" },
    { id: "water-1", name: "Demo Water Admin", role: "Department Admin", department: "Water Supply & Drainage", officer: "Harshjit Dilipsingh Ghatge", designation: "Water Engineer" },
    { id: "elec-1", name: "Demo Electricity Admin", role: "Department Admin", department: "Electricity", officer: "Narayan Vitthal Pujari", designation: "Assistant Engineer (Electricity)" },
    { id: "garden-1", name: "Demo Garden Admin", role: "Department Admin", department: "Garden", officer: "Sameer Vasant Vyaghrare", designation: "Environment Officer" },
    { id: "enc-1", name: "Demo Encroachment Admin", role: "Department Admin", department: "Encroachment", officer: "Prafull Kamble", designation: "Superintendent" },
    { id: "field-1", name: "Demo Field Officer", role: "Field Officer", department: "City Engineer / PWD", officer: "Concerned Sub-City Engineer", designation: "Field Officer" },
    { id: "admin-1", name: "KMC Demo Administrator", role: "Super Admin", department: "All", officer: "Dr. Rajendra Bharud (IAS)", designation: "Municipal Commissioner" }
  ],

  departments: [
    { name: "City Engineer / PWD", problems: ["Pothole", "Road Damage", "Footpath Damage"], officer: "Ramesh Krishnakant Maskar", designation: "City Engineer" },
    { name: "Health & Sanitation", problems: ["Garbage", "Waste Dumping", "Waste Not Collected"], officer: "Jaywant Powar", designation: "Chief Health Inspector" },
    { name: "Water Supply & Drainage", problems: ["Water Leakage", "Drainage", "Sewer Overflow"], officer: "Harshjit Dilipsingh Ghatge", designation: "Water Engineer" },
    { name: "Electricity", problems: ["Broken Streetlight", "Streetlight Not Working", "High Mast Light"], officer: "Narayan Vitthal Pujari", designation: "Assistant Engineer (Electricity)" },
    { name: "Garden", problems: ["Fallen Tree", "Tree Branch Problem", "Park Problem"], officer: "Sameer Vasant Vyaghrare", designation: "Environment Officer" },
    { name: "Encroachment", problems: ["Road Encroachment", "Footpath Encroachment", "Public Space Obstruction"], officer: "Prafull Kamble", designation: "Superintendent" }
  ],

  masterIssues: [],
  citizenReports: [],

  routingRules: {
    "Pothole": { department: "City Engineer / PWD", assignment: "Concerned Sub-City Engineer" },
    "Road Damage": { department: "City Engineer / PWD", assignment: "Concerned Sub-City Engineer" },
    "Footpath Damage": { department: "City Engineer / PWD", assignment: "Concerned Sub-City Engineer" },
    "Garbage": { department: "Health & Sanitation", assignment: "Sanitation Team" },
    "Waste Dumping": { department: "Health & Sanitation", assignment: "Sanitation Team" },
    "Waste Not Collected": { department: "Health & Sanitation", assignment: "Sanitation Team" },
    "Water Leakage": { department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team" },
    "Drainage": { department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team" },
    "Sewer Overflow": { department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team" },
    "Broken Streetlight": { department: "Electricity", assignment: "Electrical Field Team" },
    "Streetlight Not Working": { department: "Electricity", assignment: "Electrical Field Team" },
    "High Mast Light": { department: "Electricity", assignment: "Electrical Field Team" },
    "Fallen Tree": { department: "Garden", assignment: "Garden Field Team" },
    "Tree Branch Problem": { department: "Garden", assignment: "Garden Field Team" },
    "Park Problem": { department: "Garden", assignment: "Garden Field Team" },
    "Road Encroachment": { department: "Encroachment", assignment: "Encroachment Field Team" },
    "Footpath Encroachment": { department: "Encroachment", assignment: "Encroachment Field Team" },
    "Public Space Obstruction": { department: "Encroachment", assignment: "Encroachment Field Team" }
  },

  demoResolution: null
};
