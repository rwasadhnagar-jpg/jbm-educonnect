// Renamed to GoogleMeetLauncher — kept same filename so no import changes needed

export default function GoogleMeetLauncher({ meetUrl, onClose }) {
  const handleOpen = () => {
    window.open(meetUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="#FF0000"/>
            <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="white"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-textMain mb-2">Join Google Meet</h3>
        <p className="text-sm text-muted mb-6">
          Your session is live. Click below to open Google Meet. Sign in with your school Google account.
        </p>
        <button
          onClick={handleOpen}
          className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors mb-3"
        >
          Open Google Meet
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
