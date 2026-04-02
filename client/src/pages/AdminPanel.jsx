import { useState, useEffect } from 'react'
import api from '../api/client'

const ROLES = ['student', 'teacher', 'parent', 'admin']

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [classGroups, setClassGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: '', full_name: '', email: '', role: 'student', class_group_id: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([api.get('/api/users'), api.get('/api/users/class-groups')])
      .then(([u, cg]) => { setUsers(u.data); setClassGroups(cg.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setCreating(true)
    try {
      const { data } = await api.post('/api/users', form)
      setUsers((prev) => [data, ...prev])
      setForm({ username: '', full_name: '', email: '', role: 'student', class_group_id: '', password: '' })
      setSuccess('User created successfully.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async (userId) => {
    const newPwd = prompt('Enter new password (min 8 chars):')
    if (!newPwd || newPwd.length < 8) return
    try {
      await api.patch(`/api/users/${userId}/password`, { password: newPwd })
      alert('Password reset successfully.')
    } catch {
      alert('Failed to reset password.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-textMain mb-6">Admin Panel</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="font-semibold mb-4">Create New User</h3>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="text" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <select value={form.class_group_id} onChange={(e) => setForm({ ...form, class_group_id: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">No class group</option>
            {classGroups.map((cg) => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
          </select>
          {error && <p className="col-span-2 text-danger text-sm">{error}</p>}
          {success && <p className="col-span-2 text-success text-sm">{success}</p>}
          <button type="submit" disabled={creating} className="col-span-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <h3 className="font-semibold p-4 border-b">All Users ({users.length})</h3>
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-muted text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3 text-muted">{u.username}</td>
                    <td className="px-4 py-3"><span className="bg-blue-50 text-primary text-xs px-2 py-0.5 rounded-full">{u.role}</span></td>
                    <td className="px-4 py-3 text-muted text-xs">{u.class_group_name || '—'}</td>
                    <td className="px-4 py-3"><button onClick={() => handleResetPassword(u.id)} className="text-xs text-muted hover:text-danger transition-colors">Reset pwd</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
