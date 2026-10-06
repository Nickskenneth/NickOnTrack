import { NavLink, Route, Routes } from 'react-router-dom'

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
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Placeholder title="Workout" />} />
          <Route path="/history" element={<Placeholder title="History" />} />
          <Route path="/exercises" element={<Placeholder title="Exercises" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Routes>
      </main>
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
    </div>
  )
}
