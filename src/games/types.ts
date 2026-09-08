import type { FaceFrame, GestureEdges } from '../utils/gestureInput'
import type { Rng } from '../utils/rng'
import type { Difficulty } from '../store/settings'

/** Which face controls a game relies on. Drives the how-to and the ready screen. */
export type ControlKind = 'tilt' | 'move' | 'mouth' | 'smile' | 'wink' | 'blink' | 'brow'

export const CONTROL_LABEL: Record<ControlKind, string> = {
  tilt: '머리 기울이기',
  move: '얼굴 움직이기',
  mouth: '입 벌리기',
  smile: '웃기',
  wink: '윙크',
  blink: '눈 깜빡이기',
  brow: '눈썹 올리기',
}

/** Everything a game gets per tick. Positions are 0..1 in screen space. */
export interface GameInput {
  /** Seconds since the previous tick, clamped so a stall cannot teleport things. */
  dt: number
  /** Seconds of play so far (pauses excluded). */
  t: number
  /** Seconds left on the clock. */
  timeLeft: number
  frame: FaceFrame
  /** Rising edges accumulated since the previous tick. */
  edges: GestureEdges
}

/** What the HUD shows; read by React at a throttled rate. */
export interface HudState {
  score: number
  lives?: number
  maxLives?: number
  combo?: number
  /** Short status line, e.g. the current prompt. */
  label?: string
}

export interface ResultStat {
  label: string
  value: string
}

export interface GameResult {
  score: number
  stats: ResultStat[]
}

/** A running instance of a game. Pure logic, no DOM beyond the draw call. */
export interface GameEngine {
  update(input: GameInput): void
  /** `width`/`height` are logical pixels; the runner applies device scaling. */
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void
  hud(): HudState
  /** True once the game ended on its own (out of lives, etc.). */
  readonly over: boolean
  result(): GameResult
}

export interface GameCreateOptions {
  difficulty: Difficulty
  /** Speed multiplier derived from difficulty. */
  speed: number
  rng: Rng
  durationSec: number
  /** Fire-and-forget sound hook. Games never import the audio module directly. */
  sfx: (name: import('../utils/sfx').SfxName) => void
}

export interface GameDefinition {
  id: string
  title: string
  /** One line under the title in the lobby. */
  tagline: string
  description: string
  emoji: string
  /** Hex accent used for the card and canvas. */
  accent: string
  controls: ControlKind[]
  /** Bullet points on the ready screen. */
  howTo: string[]
  durationSec: number
  scoreUnit: string
  create(options: GameCreateOptions): GameEngine
}
