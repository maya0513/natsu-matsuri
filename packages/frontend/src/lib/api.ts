const API_BASE_URL = '/api'

export type User = {
  id: string
  email: string
  createdAt: string
  updatedAt: string
}

export type ApiResponse<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(error.error || 'Request failed', response.status)
  }

  return response.json()
}

export const api = {
  register: async (email: string, password: string): Promise<{ user: User }> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })

    return handleResponse<{ user: User }>(response)
  },

  login: async (email: string, password: string): Promise<{ user: User }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })

    return handleResponse<{ user: User }>(response)
  },

  logout: async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    await handleResponse<{ message: string }>(response)
  },

  me: async (): Promise<{ user: User }> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    })

    return handleResponse<{ user: User }>(response)
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: 'include',
    })

    return handleResponse<{ message: string }>(response)
  },

  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
      credentials: 'include',
    })

    return handleResponse<{ message: string }>(response)
  },
}
