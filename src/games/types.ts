import type { Localized, LocalizedList, StringKey, T } from '../i18n/core'
import type { FaceFrame, GestureEdges } from '../utils/gestureInput'
import type { Rng } from '../utils/rng'
import type { Difficulty } from '../store/settings'

/** Which face controls a game relies on. Drives the how-to and the ready screen. */
export type ControlKind = 'tilt' | 'move' | 'mouth' | 'smile' | 'wink' | 'blink' | 'brow'

/** Translation keys, resolved wherever the labels are rendered. */
export const CONTROL_LABEL: Record<ControlKind, StringKey> = {
  tilt: 'control.tilt',
  move: 'control.move',
  mouth: 'control.mouth',
  smile: 'control.smile',
  wink: 'control.wink',
  blink: 'control.blink',
  brow: 'control.brow',
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
  /**
   * Translator bound to the current language. Engines label their result stats
   * and draw prompt text, so they need it as much as the React tree does.
   */
  t: T
}

/**
 * A game as authored: every player-visible string carries both languages.
 * Screens never read this directly - they get a ResolvedGame from useGames(),
 * so game.title stays a plain string at the call site.
 */
export interface GameDefinition {
  id: string
  title: Localized
  /** One line under the title in the lobby. */
  tagline: Localized
  description: Localized
  emoji: string
  /** Hex accent used for the card and canvas. */
  accent: string
  controls: ControlKind[]
  /** Bullet points on the ready screen. */
  howTo: LocalizedList
  durationSec: number
  scoreUnit: Localized
  create(options: GameCreateOptions): GameEngine
}

/** A GameDefinition flattened into one language. */
export interface ResolvedGame
  extends Omit<GameDefinition, 'title' | 'tagline' | 'description' | 'howTo' | 'scoreUnit'> {
  title: string
  tagline: string
  description: string
  howTo: string[]
  scoreUnit: string
}
