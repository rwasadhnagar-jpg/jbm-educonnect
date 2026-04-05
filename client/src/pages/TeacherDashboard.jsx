import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [homework, setHomework] = useState([])
  const [sessions, setSessions] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [students, setStudents] = useState([])
  const [pendingChecking, setPendingChecking] = useState(0)
  const [submissionsDue, setSubmissionsDue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editHw, setEditHw] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/homework'),
      api.get('/api/sessions'),
      api.get('/api/announcements').catch(() => ({ data: [] })),
      api.get('/api/users/my-class-students').catch(() => ({ data: [] }))
    ]).then(([hw, sess, ann, studs]) => {
      const homeworkRows = hw.data || []
      setHomework(homeworkRows)
      setSessions(sess.data || [])
      setAnnouncements((ann.data || []).slice(0, 3))
      setStudents(studs.data || [])
      return Promise.all(
        homeworkRows.map((item) => api.get(`/api/homework/${item.id}/submissions`).then((res) => ({ id: item.id, data: res.data })).catch(() => ({ id: item.id, data: [] })))
      )
    }).then((submissionSets = []) => {
      const pending = submissionSets.reduce((acc, item) => acc + item.data.filter((row) => row.submitted && (row.submission?.marks_obtained === null || row.submission?.marks_obtained === undefined)).length, 0)
      const due = submissionSets.reduce((acc, item) => acc + item.data.filter((row) => !row.submitted).length, 0)
      setPendingChecking(pending)
      setSubmissionsDue(due)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const upcomingSessions = sessions.filter(s => s.status !== 'ended').slice(0, 3)
  const today = new Date().toDateString()
  const todaySessions = sessions.filter(s => new Date(s.start_time).toDateString() === today)

  const handleDeleteHw = async (id) => {
    if (!confirm('Delete this homework?')) return
    try {
      await api.delete(`/api/homework/${id}`)
      setHomework(prev => prev.filter(h => h.id !== id))
    } catch { alert('Failed to delete homework') }
  }

  const handleEditOpen = (hw) => {
    setEditHw(hw)
    setEditForm({ title: hw.title, description: hw.description || '', due_date: hw.due_date, subject: hw.subject || '', max_marks: hw.max_marks || '', category: hw.category || 'Homework' })
  }

  const handleEditSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch(`/api/homework/${editHw.id}`, editForm)
      setHomework(prev => prev.map(h => h.id === data.id ? { ...h, ...data } : h))
      setEditHw(null)
    } catch { alert('Failed to update homework') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-textMain">Teacher Dashboard</h2>
        <p className="text-muted text-sm">Welcome, {user?.full_name || user?.username}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{students.length || '—'}</p>
          <p className="text-xs text-muted mt-1">My Students</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-success">{todaySessions.length}</p>
          <p className="text-xs text-muted mt-1">Today's Sessions</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{homework.length}</p>
          <p className="text-xs text-muted mt-1">Assignments</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{pendingChecking}</p>
          <p className="text-xs text-muted mt-1">Pending Checking</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Submissions Due</p>
          <p className="mt-2 text-2xl font-bold text-textMain">{submissionsDue}</p>
          <p className="text-xs text-muted mt-1">Students still yet to submit work</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Quick Focus</p>
          <p className="mt-2 text-sm text-textMain">
            {pendingChecking > 0 ? `${pendingChecking} submissions need marks or remarks.` : 'All submitted work has been checked.'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link to="/homework/create" className="bg-primary text-white rounded-xl p-4 text-center hover:bg-blue-700 transition-colors">
          <p className="text-2xl mb-1">📝</p>
          <p className="text-xs font-medium">Assign Homework</p>
        </Link>
        <Link to="/sessions/schedule" className="bg-success text-white rounded-xl p-4 text-center hover:bg-green-700 transition-colors">
          <p className="text-2xl mb-1">📹</p>
          <p className="text-xs font-medium">Schedule Session</p>
        </Link>
        <Link to="/my-class" className="bg-purple-600 text-white rounded-xl p-4 text-center hover:bg-purple-700 transition-colors">
          <p className="text-2xl mb-1">🏫</p>
          <p className="text-xs font-medium">My Class</p>
        </Link>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-textMain mb-3">Upcoming Sessions</h3>
          <div className="space-y-2">
            {upcomingSessions.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-textMain">{s.title}</p>
                  {s.subject && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{s.subject}</span>}
                  <p className="text-xs text-muted">{new Date(s.start_time).toLocaleString('en-IN')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.status === 'live' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {s.status.toUpperCase()}
                </span>
              </div>
            ))}
            <Link to="/sessions" className="text-primary text-xs font-medium hover:underline">View all sessions →</Link>
          </div>
        </div>
      )}

      {/* Announcements from Admin */}
      {announcements.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-textMain mb-3">📢 Announcements</h3>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                <p className="font-medium text-sm text-textMain">{a.title}</p>
                <p className="text-xs text-muted mt-1 line-clamp-2">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Homework List */}
      <div>
        <h3 className="font-semibold text-textMain mb-3">Your Assignments</h3>
        {homework.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-muted">
            No homework assigned yet. Use "Assign Homework" above to create the first assignment for your class.
          </div>
        ) : (
          <div className="space-y-3">
            {homework.map((hw) => (
              <div key={hw.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-textMain truncate">{hw.title}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {hw.subject && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{hw.subject}</span>}
                      {hw.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{hw.category}</span>}
                      <span className="text-xs text-muted">Due: {new Date(hw.due_date).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => navigate(`/homework/${hw.id}/submissions`)} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-100">Submissions</button>
                    <button onClick={() => handleEditOpen(hw)} className="text-xs bg-blue-50 text-primary px-2 py-1 rounded-lg hover:bg-blue-100">Edit</button>
                    <button onClick={() => handleDeleteHw(hw.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Homework Modal */}
      {editHw && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-textMain">Edit Homework</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Marks</label>
                <input type="number" value={editForm.max_marks} onChange={e => setEditForm({...editForm, max_marks: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Homework</option><option>Classwork</option><option>Project</option><option>Test</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input type="date" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditHw(null)} className="flex-1 border border-gray-200 text-textMain py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="flex-1 bg-primary text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
