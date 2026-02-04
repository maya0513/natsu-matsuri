import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoutes from './routes/auth.js'

export const createApp = () => {
  const app = new OpenAPIHono()

  // ミドルウェア
  app.use('*', logger())
  app.use(
    '*',
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  )

  // ルート
  app.route('/api/auth', authRoutes)

  // OpenAPI documentation
  app.doc('/api/openapi.json', {
    openapi: '3.0.0',
    info: {
      version: '0.1.0',
      title: 'Fooweb API',
    },
  })

  return app
}
