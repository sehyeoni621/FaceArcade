import { useEffect, useState } from 'react'
import { Pause, ScanFace } from 'lucide-react'
import type { GameDefinition, GameResult } from '../../games/types'
import { useGameRunner } from '../../hooks/useGameRunner'
import type { Settings } from '../../store/settings'
import type { FaceInputBus } from '../faceInput'
import { formatClock } from '../format'
import { Lives } from '../ui'

/**
 * In-game chrome: a portrait HUD across the top (score / clock / pause+combo),
 * a face-tracking pill under it, and full-screen overlays for the countdown,
 * a lost face, and pause. The game paints onto the canvas the root keeps
 * inside the camera stage.
 */
export function PlayScreen({
  game,
  bus,
  canvasRef,
  settings,
  onFinish,
  onQuit,
  onRestart,
}: {
  game: GameDefinition
  bus: FaceInputBus
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  settings: Settings
  onFinish: (result: GameResult) => void
  onQuit: () => void
  onRestart: () => void
}) {
  const runner = useGameRunner({ game, bus, canvasRef, settings, onFinish })
  const { phase, countdown, timeLeft, hud, pause, resume } = runner
  const [tracking, setTracking] = useState(0)

  // Face-tracking strength for the pill meter, sampled well below frame rate.
  useEffect(() => {
    const id = window.setInterval(() => {
      const fresh = bus.latest.face && bus.isFresh()
      setTracking(fresh ? 1 : 0)
    }, 150)
    return () => window.clearInterval(id)
  }, [bus])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        event.preventDefault()
        if (phase === 'paused') resume()
        else if (phase === 'playing' || phase === 'countdown' || phase === 'face-lost') pause()
      } else if (event.code === 'Space' && phase === 'paused') {
        event.preventDefault()
        resume()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, pause, resume])

  const urgent = phase === 'playing' && timeLeft <= 10
  const canPause = phase === 'playing' || phase === 'countdown' || phase === 'face-lost'
  const timePercent = Math.max(0, Math.min(100, (timeLeft / game.durationSec) * 100))

  return (
    <div className="relative flex h-full flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,rgba(4,4,26,.85),transparent 22%,transparent 50%,rgba(4,4,26,.95) 72%)',
        }}
      />

      {/* HUD */}
      <div className="page-gutter relative flex items-start justify-between gap-2.5 !pb-0">
        <div className="flex flex-col rounded-xl border-[1.5px] border-neon-cyan/60 bg-[#06082a]/85 px-3.5 py-2">
          <span className="font-display text-[10px] tracking-[2px] text-ink-mute">SCORE</span>
          <span
            className="font-display text-[26px] font-extrabold leading-[1.1] tabular-nums text-neon-cyan"
            style={{ textShadow: '0 0 14px rgba(63,240,255,.7)' }}
          >
            {hud.score}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 pt-1">
          <div
            className={`font-display text-[30px] font-extrabold leading-none tabular-nums ${
              urgent ? 'animate-fa-pulse text-neon-pink' : 'text-white'
            }`}
            style={{ textShadow: '0 0 14px rgba(255,255,255,.6)' }}
          >
            {formatClock(timeLeft)}
          </div>
          <div className="h-[5px] w-[110px] overflow-hidden rounded-[3px] bg-[#3c3c82]/60">
            <div
              className="h-full transition-[width] duration-1000 ease-linear"
              style={{
                width: `${timePercent}%`,
                background: 'linear-gradient(90deg,#3ff0ff,#ff3fd6)',
              }}
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={phase === 'paused' ? resume : pause}
            disabled={!canPause && phase !== 'paused'}
            aria-label="일시정지"
            className="grid h-touch w-touch place-items-center rounded-xl border-[1.5px] border-edge-violet/60 bg-[#06082a]/85 text-white transition active:scale-95 disabled:opacity-40"
          >
            <Pause className="h-4 w-4 fill-current" />
          </button>
          {hud.combo !== undefined && hud.combo > 1 && (
            <span
              className="rounded-[10px] border-[1.5px] border-neon-pink bg-[#06082a]/85 px-2.5 py-1.5 font-display text-sm font-extrabold text-neon-pink"
              style={{ textShadow: '0 0 10px rgba(255,63,214,.7)' }}
            >
              x{hud.combo}
            </span>
          )}
        </div>
      </div>

      {/* Face-tracking pill */}
      <div className="relative mx-4 mt-3 flex items-center gap-2 self-start rounded-full border-[1.5px] bg-[#06082a]/85 px-3 py-2 text-xs text-white"
        style={{ borderColor: tracking > 0 ? '#3dff7a' : '#ff3fd6' }}
      >
        <span
          className="h-2 w-2 animate-fa-pulse rounded-full"
          style={{
            background: tracking > 0 ? '#3dff7a' : '#ff3fd6',
            boxShadow: `0 0 10px ${tracking > 0 ? '#3dff7a' : '#ff3fd6'}`,
          }}
        />
        {tracking > 0 ? '얼굴 감지' : '얼굴 없음'}
        {hud.lives !== undefined && hud.maxLives !== undefined && (
          <Lives lives={hud.lives} max={hud.maxLives} />
        )}
        {hud.label && <span className="font-mono text-[11px] text-ink-dim">{hud.label}</span>}
      </div>

      <div className="flex-1" />

      {/* Overlays */}
      {phase === 'countdown' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span
            key={countdown}
            className="font-display text-[150px] font-extrabold leading-none text-white"
            style={{ textShadow: '0 0 40px #3ff0ff,0 0 80px #ff3fd6', animation: 'fa-count 1s ease-out' }}
          >
            {countdown > 0 ? countdown : 'GO'}
          </span>
        </div>
      )}

      {phase === 'face-lost' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-8">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-neon-pink bg-[#06082a]/90 px-6 py-5 text-center">
            <ScanFace className="h-8 w-8 animate-fa-pulse text-neon-pink" />
            <p className="font-display text-sm tracking-[0.25em] text-neon-pink">얼굴을 놓쳤어요</p>
            <p className="text-xs text-ink-soft">
              카메라 정면으로 돌아오면 자동으로 이어집니다. 시간은 멈춰 있어요.
            </p>
          </div>
        </div>
      )}

      {phase === 'finished' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span
            className="font-display text-5xl font-black tracking-[0.2em] text-white"
            style={{ textShadow: `0 0 30px ${game.accent}` }}
          >
            TIME UP
          </span>
        </div>
      )}

      {phase === 'paused' && (
        <PauseOverlay
          score={hud.score}
          timeLeft={timeLeft}
          soundOn={settings.sound}
          onResume={resume}
          onRestart={onRestart}
          onQuit={onQuit}
        />
      )}

      <style>{`@keyframes fa-count{0%{transform:scale(1.6);opacity:0}30%{transform:scale(1);opacity:1}100%{opacity:1}}`}</style>
    </div>
  )
}

/** Full-screen pause, per the mobile artboard - not a small dialog. */
function PauseOverlay({
  score,
  timeLeft,
  soundOn,
  onResume,
  onRestart,
  onQuit,
}: {
  score: number
  timeLeft: number
  soundOn: boolean
  onResume: () => void
  onRestart: () => void
  onQuit: () => void
}) {
  return (
    <div className="page-gutter absolute inset-0 z-30 flex flex-col justify-center gap-3.5 bg-[#020210]/[.92] text-center">
      <h2
        className="mb-5 font-display text-[40px] font-extrabold tracking-[6px] text-white"
        style={{ textShadow: '0 0 24px #3ff0ff' }}
      >
        PAUSED
      </h2>

      <div className="mb-5 flex justify-center gap-6">
        <div>
          <div className="font-display text-[11px] tracking-[2px] text-ink-mute">SCORE</div>
          <div className="font-display text-[26px] font-extrabold tabular-nums text-neon-cyan">{score}</div>
        </div>
        <div>
          <div className="font-display text-[11px] tracking-[2px] text-ink-mute">TIME</div>
          <div className="font-display text-[26px] font-extrabold tabular-nums text-white">
            {formatClock(timeLeft)}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onResume}
        className="h-[58px] rounded-2xl border-2 border-neon-cyan bg-neon-cyan/20 text-lg font-black text-ink-ice transition active:scale-[0.98]"
        style={{ boxShadow: '0 0 22px rgba(63,240,255,.4)' }}
      >
        계속하기
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="h-[52px] rounded-2xl border-[1.5px] border-edge-violet/70 bg-fa-card/80 text-base font-bold text-ink transition active:scale-[0.98]"
      >
        다시 시작
      </button>
      <button
        type="button"
        onClick={onQuit}
        className="h-[52px] rounded-2xl border-[1.5px] border-edge-violet/70 bg-fa-card/80 text-base font-bold text-ink transition active:scale-[0.98]"
      >
        로비로 나가기
      </button>

      <p className="mt-5 text-[13px] text-neon-cyan">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: soundOn ? '#3ff0ff' : '#8a90c8' }}
          />
          사운드 {soundOn ? 'ON' : 'OFF'}
        </span>
      </p>
    </div>
  )
}
