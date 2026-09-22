import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import axios from 'axios'
import {
  Activity,
  BarChart3,
  Dumbbell,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const STORAGE_KEY = 'spartan-auth-session'
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const api = axios.create({ baseURL: API_BASE })

type Role = 'entrenador' | 'alumno'

type SessionUser = {
  id: string
  email?: string
  rol: Role
  nombre: string
  debe_cambiar_password: boolean
  entrenadorId?: string | null
}

type SessionState = {
  token: string
  user: SessionUser
}

type AuthContextValue = {
  session: SessionState | null
  setSession: React.Dispatch<React.SetStateAction<SessionState | null>>
}

type StudentItem = {
  id: string
  email: string
  nombre: string
  apellido?: string | null
  whatsapp?: string | null
  plan?: string | null
  horario?: string | null
  activo: boolean
}

type ExerciseItem = {
  id: string
  nombre: string
  grupo_muscular: string
  tecnica?: string | null
  errores_comunes?: string | null
  alternativas?: string | null
  video_url?: string | null
  embedding?: boolean | null
  activo: boolean
}

type RoutineExerciseSelection = {
  exerciseId: string
  nombre: string
  series: number
  reps: number
  weight: number
}

type RoutineExerciseItem = {
  id: string
  exerciseId: string
  nombre: string
  grupo_muscular?: string
  seriesPlanificadas: number
  repeticionesPlanificadas: number
  pesoPlanificado: number
  activo: boolean
}

type ExecutionHistoryItem = {
  id: string
  routineExerciseId: string
  alumnoId: string
  fecha: string
  pesoEjecutado: number
  repeticionesEjecutadas: number
  seriesEjecutadas?: number | null
  rpe?: number | null
  createdAt: string
}

const normalizeStudent = (payload: any): StudentItem => ({
  id: payload.id,
  email: payload.email ?? '',
  nombre: payload.nombre ?? 'Alumno',
  apellido: payload.apellido ?? null,
  whatsapp: payload.whatsapp ?? null,
  plan: payload.plan ?? null,
  horario: payload.horario ?? null,
  activo: payload.activo ?? true,
})

const normalizeExercise = (payload: any): ExerciseItem => ({
  id: payload.id,
  nombre: payload.nombre ?? 'Ejercicio',
  grupo_muscular: payload.grupoMuscular ?? payload.grupo_muscular ?? 'General',
  tecnica: payload.tecnica ?? null,
  errores_comunes: payload.erroresComunes ?? payload.errores_comunes ?? null,
  alternativas: payload.alternativas ?? null,
  video_url: payload.videoUrl ?? payload.video_url ?? null,
  embedding: payload.embedding ? true : false,
  activo: payload.activo ?? true,
})

const chartData = [
  { date: 'Lun', plan: 60, executed: 55 },
  { date: 'Mar', plan: 60, executed: 60 },
  { date: 'Mié', plan: 65, executed: 62 },
  { date: 'Jue', plan: 65, executed: 68 },
  { date: 'Vie', plan: 70, executed: 70 },
]

const normalizeUser = (payload: any): SessionUser => ({
  id: payload.id,
  email: payload.email ?? undefined,
  rol: payload.rol ?? 'alumno',
  nombre: payload.nombre ?? 'Usuario',
  debe_cambiar_password: Boolean(payload.debe_cambiar_password ?? payload.debe_cambiar_password === true),
  entrenadorId: payload.entrenadorId ?? payload.entrenador_id ?? null,
})

const getStoredSession = (): SessionState | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionState
  } catch {
    return null
  }
}

const storeSession = (session: SessionState | null) => {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

const defaultRouteForRole = (role: Role) => (role === 'entrenador' ? '/trainer/dashboard' : '/student/today')

function SpartanLogo({ size = 72, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo_gym.svg"
      alt="Spartan App logo"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(() => getStoredSession())

  useEffect(() => {
    if (session?.token) {
      api.defaults.headers.common.Authorization = `Bearer ${session.token}`
    } else {
      delete api.defaults.headers.common.Authorization
    }
  }, [session])

  const value = useMemo(() => ({ session, setSession }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

function AuthGate() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (session.user.debe_cambiar_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}

function RoleLayout() {
  const navigate = useNavigate()
  const { session, setSession } = useAuth()
  const role = session?.user.rol ?? 'alumno'

  const logout = () => {
    setSession(null)
    storeSession(null)
    navigate('/login')
  }

  const navItems = role === 'entrenador'
    ? [
        { to: '/trainer/dashboard', label: 'Dashboard', icon: Activity },
        { to: '/trainer/students', label: 'Alumnos', icon: Users },
        { to: '/trainer/exercises', label: 'Ejercicios', icon: Dumbbell },
        { to: '/trainer/routines', label: 'Rutinas', icon: ShieldCheck },
      ]
    : [
        { to: '/student/today', label: 'Hoy', icon: Activity },
        { to: '/student/history', label: 'Historial', icon: BarChart3 },
        { to: '/student/chat', label: 'Chat', icon: MessageSquareText },
      ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <aside className="fixed inset-y-0 left-0 w-72 border-r border-slate-800 bg-slate-900/90 p-6 backdrop-blur">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-950/80 shadow-lg shadow-red-900/20">
            <SpartanLogo size={44} className="h-full w-full" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Spartan</p>
            <h1 className="text-xl font-semibold">App</h1>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sesión</p>
          <p className="mt-2 text-lg font-semibold">{session?.user.nombre}</p>
          <p className="text-sm text-slate-400">{session?.user.rol}</p>
        </div>

        <button type="button" onClick={logout} className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-red-500 hover:text-red-400">
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </aside>

      <main className="ml-72 min-h-screen p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user } = response.data
      const nextSession: SessionState = {
        token,
        user: normalizeUser({ ...user, debe_cambiar_password: Boolean(user.debe_cambiar_password) }),
      }
      setSession(nextSession)
      storeSession(nextSession)
      navigate(defaultRouteForRole(nextSession.user.rol))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/30">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-950/80 shadow-2xl shadow-red-900/20">
            <SpartanLogo size={88} className="h-full w-full" />
          </div>
          <h1 className="text-3xl font-bold text-white">Spartan App</h1>
          <p className="mt-2 text-sm text-slate-400">Ingresá a tu panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input data-testid="login-input-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500" placeholder="tu-email@dominio.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
            <input data-testid="login-input-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-red-500" placeholder="••••••••" />
          </div>

          {error ? <p data-testid="login-error-message" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

          <button data-testid="login-button-submit" type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { session, setSession } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/change-password', { new_password: newPassword })
      if (!session) return
      const refreshed = {
        token: session.token,
        user: { ...session.user, debe_cambiar_password: false },
      }
      setSession(refreshed)
      storeSession(refreshed)
      navigate(defaultRouteForRole(refreshed.user.rol))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div data-testid="modal-force-password-change" className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-slate-900 p-8 shadow-2xl shadow-red-950/30">
        <div className="mb-6 flex items-center gap-3 text-red-400">
          <LockKeyhole size={28} />
          <h2 className="text-2xl font-bold text-white">Cambiar contraseña</h2>
        </div>
        <p className="mb-6 text-sm text-slate-300">Esta contraseña es obligatoria para continuar y completar tu primer inicio de sesión.</p>
        <form onSubmit={submit} className="space-y-4">
          <input data-testid="change-password-input-new" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white" placeholder="Nueva contraseña" />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button data-testid="change-password-button-submit" type="submit" disabled={loading} className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {loading ? 'Actualizando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-4 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-red-300">{detail}</p>
    </div>
  )
}

function TrainerDashboard() {
  const [stats, setStats] = useState({ students: 0, routines: 0, executions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [studentsResponse, routinesResponse, executionsResponse] = await Promise.all([
          api.get('/students'),
          api.get('/routines'),
          api.get('/executions'),
        ])

        setStats({
          students: studentsResponse.data.length,
          routines: routinesResponse.data.length,
          executions: executionsResponse.data.length,
        })
      } catch {
        setStats({ students: 0, routines: 0, executions: 0 })
      } finally {
        setLoading(false)
      }
    }

    void loadStats()
  }, [])

  const executionRate = stats.students > 0 ? Math.min(100, Math.round((stats.executions / Math.max(stats.students, 1)) * 20)) : 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-red-400">Resumen</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Dashboard del entrenador</h2>
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">Cargando métricas...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Alumnos activos" value={String(stats.students)} detail="alumnos vinculados" />
            <StatCard title="Rutinas creadas" value={String(stats.routines)} detail="planes activos" />
            <StatCard title="Ejecuciones" value={`${executionRate}%`} detail="cumplimiento" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Progreso semanal</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#334155" strokeDasharray="5 5" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Line type="monotone" dataKey="plan" stroke="#f87171" strokeWidth={2} />
                  <Line type="monotone" dataKey="executed" stroke="#facc15" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellido: '', whatsapp: '', plan: '3x_semana', horario: '' })

  const loadStudents = async () => {
    try {
      setLoading(true)
      const response = await api.get('/students')
      setStudents(response.data.map(normalizeStudent))
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudieron cargar los alumnos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStudents()
  }, [])

  const removeStudent = async (id: string) => {
    try {
      await api.delete(`/students/${id}`)
      setStudents((current) => current.filter((student) => student.id !== id))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudo dar de baja al alumno')
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const response = await api.post('/students', {
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        apellido: form.apellido,
        whatsapp: form.whatsapp,
        plan: form.plan,
        horario: form.horario,
      })
      setStudents((current) => [normalizeStudent(response.data), ...current])
      setForm({ email: '', password: '', nombre: '', apellido: '', whatsapp: '', plan: '3x_semana', horario: '' })
      setShowForm(false)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudo crear el alumno')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-red-400">Alumnos</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Gestión de alumnos</h2>
        </div>
        <button data-testid="student-button-add" onClick={() => setShowForm((current) => !current)} className="rounded-xl bg-red-600 px-4 py-2.5 font-medium text-white">+ Nuevo alumno</button>
      </div>

      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      {showForm ? (
        <form data-testid="student-modal-form" onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 md:grid-cols-2">
          <input data-testid="student-input-email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
          <input data-testid="student-input-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Contraseña inicial" type="password" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
          <input data-testid="student-input-nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Nombre" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
          <input data-testid="student-input-apellido" value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} placeholder="Apellido" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
          <input data-testid="student-input-whatsapp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="WhatsApp" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
          <select data-testid="student-select-plan" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white">
            <option value="2x_semana">2x semana</option>
            <option value="3x_semana">3x semana</option>
            <option value="5x_semana">5x semana</option>
          </select>
          <input data-testid="student-input-horario" value={form.horario} onChange={(event) => setForm({ ...form, horario: event.target.value })} placeholder="Horario" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white md:col-span-2" />
          <button data-testid="student-button-save" type="submit" className="md:col-span-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white">Guardar alumno</button>
        </form>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">Cargando alumnos...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {students.map((student) => (
            <div key={student.id} data-testid={`student-card-${student.id}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold text-white">{student.nombre} {student.apellido ?? ''}</p>
                  <p className="text-sm text-slate-400">{student.email}</p>
                </div>
                <button data-testid={`student-button-delete-${student.id}`} onClick={() => removeStudent(student.id)} className="rounded-lg border border-red-500/40 p-2 text-red-300 hover:bg-red-500/10" aria-label="Eliminar alumno">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>Plan: <span className="text-white">{student.plan ?? 'Sin plan'}</span></p>
                <p>Horario: <span className="text-white">{student.horario ?? 'Sin horario'}</span></p>
                <p>Estado: <span className={student.activo ? 'text-emerald-400' : 'text-red-400'}>{student.activo ? 'Activo' : 'Dado de baja'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    grupo_muscular: '',
    video_url: '',
    tecnica: '',
    errores_comunes: '',
    alternativas: '',
  })

  const loadExercises = async () => {
    try {
      setLoading(true)
      const response = await api.get('/exercises')
      setExercises(response.data.map(normalizeExercise))
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudieron cargar los ejercicios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExercises()
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const response = await api.post('/exercises', {
        nombre: form.nombre,
        grupo_muscular: form.grupo_muscular,
        video_url: form.video_url || null,
        tecnica: form.tecnica || null,
        errores_comunes: form.errores_comunes || null,
        alternativas: form.alternativas || null,
      })
      setExercises((current) => [normalizeExercise(response.data), ...current])
      setForm({ nombre: '', grupo_muscular: '', video_url: '', tecnica: '', errores_comunes: '', alternativas: '' })
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudo crear el ejercicio')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-red-400">Biblioteca</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Ejercicios</h2>
      </div>

      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 md:grid-cols-2">
        <input data-testid="exercise-input-nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Nombre" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white md:col-span-2" />
        <input data-testid="exercise-input-grupo" value={form.grupo_muscular} onChange={(event) => setForm({ ...form, grupo_muscular: event.target.value })} placeholder="Grupo muscular" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
        <input value={form.video_url} onChange={(event) => setForm({ ...form, video_url: event.target.value })} placeholder="Video URL (opcional)" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
        <input data-testid="exercise-input-tecnica" value={form.tecnica} onChange={(event) => setForm({ ...form, tecnica: event.target.value })} placeholder="Técnica" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white md:col-span-2" />
        <textarea data-testid="exercise-input-errores" value={form.errores_comunes} onChange={(event) => setForm({ ...form, errores_comunes: event.target.value })} placeholder="Errores comunes" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white md:col-span-2" rows={3} />
        <textarea data-testid="exercise-input-alternativas" value={form.alternativas} onChange={(event) => setForm({ ...form, alternativas: event.target.value })} placeholder="Alternativas" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white md:col-span-2" rows={3} />
        <button data-testid="exercise-button-save" type="submit" className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white md:col-span-2">Guardar ejercicio</button>
      </form>

      {loading ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">Cargando ejercicios...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{exercise.nombre}</h3>
                  <p className="text-sm text-slate-400">{exercise.grupo_muscular}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${exercise.embedding ? 'bg-emerald-500/10 text-emerald-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
                  {exercise.embedding ? 'Indexado' : 'Pendiente'}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{exercise.tecnica ?? 'Sin técnica especificada.'}</p>
              <p className="mt-3 text-sm text-slate-400">Errores: {exercise.errores_comunes ?? 'Sin errores comunes'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoutinesPage() {
  const [students, setStudents] = useState<StudentItem[]>([])
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [studentId, setStudentId] = useState('')
  const [routineName, setRoutineName] = useState('Rutina semanal')
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [series, setSeries] = useState('4')
  const [reps, setReps] = useState('8')
  const [weight, setWeight] = useState('60')
  const [items, setItems] = useState<RoutineExerciseSelection[]>([])
  const [savedRoutines, setSavedRoutines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadStudents = async () => {
    const response = await api.get('/students')
    const next = response.data.map(normalizeStudent)
    setStudents(next)
    if (next[0] && !studentId) {
      setStudentId(next[0].id)
    }
  }

  const loadExercises = async () => {
    const response = await api.get('/exercises')
    setExercises(response.data.map(normalizeExercise))
    if (response.data[0]) {
      setSelectedExerciseId(response.data[0].id)
    }
  }

  const loadRoutines = async (selectedStudentId: string) => {
    if (!selectedStudentId) return
    const response = await api.get('/routines', { params: { student_id: selectedStudentId } })
    setSavedRoutines(response.data)
  }

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadStudents(), loadExercises()])
      } catch (err: any) {
        setError(err.response?.data?.message ?? 'No se pudieron cargar los datos')
      }
    })()
  }, [])

  useEffect(() => {
    if (studentId) {
      void loadRoutines(studentId)
    }
  }, [studentId])

  const addExerciseToRoutine = () => {
    const exercise = exercises.find((item) => item.id === selectedExerciseId)
    if (!exercise) return
    setItems((current) => [
      ...current,
      {
        exerciseId: exercise.id,
        nombre: exercise.nombre,
        series: Number(series || 0),
        reps: Number(reps || 0),
        weight: Number(weight || 0),
      },
    ])
  }

  const saveRoutine = async () => {
    if (!studentId || !items.length) {
      setError('Seleccioná un alumno y al menos un ejercicio')
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/routines', {
        alumno_id: studentId,
        nombre: routineName || 'Rutina semanal',
        exercises: items.map((item) => ({
          exercise_id: item.exerciseId,
          series_planificadas: item.series,
          repeticiones_planificadas: item.reps,
          peso_planificado: item.weight,
        })),
      })
      setItems([])
      setError('')
      setRoutineName('Rutina semanal')
      await loadRoutines(studentId)
      console.log('rutina creada', response.data)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudo guardar la rutina')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-red-400">Planificación</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Rutinas</h2>
      </div>

      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-slate-300">Alumno</label>
          <select data-testid="routine-select-student" value={studentId} onChange={(event) => setStudentId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white">
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.nombre} {student.apellido ?? ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Nombre</label>
          <input value={routineName} onChange={(event) => setRoutineName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white">
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>{exercise.nombre}</option>
            ))}
          </select>
          <input value={series} onChange={(event) => setSeries(event.target.value)} type="number" min={1} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" placeholder="Series" />
          <input value={reps} onChange={(event) => setReps(event.target.value)} type="number" min={1} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" placeholder="Reps" />
          <input value={weight} onChange={(event) => setWeight(event.target.value)} type="number" min={0} step="0.5" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" placeholder="Peso" />
        </div>
        <button type="button" onClick={addExerciseToRoutine} className="mt-4 rounded-xl bg-slate-800 px-4 py-2.5 font-medium text-white">Agregar ejercicio</button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item.exerciseId}-${index}`} data-testid={`routine-exercise-item-${item.exerciseId}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div>
              <p className="font-medium text-white">{item.nombre}</p>
              <p className="text-sm text-slate-400">{item.series} series · {item.reps} repeticiones · {item.weight} kg</p>
            </div>
            <button type="button" onClick={() => setItems((current) => current.filter((_, idx) => idx !== index))} className="rounded-lg border border-red-500/40 p-2 text-red-300">Eliminar</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={saveRoutine} disabled={loading || !items.length} className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? 'Guardando...' : 'Guardar rutina'}
      </button>

      {savedRoutines.length ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h3 className="mb-3 text-lg font-semibold text-white">Rutinas previas</h3>
          <div className="space-y-2">
            {savedRoutines.map((routine) => (
              <div key={routine.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
                {routine.nombre}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StudentTodayPage() {
  const [items, setItems] = useState<RoutineExerciseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRoutine = async () => {
    try {
      setLoading(true)
      const routinesResponse = await api.get('/routines')
      const latestRoutine = routinesResponse.data?.[0]
      if (!latestRoutine) {
        setItems([])
        return
      }

      const exercisesResponse = await api.get(`/routines/${latestRoutine.id}/exercises`)
      setItems(exercisesResponse.data.map((item: any) => ({
        id: item.id,
        exerciseId: item.exerciseId,
        nombre: item.nombre,
        grupo_muscular: item.grupoMuscular,
        seriesPlanificadas: Number(item.seriesPlanificadas),
        repeticionesPlanificadas: Number(item.repeticionesPlanificadas),
        pesoPlanificado: Number(item.pesoPlanificado),
        activo: item.activo ?? true,
      })))
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudo cargar la rutina de hoy')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRoutine()
  }, [])

  const submitExecution = async (item: RoutineExerciseItem, formValues: { weight: string; reps: string; rpe: string }) => {
    try {
      await api.post('/executions', {
        routine_exercise_id: item.id,
        peso_ejecutado: Number(formValues.weight || item.pesoPlanificado),
        repeticiones_ejecutadas: Number(formValues.reps || item.repeticionesPlanificadas),
        series_ejecutadas: item.seriesPlanificadas,
        rpe: formValues.rpe ? Number(formValues.rpe) : null,
      })
      setSuccess('Ejecución registrada correctamente.')
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No se pudo registrar la ejecución')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-red-400">Rutina</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Hoy</h2>
      </div>

      {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}
      {success ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</p> : null}

      {loading ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">Cargando rutina...</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">Todavía no hay ejercicios asignados.</p>
      ) : (
        items.map((item) => (
          <form
            key={item.id}
            data-testid={`execution-form-${item.id}`}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
            onSubmit={async (event) => {
              event.preventDefault()
              const form = event.currentTarget
              const data = {
                weight: (form.elements.namedItem('weight') as HTMLInputElement)?.value ?? '',
                reps: (form.elements.namedItem('reps') as HTMLInputElement)?.value ?? '',
                rpe: (form.elements.namedItem('rpe') as HTMLInputElement)?.value ?? '',
              }
              await submitExecution(item, data)
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{item.nombre}</p>
                <p className="text-sm text-slate-400">{item.seriesPlanificadas} series · {item.repeticionesPlanificadas} repeticiones</p>
              </div>
              <span data-testid={`badge-discontinued-${item.id}`} className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-300">Planificado</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <input data-testid={`execution-input-weight-${item.id}`} name="weight" defaultValue={item.pesoPlanificado} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white" placeholder="Peso" />
              <input data-testid={`execution-input-reps-${item.id}`} name="reps" defaultValue={item.repeticionesPlanificadas} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white" placeholder="Reps" />
              <input data-testid={`execution-input-rpe-${item.id}`} name="rpe" placeholder="RPE" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
              <button type="submit" data-testid={`execution-button-submit-${item.id}`} className="rounded-xl bg-red-600 px-3 py-2 font-semibold text-white">Registrar</button>
            </div>
          </form>
        ))
      )}
    </div>
  )
}

function StudentHistoryPage() {
  const [history, setHistory] = useState<ExecutionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await api.get('/executions')
        setHistory(response.data)
      } catch {
        setHistory([])
      } finally {
        setLoading(false)
      }
    }
    void loadHistory()
  }, [])

  const chartData = history
    .slice()
    .reverse()
    .slice(0, 8)
    .map((item) => ({
      date: new Date(item.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
      plan: item.pesoEjecutado,
      executed: item.pesoEjecutado,
    }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-red-400">Historial</p>
        <h2 className="mt-2 text-3xl font-bold text-white">progreso por ejercicio</h2>
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">Cargando historial...</p>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.length ? chartData : chartData}>
                <CartesianGrid stroke="#334155" strokeDasharray="5 5" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="plan" stroke="#f87171" strokeWidth={2} />
                <Line type="monotone" dataKey="executed" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentChatPage() {
  const [messages, setMessages] = useState([
    { type: 'bot', text: '¿Qué ejercicio necesitas revisar hoy?' },
  ])
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!value.trim()) return

    const nextQuestion = value.trim()
    setMessages((current) => [...current, { type: 'user', text: nextQuestion }])
    setValue('')
    setLoading(true)

    try {
      const response = await api.post('/chat', { pregunta: nextQuestion })
      setMessages((current) => [...current, { type: 'bot', text: response.data.respuesta }])
    } catch (err: any) {
      setMessages((current) => [...current, { type: 'bot', text: err.response?.data?.message ?? 'No se pudo procesar la consulta.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-red-400">Asistente</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Chat RAG</h2>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={`${message.type}-${index}`} className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.type === 'user' ? 'ml-auto bg-red-600 text-white' : 'bg-slate-800 text-slate-100'}`} data-testid={message.type === 'user' ? 'chat-message-user' : 'chat-message-bot'}>
              {message.text}
            </div>
          ))}
          {loading ? <div className="max-w-[80%] rounded-2xl bg-slate-800 px-4 py-3 text-slate-100">Pensando...</div> : null}
        </div>

        <div className="mt-5 flex gap-3">
          <input data-testid="chat-input-query" value={value} onChange={(event) => setValue(event.target.value)} className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white" placeholder="Escribí tu consulta" />
          <button data-testid="chat-button-send" type="button" onClick={send} disabled={loading} className="rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">Enviar</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { session, setSession } = useAuth()

  useEffect(() => {
    const loadProfile = async () => {
      const current = getStoredSession()
      if (!current?.token) return
      try {
        const response = await api.get('/auth/me')
        const user = normalizeUser(response.data)
        const next: SessionState = { token: current.token, user }
        setSession(next)
        storeSession(next)
      } catch {
        setSession(null)
        storeSession(null)
      }
    }
    void loadProfile()
  }, [setSession])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route element={<AuthGate />}>
          <Route element={<RoleLayout />}>
            <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
            <Route path="/trainer/students" element={<StudentsPage />} />
            <Route path="/trainer/exercises" element={<ExercisesPage />} />
            <Route path="/trainer/routines" element={<RoutinesPage />} />
            <Route path="/student/today" element={<StudentTodayPage />} />
            <Route path="/student/history" element={<StudentHistoryPage />} />
            <Route path="/student/chat" element={<StudentChatPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to={session ? defaultRouteForRole(session.user.rol) : '/login'} replace />} />
        <Route path="*" element={<Navigate to={session ? defaultRouteForRole(session.user.rol) : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function RootApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignoramos errores de registro en entornos no soportados.
      })
    }
  }, [])

  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}
