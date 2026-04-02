import { useState, useEffect } from 'react'
import api from '../api/client'
import SessionCard from '../components/SessionCard'
import GoogleMeetLauncher from '../components/JitsiMeet'
import { useAuth } from '../context/AuthContext'

export default function Sessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/sessions')
      .then(({ data }) => setSessions(data))
      .catch(() => setError('Failed to load sessions.'))
      .finally(() => setLoading(false))
  }, [])

  const handleJoin = async (sessionId) => {
    try {
      const { data } = await api.post(`/api/sessions/${sessionId}/join`)
      setActiveSession(data)  // { meetUrl: 'https://meet.google.com/...' }
    } catch (e) {
      alert(e.response?.data?.error || 'Cannot join session right now.')
    }
  }

  const handleStartSession = async (sessionId) => {
    try {
      await api.patch(`/api/sessions/${sessionId}/start`)
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'live' } : s))
    } catch {
      alert('Failed to start session.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {activeSession && (
        <GoogleMeetLauncher
          meetUrl={activeSession.meetUrl}
          onClose={() => setActiveSession(null)}
        />
      )}
      <h2 className="text-2xl font-bold text-textMain mb-6">Video Sessions</h2>
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      {error && <div className="bg-red-50 text-danger text-sm rounded-lg p-4 text-center">{error}</div>}
      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p className="text-4xl mb-3">📹</p>
          <p>No sessions scheduled yet.</p>
        </div>
      )}
      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id}>
            <SessionCard session={s} onJoin={handleJoin} />
            {user?.role === 'teacher' && s.status === 'scheduled' && (
              <button
                onClick={() => handleStartSession(s.id)}
                className="mt-2 w-full bg-success text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Start Session
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
