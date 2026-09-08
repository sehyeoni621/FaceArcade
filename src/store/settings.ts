import { DEFAULT_THRESHOLDS, type GestureThresholds } from '../utils/gestureInput'
import { createPersistedStore } from './storage'

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface Settings {
  /** Mirror the camera like a selfie. Almost always what people expect. */
  mirror: boolean
  sound: boolean
  /** Draw the landmark wireframe over the face during play. */
  showMesh: boolean
  /** `null` picks the default front camera. */
  cameraDeviceId: string | null
  difficulty: Difficulty
  thresholds: GestureThresholds
}

export const DEFAULT_SETTINGS: Settings = {
  mirror: true,
  sound: true,
  showMesh: false,
  cameraDeviceId: null,
  difficulty: 'normal',
  thresholds: { ...DEFAULT_THRESHOLDS },
}

/** Speed multipliers per difficulty, shared by every game. */
export const DIFFICULTY_SPEED: Record<Difficulty, number> = {
  easy: 0.8,
  normal: 1,
  hard: 1.25,
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
}

/** Slider ranges for the sensitivity settings. */
export const THRESHOLD_RANGE: Record<keyof GestureThresholds, { min: number; max: number; step: number }> = {
  smile: { min: 0.2, max: 0.8, step: 0.05 },
  mouthOpen: { min: 0.15, max: 0.7, step: 0.05 },
  blink: { min: 0.3, max: 0.8, step: 0.05 },
  tilt: { min: 6, max: 25, step: 1 },
}

export const settingsStore = createPersistedStore<Settings>(
  'facearcade:settings:v1',
  DEFAULT_SETTINGS,
  (raw) => {
    const partial = (raw ?? {}) as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...partial,
      thresholds: { ...DEFAULT_THRESHOLDS, ...(partial.thresholds ?? {}) },
    }
  },
)

export function useSettings(): Settings {
  return settingsStore.use()
}

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((current) => ({ ...current, ...patch }))
}

export function updateThreshold(name: keyof GestureThresholds, value: number) {
  settingsStore.set((current) => ({
    ...current,
    thresholds: { ...current.thresholds, [name]: value },
  }))
}

export function resetSettings() {
  settingsStore.set({ ...DEFAULT_SETTINGS, thresholds: { ...DEFAULT_THRESHOLDS } })
}
