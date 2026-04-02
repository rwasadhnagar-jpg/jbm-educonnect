import jwt from 'jsonwebtoken'

export function generateJitsiToken({ user, session, isModerator }) {
  const appId = process.env.JAAS_APP_ID
  const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const keyId = process.env.JAAS_KEY_ID

  if (!appId || !privateKey || !keyId) {
    throw new Error('JaaS credentials not configured. Set JAAS_APP_ID, JAAS_PRIVATE_KEY, JAAS_KEY_ID.')
  }

  const now = Math.floor(Date.now() / 1000)
  const endTime = Math.floor(new Date(session.end_time).getTime() / 1000)
  const exp = isModerator ? endTime + 30 * 60 : endTime

  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    iat: now,
    exp,
    nbf: now - 10,
    room: session.jitsi_room_id,
    sub: appId,
    context: {
      user: {
        id: user.id,
        name: user.full_name || user.username,
        email: user.email || '',
        moderator: isModerator
      },
      features: {
        recording: isModerator,
        livestreaming: false,
        'screen-sharing': true
      }
    }
  }

  return jwt.sign(payload, privateKey, { algorithm: 'RS256', keyid: keyId })
}
