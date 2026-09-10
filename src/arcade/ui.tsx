import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Heart } from 'lucide-react'
import { CONTROL_LABEL, type ControlKind } from '../games/types'
import { useT } from '../i18n'
import { unlockSfx, playSfx } from '../utils/sfx'

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonTone = 'primary' | 'ghost' | 'danger' | 'pink'

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary:
    'border-neon-cyan/70 bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 shadow-[0_0_18px_rgba(63,240,255,0.25)]',
  pink: 'border-neon-pink/70 bg-neon-pink/15 text-neon-pink hover:bg-neon-pink/25 shadow-[0_0_18px_rgba(255,63,214,0.25)]',
  ghost: 'border-edge-line/40 bg-fa-panel/60 text-ink-soft hover:border-edge-line/80 hover:text-ink',
  danger: 'border-neon-pink/50 bg-transparent text-neon-pink/90 hover:bg-neon-pink/10',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  /** Skip the click blip (e.g. for the sound toggle itself). */
  silent?: boolean
}

export function Button({
  tone = 'ghost',
  size = 'md',
  icon,
  silent,
  className = '',
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  }
  return (
    <button
      type="button"
      onClick={(event) => {
        unlockSfx()
        if (!silent) playSfx('select')
        onClick?.(event)
      }}
      className={`inline-flex items-center justify-center rounded-xl border font-semibold tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${BUTTON_TONES[tone]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Panel({
  children,
  className = '',
  accent,
}: {
  children: ReactNode
  className?: string
  /** Hex color for the border glow. */
  accent?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-edge-line/30 bg-fa-card/85 backdrop-blur-md ${className}`}
      style={
        accent
          ? { borderColor: `${accent}66`, boxShadow: `0 0 24px ${accent}22, inset 0 0 30px ${accent}0d` }
          : undefined
      }
    >
      {children}
    </section>
  )
}

export function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-[11px] font-bold tracking-[0.28em] text-ink-mute">
      {icon && <span className="text-neon-cyan">{icon}</span>}
      {children}
    </h2>
  )
}

/** Cyan/pink gradient FaceArcade wordmark. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`wordmark font-display font-extrabold tracking-[0.18em] ${className}`}>FACEARCADE</span>
  )
}

/* ------------------------------------------------------------------ */
/* Game chrome                                                         */
/* ------------------------------------------------------------------ */

const CONTROL_EMOJI: Record<ControlKind, string> = {
  tilt: '↔️',
  move: '🙂',
  mouth: '😮',
  smile: '😄',
  wink: '😉',
  blink: '😑',
  brow: '🤨',
}

export function ControlBadge({ kind, accent }: { kind: ControlKind; accent?: string }) {
  const { t } = useT()

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-ink-soft"
      style={{ borderColor: accent ? `${accent}55` : undefined, background: accent ? `${accent}14` : undefined }}
    >
      <span aria-hidden>{CONTROL_EMOJI[kind]}</span>
      {t(CONTROL_LABEL[kind])}
    </span>
  )
}

export function Lives({ lives, max }: { lives: number; max: number }) {
  const { t } = useT()

  return (
    <span className="flex items-center gap-1" aria-label={t('hud.lives', { lives, max })}>
      {Array.from({ length: max }, (_, index) => (
        <Heart
          key={index}
          className={`h-4 w-4 ${index < lives ? 'fill-neon-pink text-neon-pink drop-shadow-[0_0_6px_rgba(255,63,214,0.8)]' : 'text-ink-mute/40'}`}
        />
      ))}
    </span>
  )
}

/** Small meter with a threshold marker, used for live calibration. */
export function ThresholdMeter({
  value,
  threshold,
  max = 1,
  color = '#3ff0ff',
}: {
  value: number
  threshold: number
  max?: number
  color?: string
}) {
  const v = Math.min(1, Math.max(0, value / max))
  const t = Math.min(1, Math.max(0, threshold / max))
  const active = value >= threshold
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-edge-line/20">
      <div
        className="h-full rounded-full transition-[width] duration-75"
        style={{ width: `${v * 100}%`, background: color, boxShadow: active ? `0 0 10px ${color}` : undefined }}
      />
      <span className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: `${t * 100}%` }} />
    </div>
  )
}
