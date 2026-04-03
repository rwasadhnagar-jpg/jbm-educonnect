import { useEffect, useRef } from 'react'

export default function JitsiEmbed({ meetUrl, userRole, displayName, onClose }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const roomName = meetUrl.replace('https://meet.jit.si/', '')
    const isStudent = userRole === 'student'

    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => {
      if (!containerRef.current) return

      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: displayName || 'Participant' },
        configOverwrite: {
          disableDesktopSharing: isStudent,
          startWithVideoMuted: isStudent,
          startWithAudioMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: isStudent
            ? ['microphone', 'chat', 'raisehand', 'tileview', 'hangup']
            : ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'participants-pane', 'mute-everyone', 'hangup'],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          MOBILE_APP_PROMO: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        },
      })

      apiRef.current.addEventListener('readyToClose', onClose)
    }

    document.head.appendChild(script)

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
      document.querySelectorAll('script[src="https://meet.jit.si/external_api.js"]')
        .forEach(s => s.remove())
    }
  }, [meetUrl, userRole])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white text-sm shrink-0">
        <span className="font-semibold">Live Session</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors px-3 py-1 rounded hover:bg-gray-700"
        >
          Leave ✕
        </button>
      </div>
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  )
}
