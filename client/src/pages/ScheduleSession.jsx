import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function ScheduleSession() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', class_group_id: '', start_time: '', end_time: '' })
  const [classGroups, setClassGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/users/class-groups').then(({ data }) => setClassGroups(data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError('End time must be after start time.')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/sessions', form)
      navigate('/sessions')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule session.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-primary text-sm mb-4 hover:underline">← Back</button>
      <h2 className="text-2xl font-bold text-textMain mb-6">Schedule Video Session</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Class Group</label>
          <select value={form.class_group_id} onChange={(e) => setForm({ ...form, class_group_id: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select class...</option>
            {classGroups.map((cg) => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Session Title</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Math Live Class" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        {error && <p className="text-danger text-sm text-center">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
          {loading ? 'Scheduling...' : 'Schedule Session'}
        </button>
      </form>
    </div>
  )
}
