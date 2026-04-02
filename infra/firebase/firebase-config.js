/**
 * JBM EduConnect — Firebase Setup Notes
 *
 * Services used:
 *  - Firebase Cloud Messaging (FCM): push notifications to students/teachers
 *  - Web Push (VAPID): background notifications in PWA
 *
 * Setup steps:
 *  1. https://console.firebase.google.com → Create project "jbm-educonnect"
 *  2. Add a Web app → copy firebaseConfig → put values in .env as VITE_FIREBASE_*
 *  3. Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
 *     → copy public key → VITE_FIREBASE_VAPID_KEY
 *  4. Project Settings → Service Accounts → Generate new private key → download JSON
 *     → paste entire JSON content as FIREBASE_SERVICE_ACCOUNT_JSON in server .env
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
