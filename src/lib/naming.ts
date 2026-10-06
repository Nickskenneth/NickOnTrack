// "<Template name> - Week <N>", N = finished sessions from that template + 1.
export function autoName(templateName: string, finishedCount: number): string {
  return `${templateName} - Week ${finishedCount + 1}`
}
