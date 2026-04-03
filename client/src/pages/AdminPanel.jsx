import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import api from '../api/client'

const NAV = [
  { id: 'users',         label: 'Users',           icon: '👥' },
  { id: 'classes',       label: 'Classes',          icon: '🏫' },
  { id: 'bulk',          label: 'Bulk Import',      icon: '📥' },
  { id: 'announcements', label: 'Announcements',    icon: '📢' },
  { id: 'homework',      label: 'Homework',         icon: '📚' },
  { id: 'sessions',      label: 'Session History',  icon: '🎥' },
  { id: 'live',          label: 'Live Monitor',     icon: '🔴' },
]
const ROLES = ['student', 'teacher', 'parent', 'admin']

export default function AdminPanel() {
  const [section, setSection] = useState('users')
  const [users, setUsers] = useState([])
  const [classGroups, setClassGroups] = useState([])
  const [allSessions, setAllSessions] = useState([])
  const [allHomework, setAllHomework] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  // Users state
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [createForm, setCreateForm] = useState({ username: '', full_name: '', email: '', role: 'student', class_group_id: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [formMsg, setFormMsg] = useState({ type: '', text: '' })

  // Classes state
  const [selectedClass, setSelectedClass] = useState('')
  const [bulkPwdClass, setBulkPwdClass] = useState('')

  // Bulk import state
  const [bulkRows, setBulkRows] = useState([])
  const [defaultPassword, setDefaultPassword] = useState('JBM@2025')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)
  const fileRef = useRef()

  // Announcements state
  const [annForm, setAnnForm] = useState({ title: '', message: '', target_class_group_id: '' })
  const [annLoading, setAnnLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/api/users'),
      api.get('/api/users/class-groups'),
      api.get('/api/sessions'),
      api.get('/api/homework'),
      api.get('/api/announcements').catch(() => ({ data: [] }))
    ]).then(([u, cg, s, hw, ann]) => {
      setUsers(u.data || [])
      setClassGroups(cg.data || [])
      setAllSessions(s.data || [])
      setAllHomework(hw.data || [])
      setAnnouncements(ann.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // ── Helpers ──
  const liveSessions = allSessions.filter(s => s.status === 'live')
  const liveCount = liveSessions.length

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !filterRole || u.role === filterRole
    const matchClass = !filterClass || u.class_group_id === filterClass
    return matchSearch && matchRole && matchClass
  })

  const classStudents = selectedClass ? users.filter(u => u.role === 'student' && u.class_group_id === selectedClass) : []

  const className = (id) => classGroups.find(c => c.id === id)?.name || '—'

  // ── Actions ──
  const handleCreate = async (e) => {
    e.preventDefault(); setFormMsg({ type: '', text: '' }); setCreating(true)
    try {
      const { data } = await api.post('/api/users', createForm)
      setUsers(prev => [data, ...prev])
      setCreateForm({ username: '', full_name: '', email: '', role: 'student', class_group_id: '', password: '' })
      setFormMsg({ type: 'success', text: 'User created successfully.' })
    } catch (err) {
      setFormMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create user.' })
    } finally { setCreating(false) }
  }

  const handleSaveEdit = async () => {
    try {
      const { data } = await api.patch(`/api/users/${editUser.id}`, editForm)
      setUsers(prev => prev.map(u => u.id === data.id ? { ...u, ...data } : u))
      setEditUser(null)
    } catch (err) { alert(err.response?.data?.error || 'Failed to update') }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete ${u.full_name}? This cannot be undone.`)) return
    try {
      await api.delete(`/api/users/${u.id}`)
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete') }
  }

  const handleToggleActive = async (u) => {
    try {
      const { data } = await api.patch(`/api/users/${u.id}`, { is_active: !u.is_active })
      setUsers(prev => prev.map(x => x.id === data.id ? { ...x, ...data } : x))
    } catch { alert('Failed to update') }
  }

  const handleResetPassword = async (userId) => {
    const pwd = prompt('Enter new password (min 8 chars):')
    if (!pwd || pwd.length < 8) return alert('Password too short')
    try { await api.patch(`/api/users/${userId}/password`, { password: pwd }); alert('Password reset.') }
    catch { alert('Failed to reset password') }
  }

  const handleBulkClassReset = async () => {
    const pwd = prompt(`Reset password for ALL students in ${className(bulkPwdClass)}:`)
    if (!pwd || pwd.length < 8) return alert('Password too short')
    try {
      const { data } = await api.post(`/api/users/class/${bulkPwdClass}/reset-password`, { password: pwd })
      alert(data.message)
    } catch { alert('Failed') }
  }

  const handleJoinSession = async (sessionId) => {
    try {
      const { data } = await api.post(`/api/sessions/${sessionId}/join`)
      window.open(data.meetUrl, '_blank', 'noopener,noreferrer')
    } catch (e) { alert(e.response?.data?.error || 'Cannot join') }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const normalized = rows.map(row => {
        const n = {}
        Object.entries(row).forEach(([k, v]) => { n[k.toLowerCase().trim().replace(/\s+/g, '_')] = String(v).trim() })
        const classLabel = n.class || n.class_group || ''
        return {
          full_name: n.full_name || n.name || '',
          username: n.username || '',
          password: n.password || '',
          email: n.email || '',
          role: (n.role || 'student').toLowerCase(),
          class_group_id: classGroups.find(g => g.name.toLowerCase() === classLabel.toLowerCase())?.id || '',
          class_label: classLabel
        }
      }).filter(r => r.full_name || r.username)
      setBulkRows(normalized); setBulkResult(null)
    }
    reader.readAsBinaryString(file)
  }

  const handleBulkImport = async () => {
    if (!bulkRows.length || defaultPassword.length < 8) return alert('Check rows and default password')
    setBulkLoading(true); setBulkResult(null)
    try {
      const { data } = await api.post('/api/users/bulk', { users: bulkRows, default_password: defaultPassword })
      setBulkResult(data)
      if (data.created.length) setUsers(prev => [...data.created, ...prev])
    } catch (err) { alert(err.response?.data?.error || 'Bulk import failed') }
    finally { setBulkLoading(false) }
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['full_name', 'username', 'password', 'email', 'role', 'class'],
      ['Rahul Sharma', 'rahulsharma@5N', 'RahulSharma@5N', '', 'student', 'Class 5 - Narmada'],
      ['Meena Gupta', 'meenagupta', 'MeenaGupta@jbm', '', 'teacher', ''],
    ])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, 'JBM_Import_Template.xlsx')
  }

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault(); setAnnLoading(true)
    try {
      const { data } = await api.post('/api/announcements', annForm)
      setAnnouncements(prev => [data, ...prev])
      setAnnForm({ title: '', message: '', target_class_group_id: '' })
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
    finally { setAnnLoading(false) }
  }

  const handleDeleteAnn = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try { await api.delete(`/api/announcements/${id}`); setAnnouncements(prev => prev.filter(a => a.id !== id)) }
    catch { alert('Failed to delete') }
  }

  const roleBadge = (role) => {
    const colors = { admin: 'bg-purple-100 text-purple-700', teacher: 'bg-green-100 text-green-700', student: 'bg-blue-100 text-primary', parent: 'bg-yellow-100 text-yellow-700' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[role] || 'bg-gray-100 text-gray-600'}`}>{role}</span>
  }

  const inp = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full'

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="w-52 bg-white border-r border-gray-100 shadow-sm flex flex-col py-6 shrink-0">
        <p className="text-xs font-semibold text-muted uppercase px-5 mb-3 tracking-wide">Admin Panel</p>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)}
            className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors text-left relative ${section === n.id ? 'bg-blue-50 text-primary border-r-2 border-primary' : 'text-textMain hover:bg-gray-50'}`}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
            {n.id === 'live' && liveCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{liveCount}</span>}
          </button>
        ))}
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 px-8 py-6 overflow-auto">

        {/* ══ USERS ══ */}
        {section === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-textMain">Users <span className="text-muted font-normal text-base">({users.length} total)</span></h2>

            {/* Create */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold mb-4">Create New User</h3>
              <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
                <input className={inp} placeholder="Full Name" value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} required />
                <input className={inp} placeholder="Username" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} required />
                <input className={inp} placeholder="Password (min 8 chars)" type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required minLength={8} />
                <input className={inp} placeholder="Email (optional)" type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
                <select className={inp} value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
                <select className={inp} value={createForm.class_group_id} onChange={e => setCreateForm({ ...createForm, class_group_id: e.target.value })}>
                  <option value="">No class group</option>
                  {classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                </select>
                {formMsg.text && <p className={`col-span-2 text-sm ${formMsg.type === 'error' ? 'text-danger' : 'text-success'}`}>{formMsg.text}</p>}
                <button type="submit" disabled={creating} className="col-span-2 bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1 min-w-48" placeholder="Search by name or username..." value={search} onChange={e => setSearch(e.target.value)} />
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
              </select>
              {(search || filterRole || filterClass) && <button onClick={() => { setSearch(''); setFilterRole(''); setFilterClass('') }} className="text-sm text-muted hover:text-danger">✕ Clear</button>}
              <span className="text-xs text-muted ml-auto">{filteredUsers.length} shown</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-muted text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Username</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Class</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={`hover:bg-gray-50 ${u.is_active === false ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 font-medium">{u.full_name}</td>
                        <td className="px-4 py-3 text-muted">{u.username}</td>
                        <td className="px-4 py-3">{roleBadge(u.role)}</td>
                        <td className="px-4 py-3 text-muted text-xs">{u.class_group_name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active === false ? 'bg-red-50 text-danger' : 'bg-green-50 text-success'}`}>
                            {u.is_active === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3 text-xs">
                            <button onClick={() => { setEditUser(u); setEditForm({ full_name: u.full_name, email: u.email || '', class_group_id: u.class_group_id || '', role: u.role }) }} className="text-primary hover:underline">Edit</button>
                            <button onClick={() => handleResetPassword(u.id)} className="text-muted hover:text-textMain">Reset pwd</button>
                            <button onClick={() => handleToggleActive(u)} className="text-muted hover:text-textMain">{u.is_active === false ? 'Activate' : 'Deactivate'}</button>
                            <button onClick={() => handleDelete(u)} className="text-danger hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ CLASSES ══ */}
        {section === 'classes' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-textMain">Class View</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium mb-1">Select Class</label>
                <select className={inp} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="">Choose a class...</option>
                  {classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                </select>
              </div>
              {selectedClass && (
                <div className="flex gap-3 items-end">
                  <select className={inp} style={{ width: 220 }} value={bulkPwdClass} onChange={e => setBulkPwdClass(e.target.value)}>
                    <option value="">Select class for bulk reset...</option>
                    {classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                  </select>
                  <button onClick={handleBulkClassReset} disabled={!bulkPwdClass} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 whitespace-nowrap transition-colors">
                    Bulk Reset Pwd
                  </button>
                </div>
              )}
            </div>
            {selectedClass && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">{className(selectedClass)} — {classStudents.length} students</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-muted text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Username</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {classStudents.map((u, i) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-muted">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{u.full_name}</td>
                        <td className="px-4 py-2 text-muted">{u.username}</td>
                        <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active === false ? 'bg-red-50 text-danger' : 'bg-green-50 text-success'}`}>{u.is_active === false ? 'Inactive' : 'Active'}</span></td>
                        <td className="px-4 py-2"><button onClick={() => handleResetPassword(u.id)} className="text-xs text-muted hover:text-danger">Reset pwd</button></td>
                      </tr>
                    ))}
                    {classStudents.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted">No students in this class yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ BULK IMPORT ══ */}
        {section === 'bulk' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-textMain">Bulk Import</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Upload Excel with columns: <code className="bg-gray-100 px-1 rounded">full_name, username, password, email, role, class</code></p>
                <button onClick={downloadTemplate} className="text-sm text-primary hover:underline whitespace-nowrap">Download Template</button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Password <span className="text-muted">(used if password column is empty)</span></label>
                <input type="text" value={defaultPassword} onChange={e => setDefaultPassword(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload File (.xlsx or .csv)</label>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-sm file:cursor-pointer" />
              </div>
            </div>

            {bulkRows.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{bulkRows.length} users ready</h3>
                  <button onClick={handleBulkImport} disabled={bulkLoading} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {bulkLoading ? 'Importing...' : `Import ${bulkRows.length} Users`}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-muted text-xs uppercase">
                      <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Username</th><th className="px-4 py-2 text-left">Role</th><th className="px-4 py-2 text-left">Class</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bulkRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{r.full_name}</td>
                          <td className="px-4 py-2 text-muted">{r.username}</td>
                          <td className="px-4 py-2">{roleBadge(r.role)}</td>
                          <td className="px-4 py-2 text-muted text-xs">{r.class_label || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {bulkResult && (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-700 font-semibold">{bulkResult.created.length} users created</p>
                  <p className="text-green-600 text-xs mt-1">Default password applied: <code>{defaultPassword}</code></p>
                </div>
                {bulkResult.failed.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-danger font-semibold text-sm mb-2">{bulkResult.failed.length} failed:</p>
                    <ul className="text-xs text-danger space-y-1">{bulkResult.failed.map((f, i) => <li key={i}>{f.username}: {f.reason}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ ANNOUNCEMENTS ══ */}
        {section === 'announcements' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-textMain">Announcements</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold mb-4">Create Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                <input className={inp} placeholder="Title" value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} required />
                <textarea className={inp + ' resize-none'} rows={4} placeholder="Message..." value={annForm.message} onChange={e => setAnnForm({ ...annForm, message: e.target.value })} required />
                <select className={inp} value={annForm.target_class_group_id} onChange={e => setAnnForm({ ...annForm, target_class_group_id: e.target.value })}>
                  <option value="">Send to All Classes</option>
                  {classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                </select>
                <button type="submit" disabled={annLoading} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {annLoading ? 'Sending...' : 'Send Announcement'}
                </button>
              </form>
            </div>
            <div className="space-y-3">
              {announcements.length === 0 && <p className="text-muted text-sm text-center py-8">No announcements yet.</p>}
              {announcements.map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{a.title}</span>
                        <span className="text-xs bg-blue-50 text-primary px-2 py-0.5 rounded-full">{a.class_name || 'All Classes'}</span>
                      </div>
                      <p className="text-sm text-muted">{a.message}</p>
                      <p className="text-xs text-muted mt-2">{new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={() => handleDeleteAnn(a.id)} className="text-xs text-danger hover:underline shrink-0">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ HOMEWORK ══ */}
        {section === 'homework' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-textMain">Homework Overview <span className="text-muted font-normal text-base">({allHomework.length} total)</span></h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-muted text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allHomework.map(hw => (
                    <tr key={hw.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{hw.title}</td>
                      <td className="px-4 py-3 text-muted text-xs">{className(hw.class_group_id)}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{hw.type}</span></td>
                      <td className="px-4 py-3 text-muted text-xs">{hw.due_date ? new Date(hw.due_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-muted text-xs">{new Date(hw.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                  {allHomework.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted">No homework assigned yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ SESSION HISTORY ══ */}
        {section === 'sessions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-textMain">Session History <span className="text-muted font-normal text-base">({allSessions.length} total)</span></h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-muted text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Start Time</th>
                    <th className="px-4 py-3 text-left">End Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allSessions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.title}</td>
                      <td className="px-4 py-3 text-muted text-xs">{className(s.class_group_id)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'live' ? 'bg-red-50 text-red-600' : s.status === 'ended' ? 'bg-gray-100 text-muted' : 'bg-blue-50 text-primary'}`}>
                          {s.status === 'live' ? '🔴 Live' : s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{s.start_time ? new Date(s.start_time).toLocaleString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-muted text-xs">{s.end_time ? new Date(s.end_time).toLocaleString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                  {allSessions.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted">No sessions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ LIVE MONITOR ══ */}
        {section === 'live' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-textMain">Live Monitor</h2>
            <p className="text-sm text-muted">Join any live session as an observer.</p>
            {liveSessions.length === 0 ? (
              <div className="text-center py-16 text-muted bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-4xl mb-3">📹</p>
                <p>No live sessions right now.</p>
              </div>
            ) : liveSessions.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-red-100 shadow-sm p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="font-semibold">{s.title}</span>
                  </div>
                  <p className="text-xs text-muted">{className(s.class_group_id)}</p>
                </div>
                <button onClick={() => handleJoinSession(s.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors">
                  Monitor
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Edit Modal ── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="text-muted hover:text-textMain text-xl leading-none">✕</button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-muted mb-1">Full Name</label><input className={inp} value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
              <div><label className="block text-xs font-medium text-muted mb-1">Email</label><input className={inp} type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><label className="block text-xs font-medium text-muted mb-1">Role</label>
                <select className={inp} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted mb-1">Class Group</label>
                <select className={inp} value={editForm.class_group_id} onChange={e => setEditForm({ ...editForm, class_group_id: e.target.value })}>
                  <option value="">No class group</option>
                  {classGroups.map(cg => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveEdit} className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">Save Changes</button>
              <button onClick={() => setEditUser(null)} className="flex-1 border border-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
