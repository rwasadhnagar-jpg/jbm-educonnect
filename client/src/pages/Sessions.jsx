import { useState, useEffect } from 'react'
import api from '../api/client'
import SessionCard from '../components/SessionCard'
import JitsiEmbed from '../components/JitsiMeet'
import { useAuth } from '../context/AuthContext'

export default function Sessions() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState(null)
  const [error, setError] = useState('')
  const [notesSession, setNotesSession] = useState(null)
  const [notesText, setNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [savingAtt, setSavingAtt] = useState(false)

  useEffect(() => {
    api.get('/api/sessions')
      .then(({ data }) => setSessions(data))
      .catch(() => setError('Failed to load sessions.'))
      .finally(() => setLoading(false))
  }, [])

  const handleJoin = async (sessionId) => {
    try {
      const { data } = await api.post(`/api/sessions/${sessionId}/join`)
      setActiveSession(data)
    } catch (e) {
      alert(e.response?.data?.error || 'Cannot join session right now.')
    }
  }

  const handleStartSession = async (sessionId) => {
    try {
      await api.patch(`/api/sessions/${sessionId}/start`)
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'live' } : s))
    } catch { alert('Failed to start session.') }
  }

  const handleEndSession = async (sessionId) => {
    if (!confirm('End this session?')) return
    try {
      await api.patch(`/api/sessions/${sessionId}/end`)
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'ended' } : s))
      if (activeSession) setActiveSession(null)
    } catch { alert('Failed to end session.') }
  }

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Delete this session? This cannot be undone.')) return
    try {
      await api.delete(`/api/sessions/${sessionId}`)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (e) { alert(e.response?.data?.error || 'Failed to delete session.') }
  }

  const openNotes = (session) => {
    setNotesSession(session)
    setNotesText(session.notes || '')
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await api.patch(`/api/sessions/${notesSession.id}/notes`, { notes: notesText })
      setSessions(prev => prev.map(s => s.id === notesSession.id ? { ...s, notes: notesText } : s))
      setNotesSession(null)
    } catch { alert('Failed to save notes.') }
    finally { setSavingNotes(false) }
  }

  const openAttendance = async (session) => {
    try {
      const { data } = await api.get(`/api/sessions/${session.id}/attendance`)
      setAttendanceData(data)
      setAttendanceSession(session)
    } catch { alert('Failed to load attendance.') }
  }

  const toggleAttendance = (studentId) => {
    setAttendanceData(prev => prev.map(s => s.student_id === studentId ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s))
  }

  const saveAttendance = async () => {
    setSavingAtt(true)
    try {
      await api.post(`/api/sessions/${attendanceSession.id}/attendance`, {
        attendance: attendanceData.map(s => ({ student_id: s.student_id, status: s.status }))
      })
      alert('Attendance saved!')
      setAttendanceSession(null)
    } catch { alert('Failed to save attendance.') }
    finally { setSavingAtt(false) }
  }

  const isTeacher = user?.role === 'teacher'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {activeSession && (
        <JitsiEmbed
          meetUrl={activeSession.meetUrl}
          userRole={user?.role}
          displayName={user?.full_name}
          onClose={() => setActiveSession(null)}
        />
      )}

      <h2 className="text-2xl font-bold text-textMain mb-6">Video Sessions</h2>

      {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}
      {error && <div className="bg-red-50 text-danger text-sm rounded-lg p-4 text-center">{error}</div>}
      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p className="text-4xl mb-3">📹</p>
          <p>No sessions scheduled yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-textMain">{s.title}</h3>
                {s.subject && <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mt-1 mr-2">{s.subject}</span>}
                <p className="text-sm text-muted mt-1">{new Date(s.start_time).toLocaleString('en-IN')} – {new Date(s.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${s.status === 'live' ? 'bg-green-100 text-green-800' : s.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                {s.status.toUpperCase()}
              </span>
            </div>

            {s.notes && (
              <div className="bg-gray-50 rounded-lg p-2 mb-2">
                <p className="text-xs text-muted font-medium mb-1">Session Notes:</p>
                <p className="text-xs text-textMain">{s.notes}</p>
              </div>
            )}

            {/* Student join button */}
            {s.status === 'live' && user?.role !== 'parent' && !isTeacher && (
              <button onClick={() => handleJoin(s.id)} className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
                Join Session
              </button>
            )}

            {/* Teacher controls */}
            {isTeacher && (
              <div className="flex flex-wrap gap-2 mt-2">
                {s.status === 'scheduled' && (
                  <button onClick={() => handleStartSession(s.id)} className="flex-1 bg-success text-white py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    Start
                  </button>
                )}
                {s.status === 'live' && (
                  <>
                    <button onClick={() => handleJoin(s.id)} className="flex-1 bg-primary text-white py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      Join
                    </button>
                    <button onClick={() => handleEndSession(s.id)} className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                      End
                    </button>
                  </>
                )}
                {(s.status === 'live' || s.status === 'ended') && (
                  <button onClick={() => openAttendance(s)} className="flex-1 bg-purple-50 text-purple-700 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-100">
                    Attendance
                  </button>
                )}
                <button onClick={() => openNotes(s)} className="flex-1 bg-blue-50 text-primary py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100">
                  Notes
                </button>
                {s.status !== 'live' && (
                  <button onClick={() => handleDeleteSession(s.id)} className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100">
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notes Modal */}
      {notesSession && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-bold text-lg text-textMain mb-4">Session Notes — {notesSession.title}</h3>
            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              rows={6}
              placeholder="Write session notes, topics covered, homework given..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNotesSession(null)} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveNotes} disabled={savingNotes} className="flex-1 bg-primary text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{savingNotes ? 'Saving...' : 'Save Notes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceSession && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[80vh]">
            <div className="p-6 pb-3">
              <h3 className="font-bold text-lg text-textMain">Attendance — {attendanceSession.title}</h3>
              <p className="text-xs text-muted mt-1">Tap to toggle present/absent</p>
              <div className="flex justify-between text-xs mt-2 font-medium">
                <span className="text-success">{attendanceData.filter(s => s.status === 'present').length} Present</span>
                <span className="text-danger">{attendanceData.filter(s => s.status === 'absent').length} Absent</span>
              </div>
            </div>
            <div className="overflow-y-auto px-6 pb-2 flex-1">
              {attendanceData.length === 0 ? (
                <p className="text-muted text-sm text-center py-4">No students found in this class.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceData.map(s => (
                    <button key={s.student_id} onClick={() => toggleAttendance(s.student_id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${s.status === 'present' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <span className="text-sm font-medium text-textMain">{s.full_name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                        {s.status === 'present' ? '✓ Present' : '✗ Absent'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 pt-3 flex gap-3">
              <button onClick={() => setAttendanceSession(null)} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveAttendance} disabled={savingAtt} className="flex-1 bg-primary text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{savingAtt ? 'Saving...' : 'Save Attendance'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
