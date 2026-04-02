import { useState, useEffect } from 'react'
import api from '../api/client'
import HomeworkCard from '../components/HomeworkCard'
import { useAuth } from '../context/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [homework, setHomework] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/homework').then(({ data }) => setHomework(data)).catch(() => setError('Failed to load homework.')).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-textMain">Welcome, {user?.full_name?.split(' ')[0] || user?.username}</h2>
        <p className="text-muted text-sm mt-1">Here is your homework for this week.</p>
      </div>
      {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}
      {error && <div className="bg-red-50 text-danger text-sm rounded-lg p-4 text-center">{error}</div>}
      {!loading && !error && homework.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p className="text-4xl mb-3">&#128218;</p>
          <p>No homework assigned yet.</p>
        </div>
      )}
      <div className="space-y-3">
        {homework.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)}
      </div>
    </div>
  )
}
