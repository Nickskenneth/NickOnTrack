# NickOnTrack

A personal, free, offline-first workout logger (PWA) for one person on an iPhone.
No backend, no accounts. All data is stored on the device (IndexedDB via Dexie).

Stack: Vite, React, TypeScript, Tailwind, Dexie, vite-plugin-pwa, HashRouter, GitHub Pages.

## Develop

```
npm install
npm run dev        # http://localhost:5173/NickOnTrack/
npm test           # unit tests (Vitest + fake-indexeddb)
npm run build      # type-check + production build
npm run preview    # serve the production build (needed to test the service worker)
npm run icons      # regenerate the app icons from scripts/generate-icons.mjs
```

## Deploy (GitHub Pages, free)

1. Create a **public** GitHub repository named exactly `NickOnTrack`
   (the name must match `base` in `vite.config.ts`; change both if you pick another name).
2. Push this project to the `main` branch.
3. Repo Settings -> Pages -> Source: **GitHub Actions**.
4. `.github/workflows/deploy.yml` builds and deploys on every push to `main`.
5. The app is served at `https://<username>.github.io/NickOnTrack/`.

No personal data is in the repo: workout data lives only on your phone.

## Install on iPhone

1. Open the URL above in **Safari**.
2. Tap Share -> **Add to Home Screen**.
3. Open it from the Home Screen icon. After the first load it works with no signal.

Updates: when a new version is deployed, a green "A new version is ready" bar appears at the
top. Tap **Update**. Updates never reload the app on their own, so they can't interrupt a set.

## Backups

Settings -> **Export backup** saves a JSON file (share sheet on iPhone: save to Files/iCloud).
**Import backup** offers Merge or Replace. The app reminds you after 14 days without a backup.
Browser storage can be cleared by the OS or the user, so back up regularly.

## Known limitations

- iOS web apps cannot reliably vibrate or play sound with a locked screen or in the background.
  The rest timer stays accurate when you return, but it may not alert you while locked.
- Screen wake lock is best-effort on iOS.
- Data lives on one device only (no sync).

## Phone test checklist

Do these on a real iPhone (Safari, then the installed Home Screen app):

- [ ] Add to Home Screen works; icon and name look right; opens full screen
- [ ] Top and bottom safe areas look right (notch / home bar); tab bar not covered
- [ ] Numeric keypad appears for weight and reps; screen does not zoom when focusing inputs
- [ ] Checking a set starts the rest timer; +15 / -15 / Skip work
- [ ] Lock the phone for a minute, unlock: the timer is correct
- [ ] Rest-end sound plays with the app open (ring switch off? check volume)
- [ ] Screen stays on during a workout (wake lock)
- [ ] Airplane mode after first load: app opens and logging works
- [ ] Force-quit mid-workout, reopen: the workout resumes with no lost sets
- [ ] Export backup shares to Files; clear data; import restores everything
