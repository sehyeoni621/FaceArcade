import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { CONTROL_LABEL, type GameDefinition } from '../../games/types'
import { useFaceInputBus } from '../faceInput'
import { isFaceAligned } from '../format'

/** Seconds the mouth has to stay open to start hands-free. */
const MOUTH_HOLD_SEC = 1

/**
 * Pre-game screen: a dashed alignment oval over the live camera, the controls
 * for the game about to start, and two ways in - the button, or holding the
 * mouth open so no hands are needed.
 */
export function ReadyScreen({
  game,
  onStart,
  onBack,
}: {
  game: GameDefinition
  onStart: () => void
  onBack: () => void
}) {
  const bus = useFaceInputBus()
  const [faceDetected, setFaceDetected] = useState(false)
  const [aligned, setAligned] = useState(false)
  const [hold, setHold] = useState(0)

  // Poll the bus rather than subscribing per frame: 20 Hz is plenty for a
  // progress ring and keeps this screen off the inference hot path.
  useEffect(() => {
    let holdSec = 0
    let last = performance.now()
    let started = false
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const frame = bus.latest
      const visible = frame.face && bus.isFresh()
      setFaceDetected(visible)
      setAligned(visible && isFaceAligned(frame))

      if (visible && frame.mouthOpened) holdSec = Math.min(MOUTH_HOLD_SEC, holdSec + dt)
      else holdSec = Math.max(0, holdSec - dt * 2)
      setHold(holdSec / MOUTH_HOLD_SEC)

      if (holdSec >= MOUTH_HOLD_SEC && !started) {
        started = true
        onStart()
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [bus, onStart])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault()
        onStart()
      } else if (event.key === 'Escape') {
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart, onBack])

  const statusColor = aligned ? '#3dff7a' : faceDetected ? '#3ff0ff' : '#8a90c8'
  const statusText = aligned ? '정렬 완료' : faceDetected ? '얼굴을 가운데로' : '얼굴을 보여주세요'

  return (
    <div className="relative flex h-full flex-col">
      {/* Scrims so the HUD stays readable over the live camera. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,rgba(4,4,26,.7),transparent 25%,transparent 55%,rgba(4,4,26,.95) 80%)',
        }}
      />

      {/* Alignment oval */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center pb-44">
        <div
          className="align-oval w-[62%] max-w-[280px] transition-colors duration-300"
          style={{
            borderColor: statusColor,
            boxShadow: `0 0 30px ${statusColor}80, inset 0 0 30px ${statusColor}33`,
          }}
        />
      </div>

      {/* Top bar */}
      <div className="page-gutter relative flex items-center justify-between !pb-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="로비로"
          className="grid h-touch w-touch place-items-center rounded-full border-[1.5px] border-edge-violet/60 bg-[#06082a]/85 text-white transition active:scale-95"
        >
          <ChevronLeft className="h-[18px] w-[18px]" />
        </button>

        <span
          className="flex items-center gap-2 rounded-full border-[1.5px] bg-[#06082a]/85 px-4 py-2.5 text-sm font-bold text-white"
          style={{ borderColor: statusColor }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
          />
          {statusText}
        </span>

        <span className="w-touch" />
      </div>

      <div className="flex-1" />

      {/* Controls for the run about to start */}
      <div className="page-gutter relative flex flex-col gap-3 !pt-0">
        <div
          className="flex items-center gap-3 rounded-2xl border-[1.5px] bg-fa-card/90 px-4 py-3.5"
          style={{ borderColor: game.accent }}
        >
          <span
            className="grid h-11 w-11 flex-none place-items-center rounded-xl text-2xl"
            style={{ background: `${game.accent}26` }}
          >
            {game.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[11px] tracking-[2px] text-ink-mute">NEXT UP</div>
            <div className="truncate text-lg font-black text-white">{game.title}</div>
          </div>
          <div className="flex flex-none flex-col items-end gap-1 text-xs text-ink-soft">
            {game.controls.slice(0, 2).map((control) => (
              <span key={control}>
                <b style={{ color: game.accent }}>{CONTROL_LABEL[control]}</b>
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!faceDetected}
          className="relative h-[52px] w-full overflow-hidden rounded-2xl border-2 border-neon-cyan bg-[#06082a]/85 font-display text-[15px] font-extrabold tracking-[2px] text-ink-ice transition active:scale-[0.98] disabled:opacity-40"
        >
          {/* Mouth-hold progress fills the button itself. */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-neon-green/25"
            style={{ width: `${hold * 100}%` }}
          />
          <span className="relative">
            {hold > 0 ? '입을 벌린 채 유지…' : 'START'}
          </span>
        </button>

        <p className="text-center text-[11px] text-ink-mute">
          입을 1초간 벌려도 시작됩니다 · Space
        </p>
      </div>
    </div>
  )
}
