/**
 * Small seedable PRNG (mulberry32). Games take one of these instead of
 * `Math.random` so a run can be replayed deterministically in tests.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number
  /** Uniform float in [min, max). */
  range(min: number, max: number): number
  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** True with probability `p`. */
  chance(p: number): boolean
}

export function createRng(seed: number = Math.floor(Math.random() * 2 ** 32)): Rng {
  let state = seed >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  }
}
