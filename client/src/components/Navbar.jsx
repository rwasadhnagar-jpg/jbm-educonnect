import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const links = {
    student: [{ to: '/student', label: 'Dashboard' }, { to: '/sessions', label: 'Sessions' }],
    teacher: [{ to: '/teacher', label: 'Dashboard' }, { to: '/sessions', label: 'Sessions' }, { to: '/homework/create', label: '+ Homework' }, { to: '/sessions/schedule', label: '+ Session' }],
    admin: [{ to: '/admin', label: 'Admin Panel' }],
    parent: [{ to: '/parent', label: 'Dashboard' }]
  }

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg tracking-tight">JBM EduConnect</Link>
        <div className="flex items-center gap-4">
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
