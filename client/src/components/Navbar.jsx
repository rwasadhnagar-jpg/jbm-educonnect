import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const links = {
    student: [{ to: '/student', label: 'Dashboard' }, { to: '/sessions', label: 'Sessions' }, { to: '/settings', label: 'Settings' }],
    teacher: [{ to: '/teacher', label: 'Dashboard' }, { to: '/sessions', label: 'Sessions' }, { to: '/homework/create', label: '+ Homework' }, { to: '/sessions/schedule', label: '+ Session' }, { to: '/my-class', label: 'My Class' }, { to: '/settings', label: 'Settings' }],
    admin: [{ to: '/admin', label: 'Admin Panel' }, { to: '/settings', label: 'Settings' }],
    sub_admin: [{ to: '/admin', label: 'Admin Panel' }, { to: '/settings', label: 'Settings' }],
    parent: [{ to: '/parent', label: 'Dashboard' }, { to: '/settings', label: 'Settings' }]
  }

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="JBM" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg tracking-tight">JBM EduConnect</span>
        </Link>
        <div className="flex items-center gap-4">
          {user?.must_change_password && (
            <span className="hidden md:inline text-xs bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full font-semibold">
              Change password required
            </span>
          )}
          {(links[user?.role] || []).map((l) => (
            <Link key={l.to} to={l.to} className="text-sm hover:text-blue-200 transition-colors">{l.label}</Link>
          ))}
          <button onClick={handleLogout} className="text-sm bg-white text-primary px-3 py-1 rounded-full font-medium hover:bg-blue-50 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
