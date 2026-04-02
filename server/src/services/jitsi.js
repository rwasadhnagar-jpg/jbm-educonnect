/**
 * Jitsi Meet — completely free, no API key or account required.
 * Rooms are created on-the-fly by generating a unique name.
 */

export function createJitsiRoom(sessionId) {
  const roomName = `JBMEduConnect-${sessionId.replace(/-/g, '').substring(0, 12)}`
  const meetUrl = `https://meet.jit.si/${roomName}`
  return { roomName, meetUrl }
}
