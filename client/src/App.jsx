import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import HomeworkDetail from './pages/HomeworkDetail'
import Sessions from './pages/Sessions'
import TeacherDashboard from './pages/TeacherDashboard'
import CreateHomework from './pages/CreateHomework'
import ScheduleSession from './pages/ScheduleSession'
import AdminPanel from './pages/AdminPanel'
import ParentDashboard from './pages/ParentDashboard'
import Settings from './pages/Settings'
import HomeworkSubmissions from './pages/HomeworkSubmissions'
import MyClass from './pages/MyClass'
import Navbar from './components/Navbar'
import { useEffect } from 'react'
import { requestNotificationPermission } from './utils/notifications'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password && window.location.pathname !== '/settings') return <Navigate to="/settings" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'student') return <Navigate to="/student" replace />
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />
  if (user.role === 'admin' || user.role === 'sub_admin') return <Navigate to="/admin" replace />
  if (user.role === 'parent') return <Navigate to="/parent" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  useEffect(() => { requestNotificationPermission() }, [])
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Navbar /><RoleHome /></PrivateRoute>} />
          <Route path="/student" element={<PrivateRoute roles={['student']}><Navbar /><StudentDashboard /></PrivateRoute>} />
          <Route path="/homework/:id" element={<PrivateRoute roles={['student', 'teacher', 'admin', 'sub_admin']}><Navbar /><HomeworkDetail /></PrivateRoute>} />
          <Route path="/sessions" element={<PrivateRoute roles={['student', 'teacher', 'admin', 'sub_admin']}><Navbar /><Sessions /></PrivateRoute>} />
          <Route path="/teacher" element={<PrivateRoute roles={['teacher']}><Navbar /><TeacherDashboard /></PrivateRoute>} />
          <Route path="/homework/create" element={<PrivateRoute roles={['teacher']}><Navbar /><CreateHomework /></PrivateRoute>} />
          <Route path="/homework/:id/submissions" element={<PrivateRoute roles={['teacher']}><Navbar /><HomeworkSubmissions /></PrivateRoute>} />
          <Route path="/my-class" element={<PrivateRoute roles={['teacher']}><Navbar /><MyClass /></PrivateRoute>} />
          <Route path="/sessions/schedule" element={<PrivateRoute roles={['teacher']}><Navbar /><ScheduleSession /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute roles={['admin', 'sub_admin']}><Navbar /><AdminPanel /></PrivateRoute>} />
          <Route path="/parent" element={<PrivateRoute roles={['parent']}><Navbar /><ParentDashboard /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Navbar /><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
