import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Configure Firebase App Check debug provider for local development (http://localhost:8000)
// Set debug flag BEFORE initializing App Check
if (typeof self !== "undefined") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

let appCheck = null;
try {
    appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"),
        isTokenAutoRefreshEnabled: true
    });
} catch (error) {
    console.warn("App Check initialization:", error);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, appCheck };

