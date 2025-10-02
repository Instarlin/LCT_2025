import { create } from 'zustand'
import { useJobsStore } from '@/lib/storage/jobs-store'

type AuthResult = {
  success: boolean
  message?: string
}

type AuthState = {
  isAuthenticated: boolean
  username: string | null
  token: string | null
  login: (username: string, password: string) => Promise<AuthResult>
  register: (username: string, password: string) => Promise<AuthResult>
  logout: () => void
}

const AUTH_STORAGE_KEY = 'auth-state'

type PersistedAuthPayload = {
  token: string
  username: string | null
}

const unauthenticatedState = {
  isAuthenticated: false,
  username: null,
  token: null,
} as const satisfies Pick<AuthState, 'isAuthenticated' | 'username' | 'token'>

const readPersistedAuthState = (): Pick<AuthState, 'isAuthenticated' | 'username' | 'token'> => {
  if (typeof window === 'undefined') {
    return unauthenticatedState
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return unauthenticatedState
    }
    const parsed = JSON.parse(raw) as PersistedAuthPayload | null
    if (!parsed || typeof parsed !== 'object') {
      return unauthenticatedState
    }
    if (!parsed.token || typeof parsed.token !== 'string' || parsed.token.trim() === '') {
      return unauthenticatedState
    }
    const username = typeof parsed.username === 'string' ? parsed.username : null
    return {
      isAuthenticated: true,
      username,
      token: parsed.token,
    }
  } catch (error) {
    console.error('Не удалось восстановить данные авторизации', error)
    return unauthenticatedState
  }
}

const persistAuthState = (state: Pick<AuthState, 'isAuthenticated' | 'username' | 'token'>) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    if (!state.isAuthenticated || !state.token) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }
    const payload: PersistedAuthPayload = {
      token: state.token,
      username: state.username ?? null,
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('Не удалось сохранить данные авторизации', error)
  }
}

const initialAuthState = readPersistedAuthState()

export const useAuthStore = create<AuthState>((set) => ({
  ...initialAuthState,
  login: async (username, password) => {
    const normalizedUsername = username.trim()
    const normalizedPassword = password.trim()
    if (!normalizedUsername || !normalizedPassword) {
      return { success: false, message: 'Введите имя пользователя и пароль' }
    }
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
      })

      if (!response.ok) {
        let message = 'Не удалось выполнить вход'
        try {
          const raw = await response.clone().text()
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { message?: unknown }
              if (typeof parsed.message === 'string') {
                message = parsed.message
              } else {
                message = raw
              }
            } catch (jsonError) {
              console.error('Ответ авторизации не является JSON', jsonError)
              message = raw
            }
          }
        } catch (parseError) {
          console.error('Не удалось прочитать ответ авторизации', parseError)
        }
        return { success: false, message }
      }

      let token: string | null = null
      let backendUsername: string | null = null
      try {
        const payload = (await response.json()) as {
          access_token?: unknown
          username?: unknown
          user?: { username?: unknown }
        } | null
        if (payload && typeof payload === 'object') {
          if (typeof payload.access_token === 'string') {
            token = payload.access_token
          }
          if (typeof payload.username === 'string') {
            backendUsername = payload.username
          } else if (payload.user && typeof payload.user === 'object' && payload.user !== null) {
            const maybeUser = payload.user as { username?: unknown }
            if (typeof maybeUser.username === 'string') {
              backendUsername = maybeUser.username
            }
          }
        }
      } catch (parseError) {
        console.error('Не удалось разобрать ответ авторизации', parseError)
      }

      if (!token) {
        return {
          success: false,
          message: 'Не удалось получить токен авторизации',
        }
      }

      const finalUsername = backendUsername ?? normalizedUsername
      set({ isAuthenticated: true, username: finalUsername, token })
      persistAuthState({ isAuthenticated: true, username: finalUsername, token })
      useJobsStore.getState().reset()
      await useJobsStore.getState().fetchJobs(token, true)
      return { success: true }
    } catch (error) {
      console.error('Не удалось выполнить вход', error)
      return { success: false, message: 'Сеть недоступна. Попробуйте позже.' }
    }
  },
  register: async (username, password) => {
    const normalizedUsername = username.trim()
    const normalizedPassword = password.trim()
    if (!normalizedUsername || !normalizedPassword) {
      return { success: false, message: 'Введите имя пользователя и пароль' }
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
      })

      if (!response.ok) {
        let message = 'Не удалось зарегистрироваться'
        try {
          const raw = await response.clone().text()
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { message?: unknown }
              if (typeof parsed.message === 'string') {
                message = parsed.message
              } else {
                message = raw
              }
            } catch (jsonError) {
              console.error('Ответ регистрации не является JSON', jsonError)
              message = raw
            }
          }
        } catch (parseError) {
          console.error('Не удалось прочитать ответ регистрации', parseError)
        }
        return { success: false, message }
      }

      let token: string | null = null
      let backendUsername: string | null = null
      try {
        const payload = (await response.json()) as {
          access_token?: unknown
          username?: unknown
          user?: { username?: unknown }
        } | null
        if (payload && typeof payload === 'object') {
          if (typeof payload.access_token === 'string') {
            token = payload.access_token
          }
          if (typeof payload.username === 'string') {
            backendUsername = payload.username
          } else if (payload.user && typeof payload.user === 'object' && payload.user !== null) {
            const maybeUser = payload.user as { username?: unknown }
            if (typeof maybeUser.username === 'string') {
              backendUsername = maybeUser.username
            }
          }
        }
      } catch (parseError) {
        console.error('Не удалось разобрать ответ регистрации', parseError)
      }

      if (!token) {
        const loginResult = await useAuthStore
          .getState()
          .login(normalizedUsername, normalizedPassword)
        if (!loginResult.success) {
          return {
            success: false,
            message: loginResult.message ?? 'Не удалось получить токен авторизации',
          }
        }
        return { success: true }
      }

      const finalUsername = backendUsername ?? normalizedUsername
      set({
        isAuthenticated: true,
        username: finalUsername,
        token,
      })
      persistAuthState({ isAuthenticated: true, username: finalUsername, token })
      useJobsStore.getState().reset()
      await useJobsStore.getState().fetchJobs(token, true)

      return { success: true }
    } catch (error) {
      console.error('Не удалось зарегистрировать пользователя', error)
      return { success: false, message: 'Сеть недоступна. Попробуйте позже.' }
    }
  },
  logout: () => {
    useJobsStore.getState().reset()
    set(unauthenticatedState)
    persistAuthState(unauthenticatedState)
  },
}))

if (initialAuthState.isAuthenticated && initialAuthState.token) {
  useJobsStore.getState().reset()
  void useJobsStore.getState().fetchJobs(initialAuthState.token, true)
}
