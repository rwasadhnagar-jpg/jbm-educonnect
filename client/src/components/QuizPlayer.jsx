import { useState } from 'react'
import api from '../api/client'

export default function QuizPlayer({ homeworkId, questions }) {
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = (qId, option) => {
    if (result) return
    setAnswers((prev) => ({ ...prev, [qId]: option }))
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post(`/api/quiz/${homeworkId}/submit`, { answers })
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!questions?.length) return <div className="p-4 text-muted">No questions found.</div>

  return (
    <div className="space-y-6">
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{result.score}/{result.total}</p>
          <p className="text-muted text-sm mt-1">{Math.round((result.score / result.total) * 100)}% correct</p>
        </div>
      )}
      {questions.map((q, idx) => (
        <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="font-medium text-textMain mb-3">{idx + 1}. {q.question_text}</p>
          <div className="space-y-2">
            {(q.options || []).map((opt, i) => {
              const selected = answers[q.id] === i
              const correct = result && i === q.correct_option
              const wrong = result && selected && i !== q.correct_option
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(q.id, i)}
                  className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition-colors
                    ${correct ? 'bg-green-50 border-success text-success' :
                      wrong ? 'bg-red-50 border-danger text-danger' :
                      selected ? 'bg-blue-50 border-primary text-primary' :
                      'border-gray-200 hover:bg-gray-50'}`}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {error && <p className="text-danger text-sm text-center">{error}</p>}
      {!result && (
        <button onClick={handleSubmit} disabled={submitting} className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      )}
    </div>
  )
}
