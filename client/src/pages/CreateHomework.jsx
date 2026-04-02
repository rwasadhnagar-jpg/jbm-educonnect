import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function CreateHomework() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', type: 'text', due_date: '', class_group_id: '' })
  const [classGroups, setClassGroups] = useState([])
  const [file, setFile] = useState(null)
  const [questions, setQuestions] = useState([{ question_text: '', options: ['', '', '', ''], correct_option: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/users/class-groups').then(({ data }) => setClassGroups(data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (form.type === 'pdf' && file) fd.append('file', file)
      if (form.type === 'quiz') fd.append('questions', JSON.stringify(questions))
      await api.post('/api/homework', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate('/teacher')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create homework.')
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => setQuestions((prev) => [...prev, { question_text: '', options: ['', '', '', ''], correct_option: 0 }])
  const updateQuestion = (idx, field, value) => setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  const updateOption = (qIdx, oIdx, value) => setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-primary text-sm mb-4 hover:underline">← Back</button>
      <h2 className="text-2xl font-bold text-textMain mb-6">Assign Homework</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Class Group</label>
          <select value={form.class_group_id} onChange={(e) => setForm({ ...form, class_group_id: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select class...</option>
            {classGroups.map((cg) => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Chapter 5 Reading" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description / Instructions</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Add any instructions..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="text">Text</option>
              <option value="pdf">PDF</option>
              <option value="quiz">Quiz (MCQ)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        {form.type === 'pdf' && (
          <div>
            <label className="block text-sm font-medium mb-1">Upload PDF</label>
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} required className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm" />
          </div>
        )}
        {form.type === 'quiz' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Quiz Questions</h3>
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                <input type="text" value={q.question_text} onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)} placeholder={`Question ${qIdx + 1}`} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qIdx}`} checked={q.correct_option === oIdx} onChange={() => updateQuestion(qIdx, 'correct_option', oIdx)} className="accent-primary" />
                    <input type="text" value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} required className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                ))}
              </div>
            ))}
            <button type="button" onClick={addQuestion} className="text-primary text-sm font-medium hover:underline">+ Add Question</button>
          </div>
        )}
        {error && <p className="text-danger text-sm text-center">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
          {loading ? 'Assigning...' : 'Assign Homework'}
        </button>
      </form>
    </div>
  )
}
