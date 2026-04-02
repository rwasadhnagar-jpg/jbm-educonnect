import { useState, useEffect } from 'react'
import api from '../api/client'
import HomeworkCard from '../components/HomeworkCard'
import SessionCard from '../components/SessionCard'
import { useAuth } from '../context/AuthContext'

export default function ParentDashboard() {
  const { user } = useAuth()
  const [homework, setHomework] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/api/homework'), api.get('/api/sessions')])
      .then(([hw, s]) => { setHomework(hw.data); setSessions(s.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-textMain">Parent Dashboard</h2>
        <p className="text-muted text-sm mt-1">Viewing your child's activity (read-only)</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-textMain mb-3">Homework ({homework.length})</h3>
            <div className="space-y-3">
              {homework.length === 0 ? (
                <p className="text-muted text-sm">No homework assigned.</p>
              ) : (
                homework.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)
              )}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-textMain mb-3">Upcoming Sessions ({sessions.length})</h3>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-muted text-sm">No sessions scheduled.</p>
              ) : (
                sessions.map((s) => <SessionCard key={s.id} session={s} onJoin={() => {}} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
