import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function MyClass() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [homework, setHomework] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [studentSubmissions, setStudentSubmissions] = useState([])
  const [loadingSub, setLoadingSub] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/users/my-class-students'),
      api.get('/api/homework')
    ]).then(([studsRes, hwRes]) => {
      setStudents(studsRes.data || [])
      setHomework(hwRes.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const handleSelectStudent = async (student) => {
    setSelected(student)
    setLoadingSub(true)
    try {
      const results = await Promise.all(
        homework.map(hw =>
          api.get(`/api/homework/${hw.id}/submissions`).then(res => {
            const sub = res.data.find(s => s.student_id === student.id)
            return { hw, sub }
          }).catch(() => null)
        )
      )
      setStudentSubmissions(results.filter(Boolean))
    } catch { setStudentSubmissions([]) }
    finally { setLoadingSub(false) }
  }

  const filtered = students.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.username.toLowerCase().includes(search.toLowerCase())
  )

  const submitted = studentSubmissions.filter(r => r.sub?.submitted).length
  const graded = studentSubmissions.filter(r => r.sub?.submission?.marks_obtained !== null && r.sub?.submission?.marks_obtained !== undefined).length
  const totalMarks = studentSubmissions.reduce((acc, r) => acc + (parseFloat(r.sub?.submission?.marks_obtained) || 0), 0)
  const maxMarks = studentSubmissions.reduce((acc, r) => acc + (parseFloat(r.hw?.max_marks) || 0), 0)

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-primary text-sm mb-4 hover:underline">← Back</button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-textMain">My Class</h2>
          <p className="text-sm text-muted">{students.length} students enrolled</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search students..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{students.length}</p>
          <p className="text-xs text-muted">Students</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-success">{homework.length}</p>
          <p className="text-xs text-muted">Assignments</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-purple-600">{homework.filter(h => h.category === 'Test').length}</p>
          <p className="text-xs text-muted">Tests</p>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-muted py-8">No students found.</p>}
        {filtered.map(s => (
          <button key={s.id} onClick={() => handleSelectStudent(s)}
            className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {s.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-textMain text-sm">{s.full_name}</p>
                <p className="text-xs text-muted">{s.username}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Student Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[85vh]">
            <div className="p-6 pb-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selected.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-textMain">{selected.full_name}</h3>
                    <p className="text-xs text-muted">{selected.username}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-textMain text-xl">×</button>
              </div>

              {!loadingSub && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-primary">{submitted}/{homework.length}</p>
                    <p className="text-xs text-muted">Submitted</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-success">{graded}</p>
                    <p className="text-xs text-muted">Graded</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-purple-600">{maxMarks > 0 ? `${Math.round((totalMarks / maxMarks) * 100)}%` : '—'}</p>
                    <p className="text-xs text-muted">Score</p>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-y-auto px-6 pb-6 flex-1">
              {loadingSub ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Assignment History</p>
                  {studentSubmissions.map(({ hw, sub }) => (
                    <div key={hw.id} className={`rounded-xl p-3 border ${sub?.submitted ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-textMain">{hw.title}</p>
                          <p className="text-xs text-muted">{hw.subject || hw.category}</p>
                        </div>
                        <div className="text-right">
                          {sub?.submitted ? (
                            <>
                              <span className="text-xs text-success font-medium block">✓ Submitted</span>
                              {sub.submission?.marks_obtained !== null && sub.submission?.marks_obtained !== undefined ? (
                                <span className="text-xs text-textMain">{sub.submission.marks_obtained}/{hw.max_marks || '?'}</span>
                              ) : hw.max_marks ? (
                                <span className="text-xs text-muted">Not graded</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-xs text-danger font-medium">✗ Pending</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
