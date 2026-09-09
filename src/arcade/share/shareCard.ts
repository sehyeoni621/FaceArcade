/**
 * Draws a record as a 4:5 poster on a canvas.
 *
 * This is what a shared score actually looks like in KakaoTalk, Instagram or a
 * DM: the messenger shows the image, not our HTML. So the card has to carry the
 * branding by itself - mark, game, score, and where to go play it.
 */
import { CONTROL_LABEL, type GameDefinition, type ResultStat } from '../../games/types'

/** 4:5 - the tallest crop Instagram and Kakao both show without cutting. */
export const CARD_W = 1080
export const CARD_H = 1350

export interface ShareCardData {
  game: GameDefinition
  score: number
  /** Leaderboard position, when the run made the board. */
  rank?: number | null
  isNewBest?: boolean
  /** Arcade initials, when the player left them. */
  initials?: string | null
  stats?: ResultStat[]
  /** Shown on the footer pill. */
  url: string
  at?: Date
}

const VOID = '#04041a'
const INK = '#ffffff'
const DIM = '#b9bff0'
const MUTE = '#8a90c8'

/** Rendering waits on these; a fallback face would not look like the app. */
const FONTS = ['800 190px Orbitron', '800 44px Orbitron', '900 60px "Noto Sans KR"', '700 26px "Noto Sans KR"']

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  await loadFonts()

  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')

  const accent = data.game.accent
  drawBackdrop(ctx, accent)
  await drawHeader(ctx)
  drawGame(ctx, data)
  drawScore(ctx, data)
  drawBadges(ctx, data)
  drawStats(ctx, data)
  drawFooter(ctx, data)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    )
  })
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function drawBackdrop(ctx: CanvasRenderingContext2D, accent: string) {
  ctx.fillStyle = VOID
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Accent bloom behind the score, matching the result screen's radial wash.
  const bloom = ctx.createRadialGradient(540, 470, 0, 540, 470, 760)
  bloom.addColorStop(0, hexA(accent, 0.3))
  bloom.addColorStop(0.55, hexA(accent, 0.08))
  bloom.addColorStop(1, hexA(accent, 0))
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Receding grid floor along the bottom, as on the lobby.
  ctx.save()
  ctx.strokeStyle = hexA(accent, 0.18)
  ctx.lineWidth = 2
  const horizon = 1010
  for (let i = 0; i <= 9; i += 1) {
    const t = i / 9
    const y = horizon + (CARD_H - horizon) * t * t
    ctx.globalAlpha = 0.15 + t * 0.5
    line(ctx, 0, y, CARD_W, y)
  }
  for (let i = -6; i <= 6; i += 1) {
    ctx.globalAlpha = 0.28
    line(ctx, 540 + i * 26, horizon, 540 + i * 250, CARD_H)
  }
  ctx.restore()

  // Neon frame.
  ctx.strokeStyle = hexA(accent, 0.6)
  ctx.lineWidth = 4
  roundRect(ctx, 24, 24, CARD_W - 48, CARD_H - 48, 56)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(120,110,255,0.25)'
  ctx.lineWidth = 2
  roundRect(ctx, 40, 40, CARD_W - 80, CARD_H - 80, 42)
  ctx.stroke()
}

async function drawHeader(ctx: CanvasRenderingContext2D) {
  const mark = await loadIcon()
  if (mark) ctx.drawImage(mark, 78, 78, 104, 104)

  const grad = ctx.createLinearGradient(206, 0, 640, 0)
  grad.addColorStop(0, '#3ff0ff')
  grad.addColorStop(0.55, '#7b5cff')
  grad.addColorStop(1, '#ff3fd6')
  ctx.fillStyle = grad
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  withTracking(ctx, '7px', () => {
    ctx.font = '800 44px Orbitron, sans-serif'
    ctx.fillText('FACEARCADE', 206, 138)
  })

  ctx.fillStyle = MUTE
  ctx.font = '500 22px "Noto Sans KR", sans-serif'
  ctx.fillText('얼굴로 조종하는 웹캠 아케이드', 208, 176)

  ctx.strokeStyle = 'rgba(120,110,255,0.28)'
  ctx.lineWidth = 2
  line(ctx, 78, 224, CARD_W - 78, 224)
}

function drawGame(ctx: CanvasRenderingContext2D, { game }: ShareCardData) {
  ctx.textAlign = 'center'

  ctx.font = '76px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
  ctx.fillText(game.emoji, 540, 330)

  ctx.fillStyle = INK
  ctx.font = '900 58px "Noto Sans KR", sans-serif'
  ctx.fillText(game.title, 540, 408)

  ctx.fillStyle = DIM
  ctx.font = '500 25px "Noto Sans KR", sans-serif'
  ctx.fillText(game.tagline, 540, 452)
}

function drawScore(ctx: CanvasRenderingContext2D, { game, score }: ShareCardData) {
  const accent = game.accent
  ctx.textAlign = 'center'

  ctx.fillStyle = MUTE
  withTracking(ctx, '8px', () => {
    ctx.font = '800 24px Orbitron, sans-serif'
    ctx.fillText('SCORE', 540, 542)
  })

  const value = score.toLocaleString('ko-KR')
  ctx.save()
  ctx.shadowColor = hexA(accent, 0.9)
  ctx.shadowBlur = 60
  ctx.fillStyle = INK
  ctx.font = '800 176px Orbitron, sans-serif'
  const width = ctx.measureText(value).width
  // The unit rides after the number, so the pair stays optically centred.
  ctx.font = '900 44px "Noto Sans KR", sans-serif'
  const unitWidth = ctx.measureText(game.scoreUnit).width + 14
  const left = 540 - (width + unitWidth) / 2

  ctx.textAlign = 'left'
  ctx.font = '800 176px Orbitron, sans-serif'
  ctx.fillText(value, left, 690)
  ctx.shadowBlur = 24
  ctx.fillStyle = accent
  ctx.font = '900 44px "Noto Sans KR", sans-serif'
  ctx.fillText(game.scoreUnit, left + width + 14, 690)
  ctx.restore()
}

function drawBadges(ctx: CanvasRenderingContext2D, data: ShareCardData) {
  const { game, rank, isNewBest, initials } = data
  const badges: { text: string; color: string; solid?: boolean }[] = []
  if (isNewBest) badges.push({ text: '★ NEW RECORD', color: '#ff3fd6', solid: true })
  if (rank) badges.push({ text: `랭킹 ${rank}위`, color: game.accent })
  if (initials && initials !== '---') badges.push({ text: initials, color: '#7b5cff' })
  if (badges.length === 0) badges.push({ text: `${game.durationSec}초 한 판`, color: game.accent })

  ctx.font = '800 26px "Noto Sans KR", sans-serif'
  const gap = 16
  const widths = badges.map((badge) => ctx.measureText(badge.text).width + 56)
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (badges.length - 1)
  let x = 540 - total / 2

  badges.forEach((badge, index) => {
    const w = widths[index]
    ctx.fillStyle = badge.solid ? hexA(badge.color, 0.9) : hexA(badge.color, 0.14)
    ctx.strokeStyle = hexA(badge.color, badge.solid ? 1 : 0.75)
    ctx.lineWidth = 3
    roundRect(ctx, x, 736, w, 62, 31)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = badge.solid ? INK : badge.color
    ctx.textAlign = 'center'
    ctx.fillText(badge.text, x + w / 2, 777)
    x += w + gap
  })
}

function drawStats(ctx: CanvasRenderingContext2D, { game, stats = [], at }: ShareCardData) {
  // Games that report no stats still leave a hole here, so the slot falls back
  // to how the game is played - useful to whoever receives the card anyway.
  const shown: ResultStat[] =
    stats.length > 0
      ? stats.slice(0, 3)
      : [{ label: '조작', value: game.controls.map((kind) => CONTROL_LABEL[kind]).join(' · ') }]
  const top = 850
  const gap = 20
  const w = (CARD_W - 156 - gap * (shown.length - 1)) / shown.length

  shown.forEach((stat, index) => {
    const x = 78 + index * (w + gap)
    ctx.fillStyle = 'rgba(8,8,36,0.85)'
    ctx.strokeStyle = hexA(game.accent, 0.35)
    ctx.lineWidth = 2
    roundRect(ctx, x, top, w, 130, 24)
    ctx.fill()
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.fillStyle = MUTE
    ctx.font = '500 22px "Noto Sans KR", sans-serif'
    ctx.fillText(stat.label, x + w / 2, top + 48)
    ctx.fillStyle = INK
    // One wide fallback tile holds a sentence, not a number: shrink to fit.
    ctx.font = stats.length > 0 ? '800 42px Orbitron, sans-serif' : '800 34px "Noto Sans KR", sans-serif'
    fitText(ctx, stat.value, x + w / 2, top + 102, w - 40)
  })

  const date = at ?? new Date()
  ctx.textAlign = 'center'
  ctx.fillStyle = MUTE
  ctx.font = '500 23px "Noto Sans KR", sans-serif'
  ctx.fillText(`${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} 기록`, 540, 1030)
}

function drawFooter(ctx: CanvasRenderingContext2D, { game, url }: ShareCardData) {
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  ctx.font = '900 34px "Noto Sans KR", sans-serif'
  ctx.fillText('당신도 얼굴로 이겨보세요', 540, 1148)

  const label = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  ctx.font = '700 27px Orbitron, sans-serif'
  const w = Math.min(CARD_W - 200, ctx.measureText(label).width + 88)
  ctx.fillStyle = hexA(game.accent, 0.16)
  ctx.strokeStyle = hexA(game.accent, 0.8)
  ctx.lineWidth = 3
  roundRect(ctx, 540 - w / 2, 1188, w, 76, 38)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = game.accent
  ctx.fillText(label, 540, 1236)
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draws text at the current font, scaled down only if it would overflow. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  const width = ctx.measureText(text).width
  if (width <= maxWidth) {
    ctx.fillText(text, x, y)
    return
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(maxWidth / width, 1)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

/** `#rrggbb` plus an alpha, the way the app's inline styles do it. */
function hexA(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/** `letterSpacing` is Chrome/Safari-only; skip it rather than break the draw. */
function withTracking(ctx: CanvasRenderingContext2D, spacing: string, draw: () => void) {
  const tracked = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  const supported = 'letterSpacing' in ctx
  if (supported) tracked.letterSpacing = spacing
  draw()
  if (supported) tracked.letterSpacing = '0px'
}

async function loadFonts() {
  if (!('fonts' in document)) return
  try {
    await Promise.all(FONTS.map((font) => document.fonts.load(font, '0123456789 점')))
  } catch {
    // A missing webfont only costs us the arcade look, not the card.
  }
}

let iconPromise: Promise<HTMLImageElement | null> | null = null

/** The real app icon, so the card and the home screen show the same mark. */
function loadIcon(): Promise<HTMLImageElement | null> {
  iconPromise ??= new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = '/icon.svg'
  })
  return iconPromise
}
