import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import api from '../api/client.js'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

let messaging = null

function getFirebaseMessaging() {
  if (!messaging && firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
  }
  return messaging
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return null
  if (Notification.permission === 'denied') return null
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const msg = getFirebaseMessaging()
    if (!msg) return null
    const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
    if (token) {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        await api.post('/api/notifications/fcm-token', { fcm_token: token }).catch(() => {})
      }
    }
    return token
  } catch {
    return null
  }
}

export function onForegroundMessage(callback) {
  const msg = getFirebaseMessaging()
  if (!msg) return
  onMessage(msg, callback)
}
