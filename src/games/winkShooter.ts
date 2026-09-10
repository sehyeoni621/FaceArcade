import {
  clamp,
  drawBar,
  drawPopups,
  drawText,
  FONT_DISPLAY,
  lerp,
  neonCircle,
  neonStroke,
  updatePopups,
  withAlpha,
  type Popup,
} from './draw'
import type { GameCreateOptions, GameDefinition, GameEngine, GameInput, HudState } from './types'

const ACCENT = '#ff3fd6'
const LEFT_COLOR = '#3ff0ff'
const RIGHT_COLOR = '#ffd23f'

interface Target {
  side: 'left' | 'right'
  x: number
  y: number
  age: number
  life: number
  /** Set when hit; plays a burst and is removed after. */
  dead: number
}

interface Shot {
  side: 'left' | 'right'
  age: number
  hit: boolean
}

/**
 * Wink Shooter: targets pop up on the left or right half. Wink the eye on the
 * same side to shoot the nearest one before it shrinks away.
 */
class WinkShooter implements GameEngine {
  over = false

  private score = 0
  private hits = 0
  private misses = 0
  private expired = 0
  private combo = 0
  private bestCombo = 0
  private targets: Target[] = []
  private shots: Shot[] = []
  private spawnTimer = 0.8
  private popups: Popup[] = []
  private time = 0
  private eyeLeft = 0
  private eyeRight = 0
  private bestReaction = Infinity
  private reactionSum = 0

  private readonly options: GameCreateOptions

  constructor(options: GameCreateOptions) {
    this.options = options
  }

  update({ dt, t, frame, edges, timeLeft }: GameInput): void {
    if (this.over) return
    this.time = t
    this.eyeLeft = frame.face ? frame.blinkLeft : 0
    this.eyeRight = frame.face ? frame.blinkRight : 0

    const progress = 1 - timeLeft / this.options.durationSec
    const speed = this.options.speed
    const targetLife = lerp(2.6, 1.4, progress) / speed
    const maxTargets = progress < 0.35 ? 1 : progress < 0.7 ? 2 : 3

    this.spawnTimer -= dt
    const alive = this.targets.filter((target) => target.dead === 0).length
    if (this.spawnTimer <= 0 && alive < maxTargets) {
      this.spawnTimer = lerp(1.1, 0.55, progress) / speed
      this.spawn(targetLife)
    }

    if (edges.winkLeft) this.shoot('left')
    if (edges.winkRight) this.shoot('right')

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i]
      if (target.dead > 0) {
        target.dead += dt
        if (target.dead > 0.35) this.targets.splice(i, 1)
        continue
      }
      target.age += dt
      if (target.age >= target.life) {
        this.targets.splice(i, 1)
        this.expired += 1
        this.combo = 0
        this.popups.push({ x: target.x, y: target.y, text: 'MISS', color: '#9aa0c8', age: 0, life: 0.7 })
        this.options.sfx('miss')
      }
    }

    for (let i = this.shots.length - 1; i >= 0; i--) {
      this.shots[i].age += dt
      if (this.shots[i].age > 0.25) this.shots.splice(i, 1)
    }

    updatePopups(this.popups, dt)
  }

  private spawn(life: number) {
    const rng = this.options.rng
    const side = rng.chance(0.5) ? 'left' : 'right'
    const x = side === 'left' ? rng.range(0.1, 0.36) : rng.range(0.64, 0.9)
    this.targets.push({ side, x, y: rng.range(0.16, 0.8), age: 0, life, dead: 0 })
  }

  private shoot(side: 'left' | 'right') {
    this.options.sfx('shoot')
    let best: Target | null = null
    for (const target of this.targets) {
      if (target.dead > 0 || target.side !== side) continue
      if (!best || target.age > best.age) best = target // oldest first: it expires soonest
    }

    if (!best) {
      this.misses += 1
      this.combo = 0
      this.shots.push({ side, age: 0, hit: false })
      return
    }

    best.dead = 0.0001
    this.hits += 1
    this.combo += 1
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    this.reactionSum += best.age
    this.bestReaction = Math.min(this.bestReaction, best.age)

    const remaining = 1 - best.age / best.life
    const multiplier = 1 + Math.min(4, Math.floor(this.combo / 3))
    const gain = (100 + Math.round(remaining * 100)) * multiplier
    this.score += gain
    this.shots.push({ side, age: 0, hit: true })
    this.popups.push({
      x: best.x,
      y: best.y,
      text: multiplier > 1 ? `+${gain} x${multiplier}` : `+${gain}`,
      color: side === 'left' ? LEFT_COLOR : RIGHT_COLOR,
      age: 0,
      life: 0.8,
    })
    this.options.sfx('success')
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const unit = Math.min(w, h) / 720

    // Center divider, so the sides read clearly.
    ctx.save()
    ctx.setLineDash([10 * unit, 14 * unit])
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    neonStroke(ctx, withAlpha('#ffffff', 0.25), 1.5 * unit, 4)
    ctx.restore()

    for (const target of this.targets) {
      const x = target.x * w
      const y = target.y * h
      const color = target.side === 'left' ? LEFT_COLOR : RIGHT_COLOR

      if (target.dead > 0) {
        const k = target.dead / 0.35
        neonCircle(ctx, x, y, (30 + k * 60) * unit, color, { width: 3 * unit, glow: 24, alpha: 1 - k })
        continue
      }

      const remaining = 1 - target.age / target.life
      const r = (22 + remaining * 22) * unit
      neonCircle(ctx, x, y, r, color, { width: 3 * unit, glow: 18 })
      neonCircle(ctx, x, y, r * 0.55, color, { width: 2 * unit, glow: 10, alpha: 0.8 })
      neonCircle(ctx, x, y, 4 * unit, '#ffffff', { fill: true, glow: 10 })
      // Timer arc around the outside.
      ctx.beginPath()
      ctx.arc(x, y, r + 9 * unit, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining)
      neonStroke(ctx, color, 3 * unit, 14, 0.9)
    }

    // Muzzle flashes on the fired side.
    for (const shot of this.shots) {
      const k = shot.age / 0.25
      const x = shot.side === 'left' ? w * 0.25 : w * 0.75
      const y = h * 0.92
      const color = shot.hit ? (shot.side === 'left' ? LEFT_COLOR : RIGHT_COLOR) : '#9aa0c8'
      neonCircle(ctx, x, y, (10 + k * 30) * unit, color, { width: 2 * unit, glow: 18, alpha: 1 - k })
    }

    // Eye meters along the bottom: how closed each eye currently is.
    const meterW = clamp(w * 0.22, 90 * unit, 200 * unit)
    const meterY = h - 22 * unit
    drawBar(ctx, w * 0.25 - meterW / 2, meterY, meterW, 6 * unit, this.eyeLeft, LEFT_COLOR)
    drawBar(ctx, w * 0.75 - meterW / 2, meterY, meterW, 6 * unit, this.eyeRight, RIGHT_COLOR)
    drawText(ctx, '👁 L', w * 0.25, meterY - 14 * unit, { size: 13 * unit, color: LEFT_COLOR, weight: 700 })
    drawText(ctx, 'R 👁', w * 0.75, meterY - 14 * unit, { size: 13 * unit, color: RIGHT_COLOR, weight: 700 })

    drawPopups(ctx, this.popups, 22 * unit)

    if (this.time < 1.2) {
      drawText(ctx, this.options.t('wink.hint'), w / 2, h * 0.1, {
        size: 16 * unit,
        color: '#ffffff',
        weight: 500,
        alpha: 1 - this.time / 1.2,
        family: FONT_DISPLAY,
      })
    }
  }

  hud(): HudState {
    return {
      score: this.score,
      combo: this.combo >= 3 ? this.combo : undefined,
      label: `${this.hits} HIT`,
    }
  }

  result() {
    const shots = this.hits + this.misses
    const accuracy = shots > 0 ? Math.round((this.hits / shots) * 100) : 0
    const { t } = this.options
    return {
      score: this.score,
      stats: [
        { label: t('stat.hits'), value: `${this.hits}` },
        { label: t('stat.accuracy'), value: `${accuracy}%` },
        { label: t('stat.bestCombo'), value: `${this.bestCombo}` },
        {
          label: t('stat.bestReaction'),
          value: Number.isFinite(this.bestReaction)
            ? t('unit.seconds', { n: this.bestReaction.toFixed(2) })
            : '—',
        },
      ],
    }
  }
}

export const winkShooter: GameDefinition = {
  id: 'wink-shooter',
  title: { ko: '윙크 슈터', en: 'Wink Shooter' },
  tagline: {
    ko: '표적이 뜬 쪽 눈을 윙크해 쏘세요',
    en: 'Wink the eye on the side the target appears',
  },
  description: {
    ko: '화면 왼쪽에 표적이 뜨면 왼쪽 눈을, 오른쪽에 뜨면 오른쪽 눈을 윙크하세요. 표적이 작아져 사라지기 전에 맞춰야 합니다.',
    en: 'A target on the left half means wink your left eye; one on the right means your right. Hit it before it shrinks away.',
  },
  emoji: '🎯',
  accent: ACCENT,
  controls: ['wink'],
  howTo: {
    ko: [
      '왼쪽 표적은 왼쪽 눈, 오른쪽 표적은 오른쪽 눈으로 윙크',
      '한쪽 눈만 감아야 합니다 (둘 다 감으면 발사되지 않음)',
      '빨리 맞출수록 점수가 높고, 연속 명중 시 배율 증가',
      '표적이 사라지거나 빗나가면 콤보가 끊깁니다',
    ],
    en: [
      'Left target, left eye. Right target, right eye',
      'Only one eye may close (both shut does not fire)',
      'Faster hits score more, and a streak raises the multiplier',
      'A miss or an expired target breaks your combo',
    ],
  },
  durationSec: 45,
  scoreUnit: { ko: '점', en: ' pts' },
  create: (options) => new WinkShooter(options),
}
