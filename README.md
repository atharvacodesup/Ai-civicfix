# AI CivicFix — Hackathon Prototype

> **From Citizen Complaints to Verified Municipal Action**  
> Hackathon MVP for Kolhapur Municipal Corporation (KMC), Kolhapur, Maharashtra.  
> *Note: This is a hackathon prototype, not an official government portal.*

---

## Architecture Overview

AI CivicFix is organized into clear, decoupled modules using standard **HTML5**, **CSS3**, and **Vanilla JavaScript** (with Leaflet.js for maps and Chart.js for analytics).

```
AI-CIVICFIX/
│
├── index.html                  # Application entry point & router
├── login.html                  # Role selection / demo authentication
├── README.md                   # Documentation
│
├── citizen/                    # Module 01: Citizen Application
│   ├── home.html               # Citizen landing & quick report actions
│   ├── report.html             # Camera capture / image upload & preview
│   ├── analysis.html           # AI understanding simulation & action recommendation
│   ├── location.html           # Service boundary & Ward 20 resolution
│   ├── duplicate.html          # Proximity cluster check (KMC-042, 42m away)
│   ├── confirm.html            # Pre-submission report confirmation
│   ├── success.html            # Ticket CF-1024 issuance & Master Incident link
│   ├── reports.html            # Citizen's active & resolved reports
│   ├── track.html              # End-to-end timeline tracking
│   └── verify.html             # Before/After verification & Citizen sign-off
│
├── admin/                      # Module 02: Municipal Operations & Admin
│   ├── dashboard.html          # Super Admin incident command center
│   ├── master-issues.html      # Filterable master incidents directory
│   ├── master-issue.html       # Physical incident detail (7 reports -> 1 action)
│   ├── department.html         # Reusable department dashboard (PWD, Health, etc.)
│   ├── map.html                # Leaflet incident spatial visualization
│   ├── resolution.html         # AI-assisted Before/After review
│   └── analytics.html          # Operational consolidation charts (Chart.js)
│
├── field/                      # Module 03: Field Operations
│   ├── work.html               # Assigned work orders (WO-1042)
│   └── issue.html              # Work execution & After-photo upload
│
├── css/                        # Design System (#0B3D91 & #FFFFFF)
│   ├── style.css               # Shared global styles, buttons, layout, typography
│   ├── citizen.css             # Citizen-specific classes (.citizen-*)
│   ├── admin.css               # Admin sidebar, layout & tables (.admin-*)
│   └── field.css               # Field officer mobile-first layout (.field-*)
│
├── js/                         # JavaScript Logic Layers
│   ├── mock-data.js            # Seeded demo data (Kolhapur, Ward 20, KMC-042)
│   ├── state.js                # Central state management (localStorage)
│   ├── auth.js                 # Demo authentication & role navigation
│   ├── services.js             # Service abstraction (Cloudinary/Gemini ready)
│   ├── routing.js              # Deterministic municipal routing rules
│   ├── citizen.js              # Citizen journey controllers
│   ├── admin.js                # Admin operations controllers
│   ├── field.js                # Field officer controllers
│   ├── map.js                  # Leaflet map helper
│   ├── charts.js               # Chart.js analytics helper
│   └── app.js                  # Shared UI components & utilities
│
└── assets/                     # SVG Illustrations & Evidence
    ├── report-01.svg ~ 07.svg   # 7 Linked citizen evidence images
    ├── before-pothole.svg      # Before repair evidence
    └── after-repaired.svg      # After repair resolution proof
```

---

## Core Product Concept

The citizen is not submitting an isolated grievance into a void; they are contributing **evidence** towards a **physical civic problem**.

```
7 Citizen Reports
       ↓
1 Physical Problem
       ↓
1 Master Incident (KMC-042)
       ↓
1 Municipal Action (WO-1042)
```

---

## Design System

- **Primary Blue:** `#0B3D91`
- **White:** `#FFFFFF`
- Strict compliance: No red, green, yellow, orange, or multicolor badges. Status indicators use typographic markers, outlines (`○`), filled dots (`●`), and checkmarks (`✓`).
- Mobile-first typography and touch targets for accessible citizen use.

---

## How to Run

1. Open the project folder in **VS Code**.
2. Install the **Live Server** extension.
3. Right-click `index.html` and select **"Open with Live Server"**.
4. To reset demo state at any time, open the browser console and run:
   ```javascript
   resetDemo();
   ```

---

## Main Demo Scenarios

### 1. Citizen End-to-End Journey
1. Open `login.html` and click **"LOGIN AS CITIZEN"**.
2. On `citizen/home.html`, click **"TAKE PHOTO"**.
3. Choose an image or demo photo on `citizen/report.html` and click **"CONTINUE"**.
4. View **AI Understanding** on `citizen/analysis.html` identifying **POTHOLE (HIGH)**.
5. Confirm service boundary on `citizen/location.html` (**Ward 20, KMC**).
6. On `citizen/duplicate.html`, see existing Master Incident **KMC-042** (42m away, 6 reports). Click **"ADD MY REPORT"**.
7. Confirm details on `citizen/confirm.html` and click **"SUBMIT REPORT"**.
8. View issued ticket **CF-1024** linked to **KMC-042** with **7 reports**.
9. Track progress on `citizen/track.html`.

### 2. Field Officer Execution
1. Open `login.html` and click **"FIELD OFFICER"**.
2. View **KMC-042** on `field/work.html` and click **"START WORK"**.
3. On `field/issue.html`, upload resolution photo and click **"COMPLETE WORK"**.

### 3. Municipal Resolution & Citizen Verification
1. Admin reviews Before/After on `admin/resolution.html` and clicks **"SEND TO CITIZEN"**.
2. Citizen verifies repair on `citizen/verify.html`, clicks **"YES, FIXED"**, moving incident to **CLOSED**.
