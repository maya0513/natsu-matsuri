import { config } from 'dotenv'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'

config()

const app = createApp()

const port = Number(process.env.PORT) || 3000

console.log(`Server running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
