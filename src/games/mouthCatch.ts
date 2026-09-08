import {
  drawPopups,
  drawText,
  FONT_DISPLAY,
  lerp,
  neonCircle,
  updatePopups,
  withAlpha,
  type Popup,
} from './draw'
import type { GameCreateOptions, GameDefinition, GameEngine, GameInput, HudState } from './types'

const ACCENT = '#3dff7a'
const BAD_COLOR = '#ff3fd6'
const MAX_LIVES = 3

const GOOD_FOOD = ['🍕', '🍔', '🍩', '🍓', '🍣', '🍪', '🍇', '🌮'] as const
const BAD_FOOD = ['💣', '🌶️', '🧨'] as const

interface Food {
  emoji: string
  good: boolean
  x: number
  y: number
  vy: number
  wobble: number
}

/**
 * Mouth Catch: food falls from the top; move your face under it and open your
 * mouth to eat. Bombs and peppers cost a life, so keep your mouth shut.
 */
class MouthCatch implements GameEngine {
  over = false

  private score = 0
  private lives = MAX_LIVES
  private eaten = 0
  private missed = 0
  private badEaten = 0
  private combo = 0
  private bestCombo = 0
  private foods: Food[] = []
  private spawnTimer = 0.4
  private popups: Popup[] = []
  private time = 0
  private mouthX = 0.5
  private mouthY = 0.6
  private mouthOpen = false
  private openAmount = 0
  private chomp = 0
  private flash = 0

  private readonly options: GameCreateOptions

  constructor(options: GameCreateOptions) {
    this.options = options
  }

  update({ dt, t, frame, timeLeft }: GameInput): void {
    if (this.over) return
    this.time = t

    if (frame.face) {
      this.mouthX = frame.mouthX
      this.mouthY = frame.mouthY
      this.mouthOpen = frame.mouthOpened
      this.openAmount = lerp(this.openAmount, frame.mouthOpen, 1 - Math.exp(-dt * 14))
    } else {
      this.mouthOpen = false
    }

    if (this.chomp > 0) this.chomp -= dt
    if (this.flash > 0) this.flash -= dt

    const progress = 1 - timeLeft / this.options.durationSec
    const speed = this.options.speed * (1 + progress * 0.7)

    this.spawnTimer -= dt * speed
    if (this.spawnTimer <= 0) {
      this.spawnTimer = lerp(1.1, 0.55, progress)
      this.spawn(speed)
    }

    // Catch radius in normalized units; wider horizontally since the frame is.
    const catchR = 0.055 + this.openAmount * 0.02

    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i]
      f.y += f.vy * dt * speed
      f.wobble += dt * 2.2

      const dx = f.x - this.mouthX
      const dy = f.y - this.mouthY
      const inside = Math.hypot(dx * 1.25, dy) < catchR

      if (inside && this.mouthOpen) {
        this.foods.splice(i, 1)
        this.chomp = 0.18
        if (f.good) {
          this.eaten += 1
          this.combo += 1
          this.bestCombo = Math.max(this.bestCombo, this.combo)
          const multiplier = 1 + Math.min(4, Math.floor(this.combo / 3))
          const gain = 10 * multiplier
          this.score += gain
          this.popups.push({
            x: f.x,
            y: f.y,
            text: multiplier > 1 ? `+${gain} x${multiplier}` : `+${gain}`,
            color: ACCENT,
            age: 0,
            life: 0.8,
          })
          this.options.sfx('eat')
        } else {
          this.badEaten += 1
          this.lives -= 1
          this.combo = 0
          this.flash = 0.35
          this.score = Math.max(0, this.score - 15)
          this.popups.push({ x: f.x, y: f.y, text: '-15', color: BAD_COLOR, age: 0, life: 0.9 })
          this.options.sfx('hit')
          if (this.lives <= 0) {
            this.over = true
            return
          }
        }
        continue
      }

      if (f.y > 1.08) {
        this.foods.splice(i, 1)
        if (f.good) {
          this.missed += 1
          if (this.combo > 0) this.options.sfx('miss')
          this.combo = 0
        }
      }
    }

    updatePopups(this.popups, dt)
  }

  private spawn(speed: number) {
    const rng = this.options.rng
    const bad = rng.chance(0.24 + Math.min(0.12, this.time / this.options.durationSec * 0.12))
    this.foods.push({
      emoji: bad ? rng.pick(BAD_FOOD) : rng.pick(GOOD_FOOD),
      good: !bad,
      x: rng.range(0.12, 0.88),
      y: -0.08,
      vy: rng.range(0.22, 0.3) * (speed > 1.3 ? 1.1 : 1),
      wobble: rng.range(0, 6),
    })
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const unit = Math.min(w, h) / 720

    for (const f of this.foods) {
      const x = (f.x + Math.sin(f.wobble) * 0.012) * w
      const y = f.y * h
      if (!f.good) {
        neonCircle(ctx, x, y, 26 * unit, BAD_COLOR, { width: 1.5 * unit, glow: 14, alpha: 0.6 })
      }
      drawText(ctx, f.emoji, x, y, { size: 40 * unit, weight: 400 })
    }

    // Mouth ring: grows and brightens as the jaw opens.
    const mx = this.mouthX * w
    const my = this.mouthY * h
    const radius = (36 + this.openAmount * 22) * unit
    const color = this.mouthOpen ? ACCENT : withAlpha(ACCENT, 0.55)
    ctx.save()
    ctx.setLineDash(this.mouthOpen ? [] : [8 * unit, 8 * unit])
    neonCircle(ctx, mx, my, radius, color, { width: (this.mouthOpen ? 4 : 2.5) * unit, glow: 18 })
    ctx.restore()
    if (this.chomp > 0) {
      neonCircle(ctx, mx, my, radius * (1.2 + (0.18 - this.chomp) * 3), ACCENT, {
        width: 2 * unit,
        glow: 20,
        alpha: this.chomp / 0.18,
      })
    }

    drawPopups(ctx, this.popups, 22 * unit)

    if (this.flash > 0) {
      ctx.save()
      ctx.fillStyle = withAlpha(BAD_COLOR, this.flash * 0.5)
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    if (this.over) {
      drawText(ctx, 'KO', w / 2, h / 2, {
        size: 72 * unit,
        color: BAD_COLOR,
        family: FONT_DISPLAY,
        weight: 800,
        glow: 30,
      })
    }
  }

  hud(): HudState {
    return {
      score: this.score,
      lives: this.lives,
      maxLives: MAX_LIVES,
      combo: this.combo >= 3 ? this.combo : undefined,
    }
  }

  result() {
    return {
      score: this.score,
      stats: [
        { label: '먹은 음식', value: `${this.eaten}개` },
        { label: '놓친 음식', value: `${this.missed}개` },
        { label: '최대 콤보', value: `${this.bestCombo}` },
        { label: '폭탄 섭취', value: `${this.badEaten}회` },
      ],
    }
  }
}

export const mouthCatch: GameDefinition = {
  id: 'mouth-catch',
  title: '냠냠 캐치',
  tagline: '입을 벌려 떨어지는 음식을 받아먹으세요',
  description:
    '얼굴을 움직여 떨어지는 음식 아래로 가고, 입을 크게 벌려 받아먹으세요. 폭탄과 고추는 입을 다물고 흘려보내야 합니다.',
  emoji: '🍔',
  accent: ACCENT,
  controls: ['move', 'mouth'],
  howTo: [
    '얼굴을 좌우로 움직여 입 위치를 맞춥니다',
    '음식이 입 근처에 오면 입을 벌려 먹습니다',
    '연속으로 먹으면 점수 배율이 올라갑니다',
    '💣 🌶️ 🧨 를 먹으면 목숨이 줄어듭니다',
  ],
  durationSec: 45,
  scoreUnit: '점',
  create: (options) => new MouthCatch(options),
}
