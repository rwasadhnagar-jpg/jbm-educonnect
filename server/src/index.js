import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import homeworkRoutes from './routes/homework.js'
import quizRoutes from './routes/quiz.js'
import sessionRoutes from './routes/sessions.js'
import userRoutes from './routes/users.js'
import notificationRoutes from './routes/notifications.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many login attempts. Try again later.' } })

app.use('/api/', limiter)
app.use('/api/auth/login', authLimiter)

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/auth', authRoutes)
app.use('/api/homework', homeworkRoutes)
app.use('/api/quiz', quizRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/users', userRoutes)
app.use('/api/notifications', notificationRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`JBM EduConnect server running on port ${PORT}`))
