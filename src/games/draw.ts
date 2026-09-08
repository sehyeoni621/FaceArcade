/**
 * Canvas helpers shared by the games. Everything takes logical pixels; the
 * runner has already scaled the context for the device pixel ratio.
 */

export const FONT_DISPLAY = "'Orbitron', 'Noto Sans KR', system-ui, sans-serif"
export const FONT_BODY = "'Noto Sans KR', system-ui, sans-serif"

export interface TextStyle {
  size: number
  color?: string
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  weight?: number | string
  family?: string
  /** Glow radius. 0 disables the shadow pass. */
  glow?: number
  glowColor?: string
  alpha?: number
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  ctx.save()
  ctx.font = `${style.weight ?? 700} ${style.size}px ${style.family ?? FONT_BODY}`
  ctx.textAlign = style.align ?? 'center'
  ctx.textBaseline = style.baseline ?? 'middle'
  ctx.fillStyle = style.color ?? '#ffffff'
  ctx.globalAlpha = style.alpha ?? 1
  if (style.glow) {
    ctx.shadowColor = style.glowColor ?? style.color ?? '#ffffff'
    ctx.shadowBlur = style.glow
  }
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function neonStroke(
  ctx: CanvasRenderingContext2D,
  color: string,
  width = 2,
  glow = 14,
  alpha = 1,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.shadowColor = color
  ctx.shadowBlur = glow
  ctx.globalAlpha = alpha
  ctx.stroke()
  ctx.restore()
}

export function neonFill(ctx: CanvasRenderingContext2D, color: string, glow = 14, alpha = 1) {
  ctx.save()
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = glow
  ctx.globalAlpha = alpha
  ctx.fill()
  ctx.restore()
}

export function neonCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  options: { fill?: boolean; width?: number; glow?: number; alpha?: number } = {},
) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  if (options.fill) neonFill(ctx, color, options.glow, options.alpha)
  else neonStroke(ctx, color, options.width, options.glow, options.alpha)
}

/** Horizontal progress bar with a neon fill. `value` is 0..1. */
export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  color: string,
  track = 'rgba(255,255,255,0.12)',
) {
  const v = Math.max(0, Math.min(1, value))
  ctx.save()
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = track
  ctx.fill()
  if (v > 0) {
    roundRect(ctx, x, y, w * v, h, h / 2)
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.fill()
  }
  ctx.restore()
}

/** Quick color helpers so games can fade their accent without string math. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Floating score popups ("+10") that rise and fade. */
export interface Popup {
  x: number
  y: number
  text: string
  color: string
  age: number
  life: number
}

export function updatePopups(popups: Popup[], dt: number) {
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].age += dt
    popups[i].y -= dt * 40
    if (popups[i].age >= popups[i].life) popups.splice(i, 1)
  }
}

export function drawPopups(ctx: CanvasRenderingContext2D, popups: Popup[], size = 22) {
  for (const popup of popups) {
    const k = popup.age / popup.life
    drawText(ctx, popup.text, popup.x, popup.y, {
      size,
      color: popup.color,
      weight: 800,
      family: FONT_DISPLAY,
      glow: 12,
      alpha: 1 - k * k,
    })
  }
}
