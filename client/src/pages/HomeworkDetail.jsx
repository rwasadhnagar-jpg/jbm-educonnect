import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PDFViewer from '../components/PDFViewer'
import QuizPlayer from '../components/QuizPlayer'
import { useAuth } from '../context/AuthContext'

export default function HomeworkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hw, setHw] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submission, setSubmission] = useState(null)
  const [textResponse, setTextResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/api/homework/${id}`)
        setHw(data)
        if (data.type === 'pdf') {
          const { data: urlData } = await api.get(`/api/homework/${id}/pdf-url`)
          setPdfUrl(urlData.url)
        }
        if (data.type === 'quiz') {
          const { data: qData } = await api.get(`/api/quiz/${id}/questions`)
          setQuestions(qData)
        }
        if (user?.role === 'student') {
          const { data: sub } = await api.get(`/api/homework/${id}/my-submission`).catch(() => ({ data: null }))
          setSubmission(sub)
          if (sub?.text_response) setTextResponse(sub.text_response)
        }
      } catch {
        setError('Failed to load homework.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const { data } = await api.post(`/api/homework/${id}/submit`, { text_response: textResponse })
      setSubmission(data)
      setSubmitMsg('Submitted successfully!')
    } catch (e) {
      setSubmitMsg(e.response?.data?.error || 'Failed to submit.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  if (error) return <div className="max-w-2xl mx-auto px-4 py-8 text-danger text-center">{error}</div>

  const isStudent = user?.role === 'student'
  const isPastDue = hw?.due_date && new Date(hw.due_date) < new Date()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-primary text-sm mb-4 hover:underline">← Back</button>
      <h2 className="text-2xl font-bold text-textMain mb-2">{hw?.title}</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {hw?.subject && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{hw.subject}</span>}
        {hw?.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{hw.category}</span>}
        {hw?.max_marks && <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{hw.max_marks} marks</span>}
        <span className={`text-xs px-2 py-1 rounded-full ${isPastDue ? 'bg-red-50 text-danger' : 'bg-yellow-50 text-yellow-700'}`}>
          Due: {new Date(hw?.due_date).toLocaleDateString('en-IN')}
        </span>
      </div>
      {hw?.description && <p className="text-textMain text-sm mb-6 leading-relaxed">{hw.description}</p>}

      {hw?.type === 'text' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-textMain leading-relaxed whitespace-pre-wrap mb-6">{hw.description}</div>
      )}
      {hw?.type === 'pdf' && <PDFViewer url={pdfUrl} />}
      {hw?.type === 'quiz' && <QuizPlayer homeworkId={id} questions={questions} />}

      {/* Student submission section */}
      {isStudent && hw?.type !== 'quiz' && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-textMain mb-3">
            {submission ? '✓ Your Submission' : 'Submit Your Work'}
          </h3>

          {submission?.marks_obtained !== null && submission?.marks_obtained !== undefined && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-success">
                Marks: {submission.marks_obtained}{hw.max_marks ? ` / ${hw.max_marks}` : ''}
              </p>
              <p className="text-xs text-muted mt-1">Graded by teacher</p>
            </div>
          )}

          <textarea
            value={textResponse}
            onChange={e => setTextResponse(e.target.value)}
            rows={5}
            placeholder="Write your answer or response here..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-3"
          />

          {submitMsg && (
            <p className={`text-sm mb-3 ${submitMsg.includes('success') ? 'text-success' : 'text-danger'}`}>{submitMsg}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || !textResponse.trim()}
              className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Submitting...' : submission ? 'Update Submission' : 'Submit'}
            </button>
            {submission && (
              <span className="text-xs text-muted">
                Last submitted: {new Date(submission.submitted_at).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
