import { useRegisterSW } from 'virtual:pwa-register/react'

const HOUR = 60 * 60 * 1000

/** Registers the service worker and offers a tap-to-update banner when a new version is ready. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Installed apps stay open for days; look for new versions now and then.
      if (registration) setInterval(() => void registration.update().catch(() => {}), HOUR)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex items-center justify-between gap-3 bg-emerald-500 px-4 py-2 text-black">
      <span className="text-sm font-medium">A new version is ready.</span>
      <button
        className="min-h-11 rounded-lg bg-black/80 px-4 text-sm font-semibold text-white"
        onClick={() => void updateServiceWorker(true)}
      >
        Update
      </button>
    </div>
  )
}
