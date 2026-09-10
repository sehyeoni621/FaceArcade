import {
  clamp,
  drawBar,
  drawPopups,
  drawText,
  FONT_DISPLAY,
  lerp,
  neonCircle,
  neonFill,
  neonStroke,
  roundRect,
  updatePopups,
  withAlpha,
  type Popup,
} from './draw'
import type { GameCreateOptions, GameDefinition, GameEngine, GameInput, HudState } from './types'

const ACCENT = '#3ff0ff'
const COIN_COLOR = '#ffd23f'
const HAZARD_COLOR = '#ff3fd6'

const MAX_LIVES = 3
const INVULN_SEC = 1.3
/** Degrees of tilt that push the glider to the edge of the track. */
const FULL_TILT_DEG = 22

interface Faller {
  kind: 'coin' | 'block'
  /** 0..1 across the track. */
  x: number
  /** 0..1 down the screen. */
  y: number
  /** Half width as a fraction of the track width (blocks only). */
  halfW: number
  spin: number
}

/**
 * Tilt Runner: lean your head to steer a glider across three lanes, dodge
 * blocks and collect coins. Ends after the timer or after three hits.
 */
class TiltRunner implements GameEngine {
  over = false

  private score = 0
  private lives = MAX_LIVES
  private coins = 0
  private hits = 0
  private distance = 0
  private invuln = 0
  private playerX = 0.5
  private fallers: Faller[] = []
  private spawnTimer = 0.6
  private popups: Popup[] = []
  private time = 0
  private flash = 0
  private lastTilt = 0
  private streak = 0
  private bestStreak = 0

  private readonly options: GameCreateOptions

  constructor(options: GameCreateOptions) {
    this.options = options
  }

  private get speedScale() {
    // Ramps ~45% faster over the run.
    return this.options.speed * (1 + this.time / this.options.durationSec * 0.45)
  }

  update({ dt, t, frame, timeLeft }: GameInput): void {
    if (this.over) return
    this.time = t
    this.lastTilt = frame.tilt

    // Steering: continuous, so a small lean drifts and a full lean slams over.
    const target = frame.face ? 0.5 + clamp(frame.tilt / FULL_TILT_DEG, -1, 1) * 0.42 : this.playerX
    this.playerX = lerp(this.playerX, target, 1 - Math.exp(-dt * 10))

    this.distance += dt * 14 * this.speedScale
    if (this.invuln > 0) this.invuln -= dt
    if (this.flash > 0) this.flash -= dt

    // Spawning gets denser as time passes.
    this.spawnTimer -= dt * this.speedScale
    if (this.spawnTimer <= 0) {
      const progress = 1 - timeLeft / this.options.durationSec
      this.spawnTimer = lerp(1.25, 0.8, progress)
      this.spawn()
    }

    const fall = dt * 0.38 * this.speedScale
    const playerY = 0.86

    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const f = this.fallers[i]
      f.y += fall
      f.spin += dt * 3

      if (f.kind === 'coin') {
        const dx = (f.x - this.playerX) * 1.6 // track is wider than tall on screen
        const dy = f.y - playerY
        if (Math.hypot(dx, dy) < 0.055) {
          this.fallers.splice(i, 1)
          this.coins += 1
          this.streak += 1
          this.bestStreak = Math.max(this.bestStreak, this.streak)
          const bonus = 10 + Math.min(4, Math.floor(this.streak / 5)) * 5
          this.score += bonus
          this.popups.push({ x: f.x, y: f.y, text: `+${bonus}`, color: COIN_COLOR, age: 0, life: 0.8 })
          this.options.sfx('coin')
          continue
        }
      } else if (this.invuln <= 0) {
        const overlapX = Math.abs(f.x - this.playerX) < f.halfW + 0.03
        const overlapY = Math.abs(f.y - playerY) < 0.045
        if (overlapX && overlapY) {
          this.fallers.splice(i, 1)
          this.lives -= 1
          this.hits += 1
          this.streak = 0
          this.invuln = INVULN_SEC
          this.flash = 0.35
          this.popups.push({ x: f.x, y: f.y, text: 'HIT', color: HAZARD_COLOR, age: 0, life: 0.9 })
          this.options.sfx('hit')
          if (this.lives <= 0) {
            this.over = true
            return
          }
          continue
        }
      }

      if (f.y > 1.1) {
        this.fallers.splice(i, 1)
        // Dodged a block: small reward so survival is worth something.
        if (f.kind === 'block') this.score += 2
      }
    }

    updatePopups(this.popups, dt)
  }

  private spawn() {
    const rng = this.options.rng
    const x = rng.range(0.1, 0.9)
    const progress = this.time / this.options.durationSec
    if (rng.chance(0.45)) {
      this.fallers.push({ kind: 'coin', x, y: -0.05, halfW: 0, spin: rng.range(0, 6) })
    } else {
      this.fallers.push({ kind: 'block', x, y: -0.05, halfW: rng.range(0.045, 0.08), spin: 0 })
    }
    // Later on, sometimes a second block - offset so there is always a gap.
    if (rng.chance(0.08 + progress * 0.25)) {
      const x2 = clamp(x + (rng.chance(0.5) ? 0.38 : -0.38), 0.08, 0.92)
      this.fallers.push({ kind: 'block', x: x2, y: -0.14, halfW: rng.range(0.05, 0.08), spin: 0 })
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const unit = Math.min(w, h) / 720

    // Track: three lanes hinted with vertical rules.
    ctx.save()
    ctx.setLineDash([12 * unit, 18 * unit])
    for (const lane of [1 / 3, 2 / 3]) {
      ctx.beginPath()
      ctx.moveTo(lane * w, 0)
      ctx.lineTo(lane * w, h)
      neonStroke(ctx, withAlpha(ACCENT, 0.25), 1.5 * unit, 6, 1)
    }
    ctx.restore()

    // Fallers.
    for (const f of this.fallers) {
      const x = f.x * w
      const y = f.y * h
      if (f.kind === 'coin') {
        const r = 15 * unit
        const squash = Math.abs(Math.cos(f.spin))
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(Math.max(0.25, squash), 1)
        neonCircle(ctx, 0, 0, r, COIN_COLOR, { fill: true, glow: 16 })
        neonCircle(ctx, 0, 0, r * 0.55, '#fff4c2', { fill: true, glow: 0, alpha: 0.9 })
        ctx.restore()
      } else {
        const bw = f.halfW * 2 * w
        const bh = 34 * unit
        roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 8 * unit)
        neonFill(ctx, withAlpha(HAZARD_COLOR, 0.35), 18)
        roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 8 * unit)
        neonStroke(ctx, HAZARD_COLOR, 2 * unit, 14)
      }
    }

    // Player glider.
    const px = this.playerX * w
    const py = 0.86 * h
    const size = 26 * unit
    const blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0
    if (!blink) {
      const lean = clamp(this.lastTilt / FULL_TILT_DEG, -1, 1) * 0.5
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(lean)
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(size * 0.9, size * 0.7)
      ctx.lineTo(0, size * 0.3)
      ctx.lineTo(-size * 0.9, size * 0.7)
      ctx.closePath()
      neonFill(ctx, withAlpha(ACCENT, 0.35), 20)
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(size * 0.9, size * 0.7)
      ctx.lineTo(0, size * 0.3)
      ctx.lineTo(-size * 0.9, size * 0.7)
      ctx.closePath()
      neonStroke(ctx, ACCENT, 2.5 * unit, 18)
      // Thruster.
      neonCircle(ctx, 0, size * 0.75, 5 * unit + Math.random() * 3 * unit, '#ffffff', {
        fill: true,
        glow: 14,
        alpha: 0.8,
      })
      ctx.restore()
    }

    // Tilt readout along the bottom edge.
    const barW = Math.min(280 * unit, w * 0.6)
    const barX = (w - barW) / 2
    const barY = h - 26 * unit
    drawBar(ctx, barX, barY, barW, 6 * unit, 1, withAlpha(ACCENT, 0.12), 'transparent')
    const knob = barX + ((clamp(this.lastTilt / FULL_TILT_DEG, -1, 1) + 1) / 2) * barW
    neonCircle(ctx, knob, barY + 3 * unit, 7 * unit, ACCENT, { fill: true, glow: 12 })

    drawPopups(ctx, this.popups, 22 * unit)

    if (this.flash > 0) {
      ctx.save()
      ctx.fillStyle = withAlpha(HAZARD_COLOR, this.flash * 0.6)
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    if (this.over) {
      drawText(ctx, 'CRASH', w / 2, h / 2, {
        size: 64 * unit,
        color: HAZARD_COLOR,
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
      combo: this.streak >= 5 ? this.streak : undefined,
      label: `${Math.floor(this.distance)} m`,
    }
  }

  result() {
    const { t } = this.options
    return {
      score: this.score,
      stats: [
        { label: t('stat.distance'), value: `${Math.floor(this.distance)} m` },
        { label: t('stat.coins'), value: `${this.coins}` },
        { label: t('stat.bestCoinStreak'), value: `${this.bestStreak}` },
        { label: t('stat.crashes'), value: t('unit.times', { n: this.hits }) },
      ],
    }
  }
}

export const tiltRunner: GameDefinition = {
  id: 'tilt-runner',
  title: { ko: '틸트 러너', en: 'Tilt Runner' },
  tagline: {
    ko: '머리를 기울여 장애물을 피하세요',
    en: 'Tilt your head to dodge the blocks',
  },
  description: {
    ko: '머리를 좌우로 기울이면 글라이더가 따라 움직입니다. 떨어지는 블록을 피하고 코인을 모으세요. 세 번 부딪히면 끝!',
    en: 'Lean your head left or right and the glider follows. Dodge the falling blocks, collect the coins. Three hits and you are done!',
  },
  emoji: '🛸',
  accent: ACCENT,
  controls: ['tilt'],
  howTo: {
    ko: [
      '머리를 왼쪽·오른쪽으로 기울여 글라이더를 조종합니다',
      '많이 기울일수록 더 멀리 이동합니다',
      '코인 +10, 연속으로 모으면 보너스',
      '블록에 3번 부딪히면 게임 종료',
    ],
    en: [
      'Tilt your head left and right to steer the glider',
      'The further you lean, the further it moves',
      'Coins are +10, and a streak pays a bonus',
      'Three hits on a block ends the run',
    ],
  },
  durationSec: 60,
  scoreUnit: { ko: '점', en: ' pts' },
  create: (options) => new TiltRunner(options),
}
