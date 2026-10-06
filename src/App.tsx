import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { getActiveSession } from './db/queries'
import UpdatePrompt from './components/UpdatePrompt'
import ExerciseDetail from './features/exercises/ExerciseDetail'
import ExercisesScreen from './features/exercises/ExercisesScreen'
import HistoryDetail from './features/history/HistoryDetail'
import HistoryScreen from './features/history/HistoryScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import ActiveWorkout from './features/workout/ActiveWorkout'
import TemplateEditor from './features/templates/TemplateEditor'
import TemplatesScreen from './features/templates/TemplatesScreen'

const tabs = [
  { to: '/', label: 'Workout' },
  { to: '/history', label: 'History' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const editing = pathname.startsWith('/templates/') || pathname.startsWith('/workout/')

  // Resume an in-progress workout when the app opens.
  useEffect(() => {
    if (pathname !== '/') return
    getActiveSession().then((s) => {
      if (s) navigate(`/workout/${s.id}`, { replace: true })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <UpdatePrompt />
      {/* Opaque cover for the iPhone status-bar area so scrolled content doesn't show behind it */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-[env(safe-area-inset-top)] bg-neutral-950" />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<TemplatesScreen />} />
          <Route path="/workout/:id" element={<ActiveWorkout />} />
          <Route path="/templates/:id" element={<TemplateEditor />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/history/:id" element={<HistoryDetail />} />
          <Route path="/exercises" element={<ExercisesScreen />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
      {!editing && (
        <nav className="fixed inset-x-0 bottom-0 flex border-t border-neutral-800 bg-neutral-950 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-1 items-center justify-center text-sm font-medium ${
                  isActive ? 'text-emerald-400' : 'text-neutral-400'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
