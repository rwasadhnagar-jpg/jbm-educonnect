import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

function Countdown({ startTime }) {
  const [diff, setDiff] = useState(new Date(startTime) - Date.now())
  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(startTime) - Date.now()), 1000)
    return () => clearInterval(t)
  }, [startTime])
  if (diff <= 0) return <span className="text-success font-medium">Starting now</span>
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000)
  return <span>{h > 0 ? `${h}h ` : ''}{m}m {s}s</span>
}

export default function SessionCard({ session, onJoin }) {
  const { user } = useAuth()
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    setJoining(true)
    try { await onJoin(session.id) } finally { setJoining(false) }
  }

  const statusColors = { scheduled: 'bg-yellow-100 text-yellow-800', live: 'bg-green-100 text-green-800', ended: 'bg-gray-100 text-gray-600' }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-textMain">{session.title}</h3>
          <p className="text-sm text-muted mt-1">{new Date(session.start_time).toLocaleString('en-IN')}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColors[session.status]}`}>{session.status.toUpperCase()}</span>
      </div>
      {session.status === 'scheduled' && (
        <p className="text-sm text-muted mt-2">Starts in: <Countdown startTime={session.start_time} /></p>
      )}
      {session.status === 'live' && user.role !== 'parent' && (
        <button onClick={handleJoin} disabled={joining} className="mt-3 w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
          {joining ? 'Joining...' : 'Join Session'}
        </button>
      )}
    </div>
  )
}
