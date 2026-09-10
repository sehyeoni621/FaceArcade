import { useCallback, useEffect, useRef, useState } from 'react'
import type { FaceInputBus } from '../arcade/faceInput'
import type { GameResult, HudState, ResolvedGame } from '../games/types'
import { translate } from '../i18n/core'
import { DIFFICULTY_SPEED, type Settings } from '../store/settings'
import { createRng } from '../utils/rng'
import { playSfx } from '../utils/sfx'

export type RunPhase = 'countdown' | 'playing' | 'paused' | 'face-lost' | 'finished'

export interface RunnerState {
  phase: RunPhase
  /** Whole seconds left in the countdown, when `phase` is `countdown`. */
  countdown: number
  timeLeft: number
  hud: HudState
}

export interface UseGameRunnerOptions {
  game: ResolvedGame
  bus: FaceInputBus
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  settings: Settings
  /** Seconds of countdown before the first tick. */
  countdownSec?: number
  onFinish: (result: GameResult) => void
}

export interface UseGameRunner extends RunnerState {
  pause: () => void
  resume: () => void
}

/** Largest step a single tick may take; a stalled tab must not teleport things. */
const MAX_DT = 0.05
/** No face for this long pauses the game. */
const FACE_LOST_SEC = 0.8
/** Seconds the final frame stays on screen before the result is reported. */
const FINISH_LINGER_SEC = 1.2
/** How often React sees HUD updates, in Hz. */
const HUD_HZ = 12

/**
 * Drives one game: owns the engine, the animation loop, the game clock, the
 * countdown, automatic pausing when the face leaves the frame, and canvas
 * sizing. React only sees a throttled HUD snapshot.
 */
export function useGameRunner({
  game,
  bus,
  canvasRef,
  settings,
  countdownSec = 3,
  onFinish,
}: UseGameRunnerOptions): UseGameRunner {
  const [state, setState] = useState<RunnerState>({
    phase: 'countdown',
    countdown: countdownSec,
    timeLeft: game.durationSec,
    hud: { score: 0 },
  })

  // The loop reads through refs so a re-render never restarts it.
  const onFinishRef = useRef(onFinish)
  const settingsRef = useRef(settings)
  useEffect(() => {
    onFinishRef.current = onFinish
    settingsRef.current = settings
  })

  const pauseRequestRef = useRef<'pause' | 'resume' | null>(null)

  const pause = useCallback(() => {
    pauseRequestRef.current = 'pause'
  }, [])
  const resume = useCallback(() => {
    pauseRequestRef.current = 'resume'
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const initialSettings = settingsRef.current
    const engine = game.create({
      difficulty: initialSettings.difficulty,
      speed: DIFFICULTY_SPEED[initialSettings.difficulty],
      rng: createRng(),
      durationSec: game.durationSec,
      sfx: playSfx,
      // Read through the ref rather than closing over a language, so
      // switching language mid-run relabels the canvas and the stats.
      t: (key, params) => translate(settingsRef.current.lang, key, params),
    })

    let phase: RunPhase = 'countdown'
    let countdown = countdownSec
    let elapsed = 0
    let lostFor = 0
    let finishLinger = 0
    let lastTick = performance.now()
    let lastHudPush = 0
    let lastWholeCountdown = Math.ceil(countdown)
    let rafId = 0
    let cancelled = false
    let manualPaused = false

    bus.clearEdges()

    const publish = (now: number, force = false) => {
      if (!force && now - lastHudPush < 1000 / HUD_HZ) return
      lastHudPush = now
      setState({
        phase,
        countdown: Math.max(0, Math.ceil(countdown)),
        timeLeft: Math.max(0, game.durationSec - elapsed),
        hud: engine.hud(),
      })
    }

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === 0 || height === 0) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const pw = Math.round(width * dpr)
      const ph = Math.round(height * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      engine.draw(ctx, width, height)
    }

    const tick = () => {
      if (cancelled) return
      rafId = requestAnimationFrame(tick)

      const now = performance.now()
      const dt = Math.min(MAX_DT, (now - lastTick) / 1000)
      lastTick = now

      const frame = bus.latest
      const fresh = bus.isFresh()
      const faceVisible = frame.face && fresh

      // Manual pause / resume requests from the UI.
      const request = pauseRequestRef.current
      pauseRequestRef.current = null
      if (request === 'pause' && (phase === 'playing' || phase === 'countdown' || phase === 'face-lost')) {
        manualPaused = true
        phase = 'paused'
        publish(now, true)
      } else if (request === 'resume' && phase === 'paused') {
        manualPaused = false
        // Resume through a short countdown so the player can get set.
        phase = 'countdown'
        countdown = Math.min(countdownSec, 2)
        lastWholeCountdown = Math.ceil(countdown)
        bus.clearEdges()
        publish(now, true)
      }

      switch (phase) {
        case 'countdown': {
          if (!faceVisible) {
            // Hold the countdown until a face is in frame.
            lostFor += dt
            if (lostFor > FACE_LOST_SEC) {
              phase = 'face-lost'
              publish(now, true)
            }
            break
          }
          lostFor = 0
          countdown -= dt
          const whole = Math.ceil(countdown)
          if (whole !== lastWholeCountdown && whole > 0) {
            lastWholeCountdown = whole
            playSfx('tick')
          }
          if (countdown <= 0) {
            phase = 'playing'
            bus.clearEdges()
            playSfx('go')
            publish(now, true)
          }
          break
        }

        case 'playing': {
          if (!faceVisible) {
            lostFor += dt
            if (lostFor > FACE_LOST_SEC) {
              phase = 'face-lost'
              publish(now, true)
            }
            // Freeze the clock while the face is missing, but let the last
            // known frame keep the picture alive.
            bus.consumeEdges()
            break
          }
          lostFor = 0
          elapsed += dt
          const timeLeft = Math.max(0, game.durationSec - elapsed)
          engine.update({ dt, t: elapsed, timeLeft, frame, edges: bus.consumeEdges() })
          if (engine.over || timeLeft <= 0) {
            phase = 'finished'
            finishLinger = 0
            playSfx('over')
            publish(now, true)
          }
          break
        }

        case 'face-lost': {
          bus.consumeEdges()
          if (faceVisible && !manualPaused) {
            phase = 'countdown'
            countdown = 1
            lastWholeCountdown = 1
            publish(now, true)
          }
          break
        }

        case 'paused': {
          bus.consumeEdges()
          break
        }

        case 'finished': {
          finishLinger += dt
          if (finishLinger >= FINISH_LINGER_SEC) {
            cancelled = true
            cancelAnimationFrame(rafId)
            onFinishRef.current(engine.result())
            return
          }
          break
        }
      }

      draw()
      publish(now)
    }

    publish(performance.now(), true)
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
    // Deliberately keyed on the game only: settings are read at start so a
    // slider change mid-run cannot change the rules under the player.
  }, [game, bus, canvasRef, countdownSec])

  return { ...state, pause, resume }
}
