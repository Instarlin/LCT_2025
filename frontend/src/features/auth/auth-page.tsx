import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/storage/auth-store'
import { cn } from '@/lib/utils'

type FeedbackState = {
  type: 'error' | 'success'
  message: string
}

export const AuthPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)
    try {
      const result = await login(username, password)
      if (!result.success) {
        setFeedback({ type: 'error', message: result.message ?? 'Неверное имя пользователя или пароль' })
        return
      }
      setUsername('')
      setPassword('')
    } catch (error) {
      console.error('Ошибка входа', error)
      setFeedback({ type: 'error', message: 'Не удалось выполнить вход. Попробуйте снова.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async () => {
    setIsRegistering(true)
    setFeedback(null)
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUsername || !trimmedPassword) {
      setFeedback({ type: 'error', message: 'Введите имя пользователя и пароль для регистрации' })
      setIsRegistering(false)
      return
    }

    try {
      const result = await register(trimmedUsername, trimmedPassword)
      if (!result.success) {
        setFeedback({ type: 'error', message: result.message ?? 'Не удалось зарегистрироваться' })
        return
      }

      setFeedback({ type: 'success', message: 'Регистрация завершена. Выполняем вход…' })
      setUsername('')
      setPassword('')
    } catch (error) {
      console.error('Ошибка регистрации', error)
      setFeedback({ type: 'error', message: 'Не удалось зарегистрироваться. Попробуйте позже.' })
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,42,89,0.15)] backdrop-blur-xl">
        <header className="mb-8 space-y-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-sky-700">
            ACCESS CONTROL
          </span>
          <h1 className="text-2xl font-semibold text-slate-800">Добро пожаловать</h1>
          <p className="text-sm text-slate-500">
            Введите корпоративные учётные данные, чтобы открыть рабочее пространство исследований.
          </p>
        </header>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-slate-600">
              Имя пользователя
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                if (feedback) {
                  setFeedback(null)
                }
              }}
              placeholder="radiologist"
              className="border border-slate-200 bg-white/95 text-slate-800 shadow-inner hover:border-slate-400 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-600">
              Пароль
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (feedback) {
                  setFeedback(null)
                }
              }}
              placeholder="••••••••"
              className="border border-slate-200 bg-white/95 text-slate-800 shadow-inner hover:border-slate-400 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200"
              autoComplete="current-password"
            />
          </div>
          {feedback && (
            <p
              className={cn(
                'rounded-xl px-4 py-2 text-sm',
                feedback.type === 'error'
                  ? 'border border-rose-200 bg-rose-50 text-rose-600'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-600'
              )}
            >
              {feedback.message}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || isRegistering}
              className={cn(
                'w-full justify-center rounded-xl border border-sky-200 bg-sky-500/90 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:bg-sky-600 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:translate-y-0 disabled:shadow-none'
              )}
            >
              {isSubmitting ? 'Входим…' : 'Войти'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isRegistering}
              onClick={handleRegister}
              className={cn(
                'w-full justify-center rounded-xl border border-slate-200 bg-white/95 py-3 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:translate-y-0 disabled:text-slate-400'
              )}
            >
              {isRegistering ? 'Регистрируем…' : 'Зарегистрироваться'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
