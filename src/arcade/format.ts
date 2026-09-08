export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
}

/** Is the nose inside the comfortable center of the frame? */
export function isFaceAligned(frame: { face: boolean; headX: number; headY: number }): boolean {
  return frame.face && frame.headX > 0.28 && frame.headX < 0.72 && frame.headY > 0.2 && frame.headY < 0.8
}
