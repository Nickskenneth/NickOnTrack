import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { db } from './db/db'
import { seedIfNeeded } from './db/seed'
import './index.css'

// Ask the browser not to evict our data (best-effort; may be ignored).
void navigator.storage?.persist?.().catch(() => {})

// Seed on first run (no-op afterwards), then render.
seedIfNeeded(db)
  .catch((err) => console.error('Seeding failed', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </StrictMode>,
    )
  })
