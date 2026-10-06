// iOS only lets web audio run after a user gesture, and it re-suspends the audio
// engine whenever the app is backgrounded, interrupted or idle ('suspended' OR
// 'interrupted'). So we wake it on EVERY tap (installAudioUnlock) and again right
// before playing. playBeep() works while the app is in the foreground.
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx ??= new Ctor()
    return ctx
  } catch {
    return null
  }
}

/** Wake the audio engine. Must run inside a user gesture on iOS; safe to call often. */
export function unlockAudio(): void {
  const c = getCtx()
  if (!c) return
  if (c.state !== 'running') void c.resume().catch(() => {})
  try {
    // A silent one-sample buffer: iOS only fully unlocks audio once something has played.
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
  } catch {
    /* ignore */
  }
}

/** Call once at startup: any tap anywhere keeps the audio engine awake for later. */
export function installAudioUnlock(): void {
  for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
    document.addEventListener(type, unlockAudio, { passive: true })
  }
}

export async function playBeep(): Promise<void> {
  const c = getCtx()
  if (!c) return
  if (c.state !== 'running') {
    try {
      await c.resume()
    } catch {
      /* needs a tap first */
    }
  }
  const start = c.currentTime + 0.02
  for (let i = 0; i < 3; i++) {
    const at = start + i * 0.22
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
    osc.connect(gain).connect(c.destination)
    osc.start(at)
    osc.stop(at + 0.18)
  }
  try {
    navigator.vibrate?.(200)
  } catch {
    /* unsupported on iOS */
  }
}
