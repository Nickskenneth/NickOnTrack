# NickOnTrack

Personal, free, offline-first workout logger (PWA). See the project spec for scope.

## Develop

```
npm install
npm run dev
```

## Deploy

Push to `main`; GitHub Actions builds and deploys to GitHub Pages
(repo settings -> Pages -> Source: GitHub Actions). The repo must be named
`NickOnTrack` to match the Vite `base` in `vite.config.ts`.

## Known limitations

- iOS PWAs cannot reliably vibrate or play sound with a locked screen or in the background.
- Wake lock support on iOS varies (best-effort).
- Browser storage can be cleared; use Settings -> Backup regularly.
- Data lives on one device only (no sync).
