# AI CivicFix — Manual Frontend

This is a beginner-friendly, manually coded frontend prototype for the AI CivicFix hackathon project.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Leaflet.js (CDN)
- Chart.js (CDN)

No React, TypeScript, Tailwind or backend is required for this version.

## Run

Recommended:

1. Open the folder in VS Code.
2. Install the "Live Server" extension.
3. Right-click `index.html`.
4. Choose "Open with Live Server".

A normal browser file-open may work for most pages, but Live Server is recommended.

## Main demo flow

Login
→ Citizen
→ Report
→ Photo
→ AI Analysis
→ Location
→ Similar Incident
→ Add My Report
→ CF-1024
→ KMC-042
→ Master Incident
→ Work Order
→ Field Officer
→ Resolution
→ Citizen Verification
→ Closed

## Architecture

The UI is intentionally implemented as a single-page frontend with multiple view states. This is simpler and faster for a 7-hour hackathon than maintaining 20 independent HTML pages.

Main files:

- `index.html` — application shell + library imports
- `css/style.css` — global blue/white design system
- `js/mock-data.js` — all seeded KMC demo data
- `js/state.js` — simple localStorage state
- `js/services.js` — placeholders for Firebase, Cloudinary and Gemini integration
- `js/map.js` — Leaflet
- `js/charts.js` — Chart.js
- `js/app.js` — UI rendering and interactions

## Future integration

Replace only the service layer:

- `CivicService.uploadImage()` → Cloudinary
- `CivicService.analyzeImage()` → Firebase AI Logic + Gemini
- `findSimilarIncident()` → Firestore query + distance/similarity logic
- report/incident persistence → Firestore
- demo login → Firebase Authentication

The page structure should not need a redesign.

## Demo reset

Run:

```js
resetDemo()
```

from the browser console to clear demo state.
