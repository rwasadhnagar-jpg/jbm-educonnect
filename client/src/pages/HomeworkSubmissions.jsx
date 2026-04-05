import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function HomeworkSubmissions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hw, setHw] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingGrade, setSavingGrade] = useState({})
  const [grades, setGrades] = useState({})
  const [remarks, setRemarks] = useState({})
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get(`/api/homework/${id}`),
      api.get(`/api/homework/${id}/submissions`)
    ]).then(([hwRes, subRes]) => {
      setHw(hwRes.data)
      setSubmissions(subRes.data)
      const g = {}
      const r = {}
      subRes.data.forEach(s => {
        if (s.submission?.marks_obtained !== undefined && s.submission?.marks_obtained !== null) g[s.student_id] = s.submission.marks_obtained
        if (s.submission?.teacher_remark) r[s.student_id] = s.submission.teacher_remark
      })
      setGrades(g)
      setRemarks(r)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const handleGrade = async (studentId) => {
    setSavingGrade(prev => ({ ...prev, [studentId]: true }))
    try {
      await api.patch(`/api/homework/${id}/submissions/${studentId}/grade`, {
        marks_obtained: grades[studentId],
        teacher_remark: remarks[studentId] || ''
      })
      setSubmissions(prev => prev.map(s => s.student_id === studentId
        ? { ...s, submission: { ...s.submission, marks_obtained: grades[studentId], teacher_remark: remarks[studentId] || null } }
        : s))
    } catch { alert('Failed to save grade') }
    finally { setSavingGrade(prev => ({ ...prev, [studentId]: false })) }
  }

  const exportReport = () => {
    const rows = submissions.map((s) => ({
      Student: s.full_name,
      Username: s.username,
      Status: s.submitted ? 'Submitted' : 'Pending',
      Late: s.submission?.is_late ? 'Yes' : 'No',
      Marks: s.submission?.marks_obtained ?? '',
      Remark: s.submission?.teacher_remark || '',
      SubmittedAt: s.submission?.submitted_at ? new Date(s.submission.submitted_at).toLocaleString('en-IN') : ''
    }))
    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((row) => Object.values(row).map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `homework-report-${id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const submitted = submissions.filter(s => s.submitted).length
  const total = submissions.length

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-primary text-sm mb-4 hover:underline">← Back</button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-textMain">{hw?.title}</h2>
        <p className="text-sm text-muted mt-1">
          {hw?.subject && <span className="mr-3">📚 {hw.subject}</span>}
          {hw?.max_marks && <span className="mr-3">Max: {hw.max_marks} marks</span>}
          Due: {hw?.due_date && new Date(hw.due_date).toLocaleDateString('en-IN')}
        </p>
      </div>
      <div className="mb-4 flex justify-end">
        <button onClick={exportReport} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-textMain hover:bg-gray-50">
          Export Report
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{total}</p>
          <p className="text-xs text-muted">Total Students</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-success">{submitted}</p>
          <p className="text-xs text-muted">Submitted</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-danger">{total - submitted}</p>
          <p className="text-xs text-muted">Pending</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'submitted', 'pending'].map(tab => (
          <button key={tab} onClick={() => setSelected(tab === 'all' ? null : tab)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${(selected === null && tab === 'all') || selected === tab ? 'bg-primary text-white' : 'bg-gray-100 text-muted'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Student list */}
      <div className="space-y-3">
        {submissions
          .filter(s => !selected || (selected === 'submitted' ? s.submitted : !s.submitted))
          .map(s => (
          <div key={s.student_id} className={`bg-white rounded-xl border p-4 ${s.submitted ? 'border-green-100' : 'border-red-100'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.submitted ? 'bg-success' : 'bg-danger'}`}></span>
                  <p className="font-medium text-textMain text-sm truncate">{s.full_name}</p>
                </div>
                {s.submitted && s.submission?.text_response && (
                  <p className="text-xs text-muted mt-1 line-clamp-2 pl-4">{s.submission.text_response}</p>
                )}
                {s.submitted && s.submission?.submitted_at && (
                  <p className="text-xs text-muted mt-1 pl-4">{new Date(s.submission.submitted_at).toLocaleString('en-IN')}</p>
                )}
                {s.submission?.is_late && (
                  <p className="text-xs text-orange-600 pl-4 mt-1 font-medium">Late submission</p>
                )}
                {!s.submitted && <p className="text-xs text-red-400 pl-4 mt-1">Not submitted</p>}
              </div>
              {s.submitted && hw?.max_marks && (
                <div className="flex min-w-52 flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={hw.max_marks}
                      value={grades[s.student_id] ?? ''}
                      onChange={e => setGrades(prev => ({ ...prev, [s.student_id]: e.target.value }))}
                      placeholder="—"
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-xs text-muted">/ {hw.max_marks}</span>
                  </div>
                  <input
                    value={remarks[s.student_id] ?? ''}
                    onChange={(e) => setRemarks((prev) => ({ ...prev, [s.student_id]: e.target.value }))}
                    placeholder="Teacher remark"
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => handleGrade(s.student_id)}
                    disabled={savingGrade[s.student_id]}
                    className="text-xs bg-primary text-white px-2 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-60">
                    {savingGrade[s.student_id] ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
