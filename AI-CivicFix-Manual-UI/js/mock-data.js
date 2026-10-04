// All demo data lives here.
// Later, Firestore/API calls can replace this file without redesigning the UI.

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

  masterIssues: [
    {
      id: "KMC-042", problemType: "Pothole", severity: "High",
      address: "Prathamesh Nagar, Salokhe Nagar, Kalamba", ward: "20",
      reports: 7, department: "City Engineer / PWD",
      assignment: "Concerned Sub-City Engineer", status: "Assigned",
      recommendedAction: "Field inspection + road repair",
      workOrderId: "WO-1042", cluster: "Road corridor observation"
    },
    {
      id: "KMC-043", problemType: "Garbage", severity: "High",
      address: "Rajarampuri", ward: "18", reports: 12,
      department: "Health & Sanitation", assignment: "Sanitation Team",
      status: "In Progress", recommendedAction: "Waste collection and site cleanup",
      workOrderId: "WO-1043", cluster: "Waste accumulation"
    },
    {
      id: "KMC-044", problemType: "Drainage", severity: "Medium",
      address: "Kalamba", ward: "20", reports: 4,
      department: "Water Supply & Drainage", assignment: "Water / Drainage Field Team",
      status: "Pending", recommendedAction: "Inspect drainage line and clear obstruction",
      workOrderId: "WO-1044", cluster: "Drainage-related road condition"
    },
    {
      id: "KMC-045", problemType: "Broken Streetlight", severity: "Low",
      address: "Kolhapur", ward: "12", reports: 2,
      department: "Electricity", assignment: "Electrical Field Team",
      status: "Resolved", recommendedAction: "Inspect and replace faulty component",
      workOrderId: "WO-1045", cluster: "Streetlight outage"
    },
    {
      id: "KMC-046", problemType: "Fallen Tree", severity: "High",
      address: "Ward 9", ward: "9", reports: 5,
      department: "Garden", assignment: "Garden Field Team",
      status: "Assigned", recommendedAction: "Clear fallen branch/tree and inspect site",
      workOrderId: "WO-1046", cluster: "Tree safety"
    },
    {
      id: "KMC-047", problemType: "Encroachment", severity: "Medium",
      address: "Ward 7", ward: "7", reports: 3,
      department: "Encroachment", assignment: "Encroachment Field Team",
      status: "Pending", recommendedAction: "Field inspection and encroachment assessment",
      workOrderId: "WO-1047", cluster: "Public-space obstruction"
    }
  ],

  citizenReports: [
    { id: "CF-R001", distance: "34m", time: "08:42", description: "Large pothole near the road edge" },
    { id: "CF-R002", distance: "38m", time: "09:10", description: "Deep pothole affecting vehicles" },
    { id: "CF-R003", distance: "42m", time: "09:23", description: "Pothole visible after recent rain" },
    { id: "CF-R004", distance: "51m", time: "10:05", description: "Road surface damaged near junction" },
    { id: "CF-R005", distance: "61m", time: "10:38", description: "Vehicle safety concern on road" },
    { id: "CF-R006", distance: "72m", time: "11:02", description: "Large road depression" },
    { id: "CF-R007", distance: "83m", time: "11:21", description: "Pothole getting wider" }
  ],

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
  }
};
