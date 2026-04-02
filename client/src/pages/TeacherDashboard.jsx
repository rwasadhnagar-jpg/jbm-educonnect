import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import HomeworkCard from '../components/HomeworkCard'
import { useAuth } from '../context/AuthContext'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [homework, setHomework] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/homework?role=teacher')
      .then(({ data }) => setHomework(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-textMain">Teacher Dashboard</h2>
          <p className="text-muted text-sm">Welcome, {user?.full_name || user?.username}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link to="/homework/create" className="bg-primary text-white rounded-xl p-4 text-center hover:bg-blue-700 transition-colors">
          <p className="text-2xl mb-1">📝</p>
          <p className="text-sm font-medium">Assign Homework</p>
        </Link>
        <Link to="/sessions/schedule" className="bg-success text-white rounded-xl p-4 text-center hover:bg-green-700 transition-colors">
          <p className="text-2xl mb-1">📹</p>
          <p className="text-sm font-medium">Schedule Session</p>
        </Link>
      </div>
      <h3 className="font-semibold text-textMain mb-3">Your Assignments</h3>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {homework.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No homework assigned yet.</p>
          ) : (
            homework.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)
          )}
        </div>
      )}
    </div>
  )
}
