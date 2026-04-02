import admin from 'firebase-admin'
import supabase from '../db/supabase.js'

let initialized = false

function initFirebase() {
  if (initialized || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    initialized = true
  } catch (err) {
    console.warn('Firebase Admin not initialized:', err.message)
  }
}

export async function sendPushToClass(classGroupId, title, body) {
  initFirebase()
  if (!initialized) return

  const { data: students } = await supabase
    .from('users')
    .select('fcm_token')
    .eq('class_group_id', classGroupId)
    .not('fcm_token', 'is', null)

  const tokens = (students || []).map((s) => s.fcm_token).filter(Boolean)
  if (!tokens.length) return

  const chunks = []
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500))

  for (const chunk of chunks) {
    await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      webpush: { notification: { icon: '/icons/icon-192.png' } }
    }).catch(() => {})
  }
}

export async function sendPushToUser(userId, title, body) {
  initFirebase()
  if (!initialized) return

  const { data: user } = await supabase.from('users').select('fcm_token').eq('id', userId).single()
  if (!user?.fcm_token) return

  await admin.messaging().send({ token: user.fcm_token, notification: { title, body } }).catch(() => {})
}
