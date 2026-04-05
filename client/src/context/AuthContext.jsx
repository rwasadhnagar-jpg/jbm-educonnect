import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'
import { jwtDecode } from 'jwt-decode'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    const token = localStorage.getItem('token')
    if (!token) return null
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const decoded = jwtDecode(token)
      const { data } = await api.get('/api/auth/me')
      const mergedUser = { ...decoded, ...data }
      setUser(mergedUser)
      return mergedUser
    } catch {
      return null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        if (decoded.exp * 1000 > Date.now()) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          refreshProfile().catch(() => setUser(decoded))
            .finally(() => setLoading(false))
          return
        }
      } catch {}
      localStorage.removeItem('token')
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const { data } = await api.post('/api/auth/login', { username, password })
    localStorage.setItem('token', data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    const decoded = jwtDecode(data.token)
    const mergedUser = { ...decoded, ...(data.user || {}) }
    setUser(mergedUser)
    return mergedUser
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile, setUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
