import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check with environment-specific provider
const hostname = window.location.hostname;
let provider;
if (hostname === "localhost" || hostname === "127.0.0.1") {
  // Debug provider for local development
  if (typeof self !== "undefined") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  provider = new ReCaptchaV3Provider("6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI");
} else {
  // Production reCAPTCHA Enterprise provider
  const RECAPTCHA_ENTERPRISE_SITE_KEY = "REPLACE_WITH_PROD_SITE_KEY"; // TODO: replace with actual site key
  provider = new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY);
}
let appCheck = null;
try {
  appCheck = initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true
  });
} catch (error) {
    console.warn("App Check initialization:", error);
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, appCheck };

