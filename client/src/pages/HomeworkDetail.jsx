import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PDFViewer from '../components/PDFViewer'
import QuizPlayer from '../components/QuizPlayer'

export default function HomeworkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hw, setHw] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      } catch {
        setError('Failed to load homework.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  if (error) return <div className="max-w-2xl mx-auto px-4 py-8 text-danger text-center">{error}</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-primary text-sm mb-4 hover:underline">&#8592; Back</button>
      <h2 className="text-2xl font-bold text-textMain mb-2">{hw?.title}</h2>
      <p className="text-sm text-muted mb-1">Due: {new Date(hw?.due_date).toLocaleDateString('en-IN')}</p>
      {hw?.description && <p className="text-textMain text-sm mb-6 leading-relaxed">{hw.description}</p>}
      {hw?.type === 'text' && <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-textMain leading-relaxed whitespace-pre-wrap">{hw.description}</div>}
      {hw?.type === 'pdf' && <PDFViewer url={pdfUrl} />}
      {hw?.type === 'quiz' && <QuizPlayer homeworkId={id} questions={questions} />}
    </div>
  )
}
