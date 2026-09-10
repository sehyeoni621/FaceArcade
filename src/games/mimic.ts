import {
  drawBar,
  drawPopups,
  drawText,
  FONT_DISPLAY,
  lerp,
  neonCircle,
  neonStroke,
  roundRect,
  updatePopups,
  withAlpha,
  type Popup,
} from './draw'
import type { StringKey } from '../i18n/core'
import type { FaceFrame } from '../utils/gestureInput'
import type { GameCreateOptions, GameDefinition, GameEngine, GameInput, HudState } from './types'

const ACCENT = '#b06cff'
const OK_COLOR = '#3dff7a'
const FAIL_COLOR = '#ff3fd6'
const MAX_LIVES = 3
/** How long the gesture must be held before it counts. */
const HOLD_SEC = 0.22

interface Prompt {
  id: string
  emoji: string
  /** Resolved at draw time, so a language switch mid-run reads correctly. */
  labelKey: StringKey
  matches: (frame: FaceFrame) => boolean
}

const PROMPTS: Prompt[] = [
  { id: 'smile', emoji: '😄', labelKey: 'prompt.smile', matches: (f) => f.smiling },
  { id: 'mouth', emoji: '😮', labelKey: 'prompt.mouth', matches: (f) => f.mouthOpened },
  { id: 'blink', emoji: '😑', labelKey: 'prompt.blink', matches: (f) => f.eyesClosed },
  { id: 'wink-left', emoji: '😉', labelKey: 'prompt.winkLeft', matches: (f) => f.winkLeft },
  { id: 'wink-right', emoji: '🙃', labelKey: 'prompt.winkRight', matches: (f) => f.winkRight },
  { id: 'tilt-left', emoji: '↙️', labelKey: 'prompt.tiltLeft', matches: (f) => f.tiltDir === 'left' },
  { id: 'tilt-right', emoji: '↘️', labelKey: 'prompt.tiltRight', matches: (f) => f.tiltDir === 'right' },
  { id: 'brow', emoji: '🤨', labelKey: 'prompt.brow', matches: (f) => f.browRaised },
]

type Phase = 'prompt' | 'success' | 'fail'

/**
 * Mimic: Simon-says with faces. A gesture card appears; hold that expression
 * before the bar runs out. The window shrinks every round.
 */
class Mimic implements GameEngine {
  over = false

  private score = 0
  private lives = MAX_LIVES
  private round = 0
  private cleared = 0
  private failed = 0
  private combo = 0
  private bestCombo = 0
  private phase: Phase = 'prompt'
  private phaseTimer = 0
  private prompt: Prompt = PROMPTS[0]
  private window = 3
  private elapsed = 0
  private hold = 0
  private popups: Popup[] = []
  private lastFrame: FaceFrame | null = null
  private fastest = Infinity

  private readonly options: GameCreateOptions

  constructor(options: GameCreateOptions) {
    this.options = options
    this.nextPrompt(null)
  }

  private nextPrompt(frame: FaceFrame | null) {
    // Prefer a gesture the player is not already making, so a held smile
    // cannot clear a "smile" card for free.
    const candidates = PROMPTS.filter((p) => p.id !== this.prompt.id && !(frame && p.matches(frame)))
    const pool = candidates.length > 0 ? candidates : PROMPTS.filter((p) => p.id !== this.prompt.id)
    this.prompt = this.options.rng.pick(pool)
    this.round += 1
    this.window = Math.max(1.1, 3.2 - this.round * 0.12) / this.options.speed
    this.elapsed = 0
    this.hold = 0
    this.phase = 'prompt'
  }

  update({ dt, frame }: GameInput): void {
    if (this.over) return
    this.lastFrame = frame

    if (this.phase !== 'prompt') {
      this.phaseTimer -= dt
      if (this.phaseTimer <= 0) this.nextPrompt(frame)
      updatePopups(this.popups, dt)
      return
    }

    this.elapsed += dt
    if (frame.face && this.prompt.matches(frame)) {
      this.hold += dt
      if (this.hold >= HOLD_SEC) this.succeed()
    } else {
      this.hold = Math.max(0, this.hold - dt * 2)
    }

    if (this.phase === 'prompt' && this.elapsed >= this.window) this.fail()

    updatePopups(this.popups, dt)
  }

  private succeed() {
    const remaining = Math.max(0, 1 - this.elapsed / this.window)
    this.combo += 1
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    this.cleared += 1
    this.fastest = Math.min(this.fastest, this.elapsed)
    const multiplier = 1 + Math.min(4, Math.floor(this.combo / 4))
    const gain = (100 + Math.round(remaining * 150)) * multiplier
    this.score += gain
    this.popups.push({
      x: 0.5,
      y: 0.62,
      text: multiplier > 1 ? `+${gain} x${multiplier}` : `+${gain}`,
      color: OK_COLOR,
      age: 0,
      life: 0.9,
    })
    this.phase = 'success'
    this.phaseTimer = 0.55
    this.options.sfx('success')
  }

  private fail() {
    this.lives -= 1
    this.failed += 1
    this.combo = 0
    this.phase = 'fail'
    this.phaseTimer = 0.8
    this.options.sfx('fail')
    if (this.lives <= 0) this.over = true
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const unit = Math.min(w, h) / 720
    const cx = w / 2
    const cardY = h * 0.2

    const color =
      this.phase === 'success' ? OK_COLOR : this.phase === 'fail' ? FAIL_COLOR : ACCENT

    // Prompt card.
    const cardW = Math.min(w * 0.8, 420 * unit)
    const cardH = 150 * unit
    ctx.save()
    roundRect(ctx, cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 18 * unit)
    ctx.fillStyle = withAlpha('#080824', 0.78)
    ctx.fill()
    neonStroke(ctx, color, 2.5 * unit, 22)
    ctx.restore()

    drawText(ctx, this.prompt.emoji, cx, cardY - 22 * unit, { size: 60 * unit, weight: 400 })
    drawText(ctx, this.options.t(this.prompt.labelKey), cx, cardY + 42 * unit, {
      size: 22 * unit,
      color: '#ffffff',
      weight: 700,
      glow: 8,
    })

    // Time bar under the card.
    const remaining = this.phase === 'prompt' ? 1 - this.elapsed / this.window : this.phase === 'success' ? 1 : 0
    drawBar(ctx, cx - cardW / 2, cardY + cardH / 2 + 12 * unit, cardW, 8 * unit, remaining, color)

    // Hold ring near the face: fills as the gesture is held.
    if (this.phase === 'prompt' && this.lastFrame?.face) {
      const fx = this.lastFrame.headX * w
      const fy = this.lastFrame.headY * h
      const r = 70 * unit
      neonCircle(ctx, fx, fy, r, withAlpha(ACCENT, 0.3), { width: 3 * unit, glow: 6 })
      const k = Math.min(1, this.hold / HOLD_SEC)
      if (k > 0) {
        ctx.beginPath()
        ctx.arc(fx, fy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
        neonStroke(ctx, OK_COLOR, 5 * unit, 18)
      }
    }

    if (this.phase !== 'prompt') {
      const k = this.phaseTimer / (this.phase === 'success' ? 0.55 : 0.8)
      drawText(ctx, this.phase === 'success' ? 'GOOD!' : 'MISS', cx, h * 0.5, {
        size: lerp(72, 56, k) * unit,
        color,
        family: FONT_DISPLAY,
        weight: 800,
        glow: 30,
        alpha: Math.min(1, k * 2),
      })
    }

    drawPopups(
      ctx,
      this.popups.map((p) => ({ ...p, x: p.x * w, y: p.y * h })),
      24 * unit,
    )

    drawText(ctx, `ROUND ${this.round}`, cx, h - 22 * unit, {
      size: 13 * unit,
      color: withAlpha('#ffffff', 0.6),
      family: FONT_DISPLAY,
      weight: 600,
    })
  }

  hud(): HudState {
    return {
      score: this.score,
      lives: this.lives,
      maxLives: MAX_LIVES,
      combo: this.combo >= 4 ? this.combo : undefined,
      label: `R${this.round}`,
    }
  }

  result() {
    const { t } = this.options
    return {
      score: this.score,
      stats: [
        { label: t('stat.cleared'), value: `${this.cleared}` },
        { label: t('stat.failed'), value: `${this.failed}` },
        { label: t('stat.bestCombo'), value: `${this.bestCombo}` },
        {
          label: t('stat.fastest'),
          value: Number.isFinite(this.fastest)
            ? t('unit.seconds', { n: this.fastest.toFixed(2) })
            : '—',
        },
      ],
    }
  }
}

export const mimic: GameDefinition = {
  id: 'mimic',
  title: { ko: '표정 따라하기', en: 'Face Mimic' },
  tagline: {
    ko: '카드에 뜬 표정을 시간 안에 지으세요',
    en: 'Pull the face on the card before time runs out',
  },
  description: {
    ko: '웃기, 입 벌리기, 윙크, 머리 기울이기… 카드가 시키는 표정을 시간이 끝나기 전에 지으세요. 라운드가 오를수록 시간이 짧아집니다.',
    en: 'Smile, open wide, wink, tilt your head… make the face the card asks for before the bar empties. Every round gives you a little less time.',
  },
  emoji: '🎭',
  accent: ACCENT,
  controls: ['smile', 'mouth', 'wink', 'blink', 'tilt', 'brow'],
  howTo: {
    ko: [
      '카드에 적힌 표정을 바가 끝나기 전에 지으세요',
      '잠깐 유지해야 인정됩니다 (얼굴 주변 링이 차오름)',
      '빨리 성공할수록 점수가 높고, 연속 성공 시 배율 증가',
      '3번 실패하면 게임 종료',
    ],
    en: [
      'Make the face on the card before the bar runs out',
      'Hold it for a moment to count (the ring around your face fills)',
      'Faster clears score more, and a streak raises the multiplier',
      'Three misses ends the run',
    ],
  },
  durationSec: 60,
  scoreUnit: { ko: '점', en: ' pts' },
  create: (options) => new Mimic(options),
}
