import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Settings() {
  const { user } = useAuth()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (form.new_password !== form.confirm_password) return setError('New passwords do not match')
    if (form.new_password.length < 8) return setError('New password must be at least 8 characters')
    setLoading(true)
    try {
      await api.patch('/api/users/me/password', {
        current_password: form.current_password,
        new_password: form.new_password
      })
      setSuccess('Password changed successfully!')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-textMain mb-2">Settings</h2>
      <p className="text-muted text-sm mb-6">Logged in as <span className="font-medium text-textMain">{user?.full_name}</span> ({user?.role})</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-textMain mb-4">Change Password</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMain mb-1">Current Password</label>
            <input
              type="password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMain mb-1">New Password</label>
            <input
              type="password"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              required
              minLength={8}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMain mb-1">Confirm New Password</label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Repeat new password"
            />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          {success && <p className="text-success text-sm">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
