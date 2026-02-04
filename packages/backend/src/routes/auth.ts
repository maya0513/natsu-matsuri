import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import { createUser } from '../auth/register.js'
import { authenticateUser, createSession, validateSession, deleteSession } from '../auth/session.js'
import { changePassword } from '../auth/changePassword.js'
import { deleteAccount } from '../auth/deleteAccount.js'

const app = new OpenAPIHono()

// スキーマ定義
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

const RegisterRequestSchema = z.object({
  email: z.string().email().openapi({ example: 'user@example.com' }),
  password: z.string().min(8).openapi({ example: 'secure_password_123' }),
})

const LoginRequestSchema = z.object({
  email: z.string().email().openapi({ example: 'user@example.com' }),
  password: z.string().openapi({ example: 'secure_password_123' }),
})

const ErrorSchema = z.object({
  error: z.string(),
})

const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).openapi({ example: 'old_password' }),
  newPassword: z.string().min(8).openapi({ example: 'new_password_123' }),
})

const DeleteAccountRequestSchema = z.object({
  password: z.string().min(1).openapi({ example: 'password123' }),
})

// POST /api/auth/register
const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            user: UserSchema,
          }),
        },
      },
      description: 'User registered successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid input',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'User already exists',
    },
  },
})

app.openapi(registerRoute, async (c) => {
  const { email, password } = c.req.valid('json')
  const result = await createUser({ email, password })

  if (!result.success) {
    const status = result.error.includes('already exists') ? 409 : 400
    return c.json({ error: result.error }, status)
  }

  return c.json({ user: result.data }, 201)
})

// POST /api/auth/login
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            user: UserSchema,
          }),
        },
      },
      description: 'Login successful',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid credentials',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Server error',
    },
  },
})

app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json')

  const authResult = await authenticateUser({ email, password })

  if (!authResult.success) {
    return c.json({ error: authResult.error }, 401)
  }

  const sessionResult = await createSession(authResult.data.id)

  if (!sessionResult.success) {
    return c.json({ error: sessionResult.error }, 500)
  }

  // セッションIDをCookieに設定
  setCookie(c, 'session_id', sessionResult.data.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7日間
    path: '/',
  })

  return c.json({ user: authResult.data }, 200)
})

// GET /api/auth/me
const meRoute = createRoute({
  method: 'get',
  path: '/me',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            user: UserSchema,
          }),
        },
      },
      description: 'Current user info',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Not authenticated',
    },
  },
})

app.openapi(meRoute, async (c) => {
  const sessionId = getCookie(c, 'session_id')

  if (!sessionId) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  const result = await validateSession(sessionId)

  if (!result.success) {
    return c.json({ error: result.error }, 401)
  }

  return c.json({ user: result.data.user }, 200)
})

// POST /api/auth/logout
const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: 'Logout successful',
    },
  },
})

app.openapi(logoutRoute, async (c) => {
  const sessionId = getCookie(c, 'session_id')

  if (sessionId) {
    await deleteSession(sessionId)
  }

  deleteCookie(c, 'session_id', {
    path: '/',
  })

  return c.json({ message: 'Logged out successfully' })
})

// POST /api/auth/change-password
const changePasswordRoute = createRoute({
  method: 'post',
  path: '/change-password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChangePasswordRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: 'Password changed successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Unauthorized',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Invalid input',
    },
  },
})

app.openapi(changePasswordRoute, async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  const sessionResult = await validateSession(sessionId)
  if (!sessionResult.success) {
    return c.json({ error: sessionResult.error }, 401)
  }

  const { currentPassword, newPassword } = c.req.valid('json')
  const result = await changePassword({
    userId: sessionResult.data.user.id,
    currentPassword,
    newPassword,
  })

  if (!result.success) {
    const status = result.error.includes('Invalid') ? 401 : 400
    return c.json({ error: result.error }, status)
  }

  deleteCookie(c, 'session_id', { path: '/' })
  return c.json({ message: 'Password changed successfully. Please log in again.' }, 200)
})

// DELETE /api/auth/account
const deleteAccountRoute = createRoute({
  method: 'delete',
  path: '/account',
  request: {
    body: {
      content: {
        'application/json': {
          schema: DeleteAccountRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: 'Account deleted successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Unauthorized',
    },
  },
})

app.openapi(deleteAccountRoute, async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  const sessionResult = await validateSession(sessionId)
  if (!sessionResult.success) {
    return c.json({ error: sessionResult.error }, 401)
  }

  const { password } = c.req.valid('json')
  const result = await deleteAccount({
    userId: sessionResult.data.user.id,
    password,
  })

  if (!result.success) {
    return c.json({ error: result.error }, 401)
  }

  deleteCookie(c, 'session_id', { path: '/' })
  return c.json({ message: 'Account deleted successfully' }, 200)
})

export default app
