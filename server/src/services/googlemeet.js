import { google } from 'googleapis'

/**
 * Creates a Google Meet space using the Meet REST API.
 * Requires a Google Cloud service account with domain-wide delegation,
 * impersonating the teacher's Workspace account.
 *
 * Setup steps:
 * 1. Google Cloud Console → Enable "Google Meet API"
 * 2. Create a Service Account → download JSON key → GOOGLE_SERVICE_ACCOUNT_JSON
 * 3. Google Workspace Admin → Security → API Controls → Domain-wide Delegation
 *    → Add the service account client_id with scope:
 *    https://www.googleapis.com/auth/meetings.space.created
 */

function getMeetAuth(impersonateEmail) {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
    subject: impersonateEmail  // act as the teacher in Workspace
  })
}

export async function createMeetSpace(teacherEmail) {
  const auth = getMeetAuth(teacherEmail)
  const meet = google.meet({ version: 'v2', auth })

  const { data } = await meet.spaces.create({
    requestBody: {
      config: {
        accessType: 'RESTRICTED'  // only signed-in Workspace users
      }
    }
  })

  return {
    spaceName: data.name,          // e.g. "spaces/abc123"
    meetingUri: data.meetingUri,   // e.g. "https://meet.google.com/abc-defg-hij"
    meetingCode: data.meetingCode  // e.g. "abc-defg-hij"
  }
}

export async function getMeetSpace(spaceName) {
  // Use the first admin/teacher email for read-only lookups
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
  const auth = getMeetAuth(adminEmail)
  const meet = google.meet({ version: 'v2', auth })
  const { data } = await meet.spaces.get({ name: spaceName })
  return data
}
