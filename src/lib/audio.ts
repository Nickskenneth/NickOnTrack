// iOS blocks audio until a user gesture, so unlockAudio() is called from a tap
// (completing a set). playBeep() then works while the app is in the foreground.
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

export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume().catch(() => {})
}

export function playBeep(): void {
  const c = getCtx()
  if (!c) return
  const start = c.currentTime + 0.02
  for (let i = 0; i < 3; i++) {
    const at = start + i * 0.22
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02)
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
