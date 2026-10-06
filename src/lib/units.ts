// Weights are stored in kg; these convert to/from the user's display unit.
export type Units = 'kg' | 'lb'

const LB_PER_KG = 2.2046226218
const round1 = (n: number) => Math.round(n * 10) / 10

export function toDisplay(kg: number, units: Units): number {
  return round1(units === 'kg' ? kg : kg * LB_PER_KG)
}

export function fromDisplay(value: number, units: Units): number {
  return units === 'kg' ? value : value / LB_PER_KG
}

/** "40", "42.5" (no trailing .0). */
export function formatWeight(kg: number, units: Units): string {
  return String(toDisplay(kg, units))
}

/** Parses typed input; accepts a comma decimal. Empty/invalid -> undefined. */
export function parseNumber(text: string): number | undefined {
  const n = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : n
}
