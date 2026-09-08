import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cpu } from 'lucide-react'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { getGame } from '../games/registry'
import type { GameDefinition, GameResult } from '../games/types'
import { useFaceLandmarker } from '../hooks/useFaceLandmarker'
import { useFitBox } from '../hooks/useFitBox'
import { setEntryInitials, submitRun, type RunOutcome } from '../store/scores'
import { useSettings } from '../store/settings'
import { drawFaceMesh } from '../utils/drawFaceMesh'
import { FaceInputReader } from '../utils/gestureInput'
import { setSfxEnabled, unlockSfx } from '../utils/sfx'
import { FaceInputBus, FaceInputContext } from './faceInput'
import { TabBar, type TabKey } from './TabBar'
import { CameraErrorScreen } from './screens/CameraErrorScreen'
import { LobbyScreen } from './screens/LobbyScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ReadyScreen } from './screens/ReadyScreen'
import { RecordsScreen } from './screens/RecordsScreen'
import { ResultScreen } from './screens/ResultScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SplashScreen } from './screens/SplashScreen'

type Screen =
  | { name: 'lobby' }
  | { name: 'ready'; gameId: string }
  | { name: 'play'; gameId: string; runId: number }
  | { name: 'result'; gameId: string; result: GameResult; outcome: RunOutcome }
  | { name: 'records'; gameId?: string }
  | { name: 'settings' }

/** Below this the game loop visibly stutters; warn so the player knows why. */
const LOW_FPS = 15

/** Which tab is lit for each top-level screen; other screens hide the bar. */
const TAB_FOR_SCREEN: Partial<Record<Screen['name'], TabKey>> = {
  lobby: 'games',
  records: 'records',
  settings: 'settings',
}

/** Space reserved above/below the stage while playing, matching PlayScreen's bars. */
const PLAY_INSET = { top: 76, bottom: 92 }

/**
 * Application root for the arcade: owns the single camera pipeline and the
 * persistent video stage, routes between screens, and shows the global
 * overlays (camera error, low performance).
 *
 * The `<video>` element must never remount - the pipeline attaches the stream
 * to it once - so the stage lives here and screens are layered on top.
 */
export default function Arcade() {
  const settings = useSettings()
  const bus = useMemo(() => new FaceInputBus(), [])
  // Created once; thresholds/mirror are pushed in by the effect below.
  const reader = useMemo(() => new FaceInputReader(), [])

  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageAreaRef = useRef<HTMLDivElement | null>(null)

  const [screen, setScreen] = useState<Screen>({ name: 'lobby' })
  const [booted, setBooted] = useState(false)
  const [cameraLost, setCameraLost] = useState(false)
  const [faceVisible, setFaceVisible] = useState(false)
  const runCounter = useRef(0)

  // Refs mirror the bits of state the per-frame callback needs.
  const screenRef = useRef(screen)
  const settingsRef = useRef(settings)
  useEffect(() => {
    screenRef.current = screen
    settingsRef.current = settings
    reader.configure({ thresholds: settings.thresholds, mirror: settings.mirror })
  })

  useEffect(() => setSfxEnabled(settings.sound), [settings.sound])

  const handleFrame = useCallback(
    (result: FaceLandmarkerResult, video: HTMLVideoElement) => {
      const landmarks = result.faceLandmarks[0]
      const categories = result.faceBlendshapes?.[0]?.categories
      const aspect = video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1
      const { frame, edges } = reader.read(landmarks, categories, aspect)
      bus.push(frame, edges, landmarks)

      const canvas = meshCanvasRef.current
      if (!canvas) return
      const current = screenRef.current.name
      const wantMesh = settingsRef.current.showMesh && (current === 'play' || current === 'ready')
      if (wantMesh) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        const ctx = canvas.getContext('2d')
        if (ctx) drawFaceMesh(ctx, result.faceLandmarks, canvas.width, canvas.height)
      } else if (canvas.width > 0) {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      }
    },
    [bus, reader],
  )

  // Dev-only hook so the games can be driven without a webcam
  // (e.g. `window.__faceArcade.bus.push(frame, edges)` from the console).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const global = window as unknown as { __faceArcade?: unknown }
    global.__faceArcade = { bus, reader }
    return () => {
      delete global.__faceArcade
    }
  }, [bus, reader])

  const videoConstraints = useMemo<MediaTrackConstraints | undefined>(() => {
    if (!settings.cameraDeviceId) return undefined
    const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
    return coarse
      ? { deviceId: { exact: settings.cameraDeviceId }, width: { ideal: 720 } }
      : { deviceId: { exact: settings.cameraDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
  }, [settings.cameraDeviceId])

  const { videoRef, status, error, fps, delegate, videoSize, restart } = useFaceLandmarker({
    onFrame: handleFrame,
    videoConstraints,
  })

  // The hook reads constraints once at start, so a device change needs a restart.
  const firstDeviceRender = useRef(true)
  useEffect(() => {
    if (firstDeviceRender.current) {
      firstDeviceRender.current = false
      return
    }
    restart()
  }, [settings.cameraDeviceId, restart])

  // Derived-state adjustments, done during render as React recommends.
  if (status === 'ready' && !booted) setBooted(true)
  // A restart (retry, device change) moves the status off `ready`; that clears
  // a "camera disconnected" flag the track's `ended` event had set.
  if (cameraLost && status !== 'ready') setCameraLost(false)

  useEffect(() => {
    if (status !== 'ready') return
    reader.reset()

    // Another app grabbing the camera ends the track without an error.
    const stream = videoRef.current?.srcObject
    if (!(stream instanceof MediaStream)) return
    const tracks = stream.getVideoTracks()
    const onEnded = () => setCameraLost(true)
    tracks.forEach((track) => track.addEventListener('ended', onEnded))
    return () => tracks.forEach((track) => track.removeEventListener('ended', onEnded))
  }, [status, videoRef, reader])

  // Coarse face presence for screens that only need a yes/no.
  useEffect(() => {
    const id = window.setInterval(() => {
      const visible = bus.latest.face && bus.isFresh()
      setFaceVisible((previous) => (previous === visible ? previous : visible))
    }, 120)
    return () => window.clearInterval(id)
  }, [bus])

  /* ---------------------------- navigation ---------------------------- */

  const goLobby = useCallback(() => setScreen({ name: 'lobby' }), [])
  const goReady = useCallback((game: GameDefinition) => setScreen({ name: 'ready', gameId: game.id }), [])
  const startRun = useCallback((gameId: string) => {
    unlockSfx()
    runCounter.current += 1
    setScreen({ name: 'play', gameId, runId: runCounter.current })
  }, [])
  const finishRun = useCallback((gameId: string, result: GameResult) => {
    const outcome = submitRun(gameId, result.score)
    setScreen({ name: 'result', gameId, result, outcome })
  }, [])

  /* ------------------------------ layout ------------------------------ */

  const aspect = videoSize.width > 0 && videoSize.height > 0 ? videoSize.width / videoSize.height : 16 / 9
  const stageMode: 'ambient' | 'live' | 'fit' =
    screen.name === 'play' ? 'fit' : screen.name === 'ready' ? 'live' : 'ambient'
  const fit = useFitBox(stageAreaRef, aspect)

  const game = 'gameId' in screen && screen.gameId ? getGame(screen.gameId) : undefined
  const showError = status === 'error' || (cameraLost && status === 'ready')
  const showSplash = !showError && (!booted || status !== 'ready')
  const lowFps = status === 'ready' && fps > 0 && fps < LOW_FPS

  return (
    <FaceInputContext.Provider value={bus}>
      <div className="fixed inset-0 overflow-hidden bg-fa-void text-ink">
        {/* Ambient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(80,40,200,.25),transparent 70%)' }}
        />

        {/* Camera stage: always mounted, restyled per screen. */}
        <div
          ref={stageAreaRef}
          className="absolute flex items-center justify-center transition-[inset] duration-300"
          style={
            stageMode === 'fit'
              ? { top: PLAY_INSET.top, bottom: PLAY_INSET.bottom, left: 8, right: 8 }
              : { inset: 0 }
          }
        >
          <div
            className={`relative overflow-hidden bg-fa-stage transition-[filter,opacity] duration-500 ${
              stageMode === 'fit' ? 'rounded-2xl border border-edge-line/30 shadow-[0_0_40px_rgba(63,240,255,0.12)]' : ''
            } ${stageMode === 'ambient' ? 'opacity-30 blur-md saturate-50' : 'opacity-100'}`}
            style={
              stageMode === 'fit' && fit.width > 0
                ? { width: fit.width, height: fit.height }
                : { position: 'absolute', inset: 0 }
            }
          >
            <video
              ref={videoRef}
              className={`absolute inset-0 h-full w-full object-cover ${settings.mirror ? '-scale-x-100' : ''}`}
              playsInline
              muted
              autoPlay
            />
            <canvas
              ref={meshCanvasRef}
              className={`pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80 ${
                settings.mirror ? '-scale-x-100' : ''
              }`}
            />
            <canvas
              ref={gameCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ display: stageMode === 'fit' ? 'block' : 'none' }}
            />
            {stageMode !== 'ambient' && (
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(4,4,26,0.7)]" />
            )}
          </div>
        </div>

        {/* Screen layer */}
        <div className="absolute inset-0">
          {showError ? (
            <CameraErrorScreen
              kind={status === 'error' ? 'pipeline' : 'disconnected'}
              message={error}
              onRetry={restart}
            />
          ) : showSplash ? (
            <SplashScreen status={status} />
          ) : screen.name === 'lobby' ? (
            <LobbyScreen faceDetected={faceVisible} fps={fps} onPlay={goReady} />
          ) : screen.name === 'ready' && game ? (
            <ReadyScreen game={game} onStart={() => startRun(game.id)} onBack={goLobby} />
          ) : screen.name === 'play' && game ? (
            <PlayScreen
              key={screen.runId}
              game={game}
              bus={bus}
              canvasRef={gameCanvasRef}
              settings={settings}
              onFinish={(result) => finishRun(game.id, result)}
              onQuit={goLobby}
              onRestart={() => startRun(game.id)}
            />
          ) : screen.name === 'result' && game ? (
            <ResultScreen
              game={game}
              result={screen.result}
              outcome={screen.outcome}
              onSaveInitials={(initials) => {
                if (screen.outcome.entryId) setEntryInitials(game.id, screen.outcome.entryId, initials)
              }}
              onRetry={() => startRun(game.id)}
              onLobby={goLobby}
              onRecords={() => setScreen({ name: 'records', gameId: game.id })}
            />
          ) : screen.name === 'records' ? (
            <RecordsScreen
              initialGameId={screen.gameId}
              onPlay={(gameId) => {
                const target = getGame(gameId)
                if (target) goReady(target)
              }}
            />
          ) : screen.name === 'settings' ? (
            <SettingsScreen />
          ) : (
            <LobbyScreen faceDetected={faceVisible} fps={fps} onPlay={goReady} />
          )}
        </div>

        {/* Bottom tab bar - only on the three top-level screens. */}
        {!showError && !showSplash && TAB_FOR_SCREEN[screen.name] && (
          <TabBar
            active={TAB_FOR_SCREEN[screen.name]!}
            onNavigate={(tab) => {
              if (tab === 'games') goLobby()
              else if (tab === 'records') setScreen({ name: 'records' })
              else setScreen({ name: 'settings' })
            }}
          />
        )}

        {/* Low performance banner */}
        {lowFps && !showError && !showSplash && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full border border-neon-pink/40 bg-fa-void/85 px-3 py-1 text-[11px] text-neon-pink backdrop-blur">
              <Cpu className="h-3 w-3" />
              성능 저하 · {fps} FPS{delegate === 'CPU' ? ' · GPU 가속 불가, CPU 모드' : ''} — 다른 탭을 닫거나 창을 줄여 보세요
            </span>
          </div>
        )}
      </div>
    </FaceInputContext.Provider>
  )
}
