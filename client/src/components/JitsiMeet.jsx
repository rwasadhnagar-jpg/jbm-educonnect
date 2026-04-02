export default function JitsiLauncher({ meetUrl, onClose }) {
  const handleOpen = () => {
    window.open(meetUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none">
            <rect width="48" height="48" rx="12" fill="#1565C0"/>
            <path d="M12 18h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" fill="white"/>
            <path d="M30 22l8-4v12l-8-4v-4z" fill="white"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-textMain mb-2">Join Jitsi Meet</h3>
        <p className="text-sm text-muted mb-6">
          Your session is live. Click below to open Jitsi Meet in a new tab. No account required.
        </p>
        <button
          onClick={handleOpen}
          className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors mb-3"
        >
          Open Jitsi Meet
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm text-muted hover:text-textMain transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
