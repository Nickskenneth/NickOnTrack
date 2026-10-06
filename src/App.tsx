import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { getActiveSession } from './db/queries'
import ActiveWorkout from './features/workout/ActiveWorkout'
import TemplateEditor from './features/templates/TemplateEditor'
import TemplatesScreen from './features/templates/TemplatesScreen'

const tabs = [
  { to: '/', label: 'Workout' },
  { to: '/history', label: 'History' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/settings', label: 'Settings' },
]

function Placeholder({ title }: { title: string }) {
  return <h1 className="p-4 text-2xl font-bold">{title}</h1>
}

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
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<TemplatesScreen />} />
          <Route path="/workout/:id" element={<ActiveWorkout />} />
          <Route path="/templates/:id" element={<TemplateEditor />} />
          <Route path="/history" element={<Placeholder title="History" />} />
          <Route path="/exercises" element={<Placeholder title="Exercises" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
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
