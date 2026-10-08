export const MIN_REST_SECONDS = 5
export const MAX_REST_SECONDS = 1800

/** 150 -> "2:30" */
export function formatRest(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Whole seconds typed on the number pad. Out of range or empty -> undefined. */
export function parseRestSeconds(text: string): number | undefined {
  if (!/^\d+$/.test(text.trim())) return undefined
  const n = Number(text)
  return n >= MIN_REST_SECONDS && n <= MAX_REST_SECONDS ? n : undefined
}
