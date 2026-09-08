/**
 * Tiny synthesized sound effects. No audio assets: everything is an
 * oscillator envelope, so the bundle stays small and nothing has to load.
 *
 * Browsers only let an AudioContext start after a user gesture, so `unlock()`
 * is called from the first click/tap and every `play()` before that is a
 * silent no-op.
 */

export type SfxName =
  | 'tick'
  | 'go'
  | 'coin'
  | 'eat'
  | 'hit'
  | 'miss'
  | 'shoot'
  | 'success'
  | 'fail'
  | 'over'
  | 'record'
  | 'select'

interface Note {
  /** Start frequency in Hz. */
  freq: number
  /** Optional end frequency for a sweep. */
  to?: number
  /** Seconds. */
  duration: number
  type?: OscillatorType
  gain?: number
  /** Delay from the start of the effect, seconds. */
  at?: number
}

const PATTERNS: Record<SfxName, Note[]> = {
  tick: [{ freq: 880, duration: 0.07, type: 'square', gain: 0.12 }],
  go: [
    { freq: 660, duration: 0.09, type: 'square', gain: 0.14 },
    { freq: 990, duration: 0.18, type: 'square', gain: 0.14, at: 0.09 },
  ],
  coin: [
    { freq: 1046, duration: 0.06, type: 'square', gain: 0.12 },
    { freq: 1568, duration: 0.14, type: 'square', gain: 0.12, at: 0.06 },
  ],
  eat: [{ freq: 300, to: 620, duration: 0.12, type: 'triangle', gain: 0.18 }],
  hit: [{ freq: 220, to: 60, duration: 0.25, type: 'sawtooth', gain: 0.18 }],
  miss: [{ freq: 260, to: 180, duration: 0.18, type: 'square', gain: 0.1 }],
  shoot: [{ freq: 1400, to: 300, duration: 0.11, type: 'sawtooth', gain: 0.12 }],
  success: [
    { freq: 784, duration: 0.07, type: 'triangle', gain: 0.16 },
    { freq: 1046, duration: 0.07, type: 'triangle', gain: 0.16, at: 0.07 },
    { freq: 1318, duration: 0.14, type: 'triangle', gain: 0.16, at: 0.14 },
  ],
  fail: [
    { freq: 330, duration: 0.12, type: 'square', gain: 0.12 },
    { freq: 247, duration: 0.24, type: 'square', gain: 0.12, at: 0.12 },
  ],
  over: [
    { freq: 523, duration: 0.15, type: 'square', gain: 0.13 },
    { freq: 392, duration: 0.15, type: 'square', gain: 0.13, at: 0.15 },
    { freq: 330, duration: 0.15, type: 'square', gain: 0.13, at: 0.3 },
    { freq: 262, duration: 0.4, type: 'square', gain: 0.13, at: 0.45 },
  ],
  record: [
    { freq: 659, duration: 0.1, type: 'square', gain: 0.13 },
    { freq: 784, duration: 0.1, type: 'square', gain: 0.13, at: 0.1 },
    { freq: 1046, duration: 0.1, type: 'square', gain: 0.13, at: 0.2 },
    { freq: 1318, duration: 0.3, type: 'square', gain: 0.13, at: 0.3 },
  ],
  select: [{ freq: 520, to: 760, duration: 0.08, type: 'triangle', gain: 0.1 }],
}

let context: AudioContext | null = null
let enabled = true

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  return context
}

/** Call from a user gesture handler so the context is allowed to start. */
export function unlockSfx() {
  const ctx = getContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
}

export function setSfxEnabled(on: boolean) {
  enabled = on
}

export function isSfxEnabled() {
  return enabled
}

export function playSfx(name: SfxName) {
  if (!enabled) return
  const ctx = getContext()
  if (!ctx || ctx.state !== 'running') return

  const now = ctx.currentTime
  for (const note of PATTERNS[name]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const start = now + (note.at ?? 0)
    const end = start + note.duration
    const peak = note.gain ?? 0.12

    osc.type = note.type ?? 'square'
    osc.frequency.setValueAtTime(note.freq, start)
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(end + 0.02)
  }
}
