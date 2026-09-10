import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import confetti from 'canvas-confetti'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { useFaceLandmarker } from './hooks/useFaceLandmarker'
import { useDocumentLang, useT } from './i18n'
import { drawFaceMesh } from './utils/drawFaceMesh'
import {
  blendshapeScore,
  EMPTY_GESTURES,
  MAX_HEAD_TILT_DEG,
  readGestures,
  toBlendshapeMap,
} from './utils/faceGestures'

/* Palette lifted from the dashboard artboard. */
const CYAN = '#3ff0ff'
const GREEN = '#3dff7a'
const PINK = '#ff3fd6'
const PURPLE = '#b06cff'

const GRAD_PINK = 'linear-gradient(90deg,#7b5cff,#ff3fd6)'
const GRAD_BLUE = 'linear-gradient(90deg,#5b6cff,#3ff0ff)'

/** Minimum gap between celebratory confetti bursts, in ms. */
const CONFETTI_COOLDOWN_MS = 2500

export default function App() {
  const { t } = useT()
  useDocumentLang()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wasSmilingRef = useRef(false)
  const lastConfettiAtRef = useRef(0)

  const [running, setRunning] = useState(true)
  const [showMesh, setShowMesh] = useState(true)

  const handleFrame = useCallback((result: FaceLandmarkerResult, video: HTMLVideoElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Keep the backing store locked to the camera resolution so the mesh lines
    // up with the video pixel for pixel.
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    const ctx = canvas.getContext('2d')
    if (ctx) drawFaceMesh(ctx, result.faceLandmarks, canvas.width, canvas.height)

    // Fire confetti on the rising edge of a smile, not on every smiling frame.
    const { smiling } = readGestures(result.faceLandmarks[0], result.faceBlendshapes?.[0]?.categories)
    const now = performance.now()
    if (smiling && !wasSmilingRef.current && now - lastConfettiAtRef.current > CONFETTI_COOLDOWN_MS) {
      lastConfettiAtRef.current = now
      void confetti({
        particleCount: 70,
        spread: 68,
        startVelocity: 32,
        origin: { y: 0.7 },
        colors: [CYAN, PINK, GREEN, PURPLE],
        disableForReducedMotion: true,
      })
    }
    wasSmilingRef.current = smiling
  }, [])

  const { videoRef, status, error, fps, result, videoSize, restart } = useFaceLandmarker({
    enabled: running,
    onFrame: handleFrame,
  })

  const aspectRatio = videoSize.height > 0 ? videoSize.width / videoSize.height : 1
  const stageAspect =
    videoSize.width > 0 && videoSize.height > 0
      ? `${videoSize.width} / ${videoSize.height}`
      : '16 / 9'

  const gestures = useMemo(() => {
    if (!result) return EMPTY_GESTURES
    return readGestures(result.faceLandmarks[0], result.faceBlendshapes?.[0]?.categories, aspectRatio)
  }, [result, aspectRatio])

  const shapes = useMemo(
    () => toBlendshapeMap(result?.faceBlendshapes?.[0]?.categories),
    [result],
  )

  const landmarkCount = result?.faceLandmarks?.[0]?.length ?? 0
  const blendshapeCount = result?.faceBlendshapes?.[0]?.categories?.length ?? 0
  const cameraLive = status === 'ready'

  // Clear the overlay whenever the pipeline stops, so no stale mesh is left behind.
  useEffect(() => {
    if (status === 'ready' && showMesh) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [status, showMesh])

  const tilt = Math.max(-MAX_HEAD_TILT_DEG, Math.min(MAX_HEAD_TILT_DEG, gestures.headTilt))

  return (
    <div className="relative min-h-full overflow-hidden bg-fa-void">
      {/* Ambient wash + receding grid floor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(80,40,200,.25),transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-[34%] animate-fa-grid"
      />

      <div className="page-gutter relative mx-auto flex max-w-[1540px] flex-col gap-4">
        <Header
          cameraLive={cameraLive}
          showMesh={showMesh}
          onToggleMesh={() => setShowMesh((on) => !on)}
        />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
          {/* ---------------- Left: camera stage + feature strip ---------------- */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            <div
              className="relative rounded-[18px] border-2 border-neon-cyan/75 bg-fa-deep/80 p-2"
              style={{
                boxShadow:
                  '0 0 28px rgba(63,240,255,.35),0 0 60px rgba(120,90,255,.2),inset 0 0 20px rgba(63,240,255,.08)',
              }}
            >
              <div
                className="relative overflow-hidden rounded-xl bg-fa-stage"
                style={{ aspectRatio: stageAspect }}
              >
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-[.85]"
                  style={{ display: showMesh ? 'block' : 'none' }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top,rgba(4,4,26,.55),transparent 35%)',
                  }}
                />

                <StageBadge className="left-3.5 top-3.5">
                  <span
                    className="h-[9px] w-[9px] animate-fa-pulse rounded-full bg-neon-green"
                    style={{ boxShadow: `0 0 8px ${GREEN}` }}
                  />
                  <span className="font-bold text-white">{t('debug.liveWebcam')}</span>
                  <span className="h-3.5 w-px bg-edge-line/40" />
                  <span className="text-ink-dim">
                    {videoSize.width > 0
                      ? `${videoSize.width} × ${videoSize.height}`
                      : t('debug.awaitingResolution')}
                    &nbsp;·&nbsp;{fps} FPS
                  </span>
                </StageBadge>

                <StageBadge className="right-3.5 top-3.5 text-ink-ice">
                  <span
                    className="h-2 w-2 rounded-full bg-neon-cyan"
                    style={{ boxShadow: `0 0 8px ${CYAN}` }}
                  />
                  MediaPipe Face Landmarker
                </StageBadge>

                <StageBadge className="bottom-[18px] left-3.5 gap-3 px-4 py-3 text-ink-bright">
                  <FaceScanIcon />
                  <span className="flex flex-col gap-[3px]">
                    <span>
                      {t('debug.landmarks')}:{' '}
                      <b className="text-white">{t('unit.count', { n: landmarkCount })}</b>
                    </span>
                    <span>
                      {t('debug.blendshapes')}:{' '}
                      <b className="text-white">{t('unit.count', { n: blendshapeCount })}</b>
                    </span>
                  </span>
                </StageBadge>

                <div
                  className="pointer-events-none absolute bottom-[18px] right-3.5 w-[190px] rounded-xl border-[1.5px] border-edge-violet/70 bg-[#06082a]/[.86] p-2.5"
                  style={{ boxShadow: '0 0 18px rgba(120,90,255,.35)' }}
                >
                  <div className="grid h-[140px] place-items-center">
                    <LandmarkWireframe />
                  </div>
                  <div className="flex items-center gap-2 border-t border-edge-line/30 px-1 pt-1 text-xs text-ink-soft">
                    <span className="h-[7px] w-[7px] rounded-full bg-neon-cyan" />
                    {t('debug.landmarks3d')}
                  </div>
                </div>

                {status !== 'ready' && (
                  <StageOverlay status={status} error={error} onRetry={restart} running={running} />
                )}

                {cameraLive && !gestures.faceDetected && (
                  <div className="pointer-events-none absolute inset-x-0 top-[60px] mx-auto w-fit rounded-full border border-neon-pink/50 bg-[#06082a]/90 px-4 py-1.5 text-[13px] text-neon-pink">
                    {t('debug.noFace')}
                  </div>
                )}
              </div>
            </div>

            <FeatureStrip />
          </div>

          {/* ---------------- Right: live detection panel ---------------- */}
          <div className="flex min-w-0 flex-col gap-5">
            <section
              className="flex flex-col gap-3.5 rounded-[18px] border-2 border-edge-orchid/75 bg-fa-card/85 p-5"
              style={{
                boxShadow: '0 0 28px rgba(160,90,255,.3),inset 0 0 24px rgba(120,90,255,.08)',
              }}
            >
              <h2
                className="flex items-center gap-3 text-[21px] font-bold text-neon-cyan"
                style={{ textShadow: '0 0 12px rgba(63,240,255,.6)' }}
              >
                <WaveIcon />
                {t('debug.liveStatus')}
              </h2>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
                <StatusCard
                  label={t('debug.smile')}
                  on={gestures.smiling}
                  accent={GREEN}
                  value={gestures.smiling ? 'ON' : 'OFF'}
                  icon={<SmileIcon color={gestures.smiling ? GREEN : PURPLE} />}
                />
                <StatusCard
                  label={t('debug.mouthOpen')}
                  on={gestures.mouthOpen}
                  accent={PINK}
                  value={gestures.mouthOpen ? 'ON' : 'OFF'}
                  icon={<MouthIcon color={gestures.mouthOpen ? PINK : PURPLE} />}
                />
                <StatusCard
                  label={t('debug.blink')}
                  on={gestures.blinking}
                  accent={CYAN}
                  value={gestures.blinking ? 'ON' : 'OFF'}
                  icon={<EyeIcon color={gestures.blinking ? CYAN : PURPLE} />}
                />
                <StatusCard
                  label={t('debug.headTilt')}
                  on={false}
                  accent={PURPLE}
                  value={`${tilt.toFixed(1)}°`}
                  icon={<TiltHeadIcon color={PURPLE} size={34} />}
                  pillStyle={{
                    background: 'rgba(30,60,160,.9)',
                    color: '#fff',
                    boxShadow: '0 0 12px rgba(90,110,255,.6)',
                  }}
                />
              </div>

              <TiltCard tilt={tilt} />
              <FpsCard fps={fps} />
              <BlendshapeCard
                rows={[
                  { name: 'mouthSmileLeft', value: blendshapeScore(shapes, 'mouthSmileLeft'), grad: GRAD_PINK, glow: PINK },
                  { name: 'mouthSmileRight', value: blendshapeScore(shapes, 'mouthSmileRight'), grad: GRAD_PINK, glow: PINK },
                  { name: 'jawOpen', value: blendshapeScore(shapes, 'jawOpen'), grad: GRAD_BLUE, glow: CYAN },
                  { name: 'eyeBlinkLeft', value: blendshapeScore(shapes, 'eyeBlinkLeft'), grad: GRAD_BLUE, glow: CYAN },
                  { name: 'eyeBlinkRight', value: blendshapeScore(shapes, 'eyeBlinkRight'), grad: GRAD_BLUE, glow: CYAN },
                ]}
              />
            </section>

            <div className="flex justify-end">
              <StartButton running={running} onClick={() => setRunning((on) => !on)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Header({
  cameraLive,
  showMesh,
  onToggleMesh,
}: {
  cameraLive: boolean
  showMesh: boolean
  onToggleMesh: () => void
}) {
  const { t } = useT()
  const dot = cameraLive ? GREEN : PINK

  return (
    <header
      className="flex flex-wrap items-center gap-[22px] border-b border-edge-rule/35 px-2 pb-3.5 pt-1.5"
      style={{ boxShadow: '0 12px 30px -20px rgba(80,120,255,.6)' }}
    >
      <div className="flex items-center gap-4">
        <LogoMark />
        <div className="wordmark font-display text-[38px] font-extrabold tracking-[-.5px]">
          FaceArcade
        </div>
      </div>
      <div className="hidden h-7 w-px bg-edge-line/45 sm:block" />
      <div className="hidden text-[15px] text-ink-dim sm:block">Your Face, Play the Game!</div>
      <div className="flex-1" />

      <div
        className="flex items-center gap-2.5 rounded-full border-[1.5px] border-neon-cyan/60 bg-[#0a1432]/70 px-[18px] py-[9px] text-sm font-medium text-ink-ice"
        style={{
          boxShadow: '0 0 16px rgba(63,240,255,.25),inset 0 0 12px rgba(63,240,255,.08)',
        }}
      >
        <span
          className="h-[9px] w-[9px] rounded-full"
          style={{ background: dot, boxShadow: `0 0 8px ${dot}` }}
        />
        {cameraLive ? t('debug.cameraConnected') : t('debug.cameraDropped')}
      </div>

      <button
        type="button"
        onClick={onToggleMesh}
        aria-pressed={showMesh}
        title={showMesh ? t('debug.meshHide') : t('debug.meshShow')}
        className={`grid h-[42px] w-[42px] place-items-center rounded-full border-[1.5px] bg-[#140f3c]/80 transition hover:border-neon-pink hover:text-[#ff8fe8] ${
          showMesh ? 'border-neon-cyan/70 text-neon-cyan' : 'border-edge-rule/60 text-[#a99bff]'
        }`}
        style={{ boxShadow: '0 0 14px rgba(120,90,255,.3)' }}
      >
        <span className="sr-only">{t('debug.meshToggle')}</span>
        <GearIcon />
      </button>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Camera stage pieces                                                 */
/* ------------------------------------------------------------------ */

function StageBadge({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`pointer-events-none absolute flex items-center gap-3 rounded-[10px] border border-[#5a6eff]/40 bg-[#06082a]/[.78] px-3.5 py-2 text-[13px] backdrop-blur-[6px] ${className}`}
    >
      {children}
    </div>
  )
}

function StageOverlay({
  status,
  error,
  onRetry,
  running,
}: {
  status: string
  error: string | null
  onRetry: () => void
  running: boolean
}) {
  const { t } = useT()
  const LABEL: Record<string, string> = {
    idle: t('debug.cameraStopped'),
    'loading-model': t('debug.loadingModel'),
    'starting-camera': t('debug.startingCamera'),
    error: t('debug.pipelineError'),
  }

  return (
    <div className="absolute inset-0 grid place-items-center bg-fa-void/85 px-6 text-center backdrop-blur-sm">
      {status === 'error' ? (
        <div className="max-w-md space-y-4">
          <AlertIcon />
          <p className="font-display text-sm font-bold tracking-widest text-neon-pink">
            {LABEL.error}
          </p>
          <p className="text-sm leading-relaxed text-ink-bright">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mx-auto flex items-center gap-2 rounded-lg border border-neon-cyan/50 bg-neon-cyan/10 px-4 py-2 text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/20"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {running && <Spinner />}
          <p className="font-display text-sm font-bold tracking-widest text-neon-cyan">
            {LABEL[status] ?? status}
          </p>
          <p className="text-xs text-ink-dim">
            {running
              ? t('splash.allowCamera')
              : t('debug.pressStart')}
          </p>
        </div>
      )}
    </div>
  )
}

function FeatureStrip() {
  const { t } = useT()
  const items = [
    { icon: <SmileIcon color={CYAN} />, label: [t('debug.feature1a'), t('debug.feature1b')] },
    { icon: <TargetIcon />, label: [t('debug.feature2a'), t('debug.feature2b')] },
    { icon: <StarIcon />, label: [t('debug.feature3a'), t('debug.feature3b')] },
  ]

  return (
    <div
      className="grid items-center gap-0 rounded-2xl border-[1.5px] border-edge-violet/60 bg-fa-deep/70 px-[22px] py-[18px] sm:grid-cols-2 xl:grid-cols-[1.4fr_repeat(3,minmax(120px,1fr))]"
      style={{ boxShadow: '0 0 22px rgba(120,90,255,.25)' }}
    >
      <div className="flex items-center gap-[18px] pr-5 xl:border-r xl:border-edge-line/35">
        <BadgeLogo />
        <div className="flex flex-col gap-1.5">
          <div className="wordmark-pink font-display text-2xl font-extrabold">FaceArcade</div>
          <div className="text-[13px] text-ink-soft">{t('debug.tagline')}</div>
        </div>
      </div>

      {items.map((item, index) => (
        <div
          key={item.label.join('')}
          className={`flex flex-col items-center gap-2.5 px-3 pt-4 text-center text-sm leading-[1.35] text-ink xl:pt-0 ${
            index < items.length - 1 ? 'xl:border-r xl:border-edge-line/35' : ''
          }`}
        >
          {item.icon}
          <span>
            {item.label[0]}
            <br />
            {item.label[1]}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Detection panel cards                                               */
/* ------------------------------------------------------------------ */

function StatusCard({
  label,
  on,
  accent,
  value,
  icon,
  pillStyle,
}: {
  label: string
  on: boolean
  accent: string
  value: string
  icon: React.ReactNode
  pillStyle?: CSSProperties
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border-[1.5px] px-2 pb-3.5 pt-4 transition-all duration-[250ms]"
      style={{
        borderColor: on ? `${accent}cc` : 'rgba(120,90,255,.5)',
        background: on ? 'rgba(20,50,50,.55)' : 'rgba(14,12,50,.75)',
        boxShadow: on ? `0 0 18px ${accent}55, inset 0 0 14px ${accent}22` : 'none',
      }}
    >
      <div
        className="grid h-9 place-items-center"
        style={{ color: on ? accent : PURPLE, filter: `drop-shadow(0 0 7px ${on ? accent : PURPLE})` }}
      >
        {icon}
      </div>
      <div className="whitespace-nowrap text-sm font-bold text-white">{label}</div>
      <div
        className="min-w-[44px] rounded-full px-2.5 py-1.5 text-center text-[13px] font-bold transition-all duration-[250ms]"
        style={
          pillStyle ?? {
            background: on ? `linear-gradient(90deg,${GREEN},${CYAN})` : 'rgba(40,40,90,.8)',
            color: on ? '#04122a' : '#8a90c8',
            boxShadow: on ? `0 0 14px ${accent}99` : 'none',
          }
        }
      >
        {value}
      </div>
    </div>
  )
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-edge-violet/55 bg-fa-panel/70 px-[18px] py-4">
      {children}
    </div>
  )
}

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[15px] font-bold text-white">
      {icon}
      {children}
    </div>
  )
}

function TiltCard({ tilt }: { tilt: number }) {
  const { t } = useT()
  const knobLeft = ((tilt + MAX_HEAD_TILT_DEG) / (MAX_HEAD_TILT_DEG * 2)) * 100

  return (
    <PanelCard>
      <div className="flex items-center justify-between">
        <CardTitle icon={<TiltHeadIcon color={PURPLE} size={24} />}>
          {t('debug.tiltAngle')}
        </CardTitle>
        <div
          className="font-display text-[28px] font-extrabold text-neon-pink"
          style={{ textShadow: '0 0 14px rgba(255,63,214,.7)' }}
        >
          {tilt > 0 ? '+' : ''}
          {tilt.toFixed(1)}°
        </div>
      </div>

      <div className="relative h-7">
        <div
          className="absolute inset-x-0 top-3 h-1.5 rounded-[3px]"
          style={{
            background:
              'linear-gradient(90deg,#3dff7a 0%,#3ff0ff 45%,#5b6cff 75%,#7b3fff 100%)',
            boxShadow: '0 0 12px rgba(63,240,255,.5)',
          }}
        />
        <div
          className="absolute top-1 h-[22px] w-[22px] -translate-x-1/2 rounded-full bg-white transition-[left] duration-[180ms] ease-out"
          style={{
            left: `${knobLeft}%`,
            boxShadow: '0 0 0 3px rgba(63,240,255,.5),0 0 16px rgba(63,240,255,.9)',
          }}
        />
      </div>

      <div className="flex justify-between text-[13px] text-ink-dim">
        <span>-45°</span>
        <span>-22°</span>
        <span>0°</span>
        <span>22°</span>
        <span>45°</span>
      </div>
    </PanelCard>
  )
}

function FpsCard({ fps }: { fps: number }) {
  const { t } = useT()
  const lit = Math.round((Math.min(fps, 60) / 60) * 30)

  return (
    <PanelCard>
      <CardTitle icon={<SpeedIcon />}>{t('debug.currentFps')}</CardTitle>
      <div className="flex items-center gap-4">
        <div className="flex h-4 flex-1 gap-1">
          {Array.from({ length: 30 }, (_, i) => {
            const isLit = i < lit
            const hue = 170 + (i / 30) * 100
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors duration-200"
                style={{
                  background: isLit ? `hsl(${hue} 100% 62%)` : 'rgba(60,60,130,.5)',
                  boxShadow: isLit ? `0 0 6px hsl(${hue} 100% 62% / .7)` : 'none',
                }}
              />
            )
          })}
        </div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className="font-display text-[28px] font-extrabold text-neon-cyan tabular-nums"
            style={{ textShadow: '0 0 12px rgba(63,240,255,.7)' }}
          >
            {fps}
          </span>
          <span className="text-[13px] text-ink-dim">FPS</span>
        </div>
      </div>
    </PanelCard>
  )
}

function BlendshapeCard({
  rows,
}: {
  rows: { name: string; value: number; grad: string; glow: string }[]
}) {
  const { t } = useT()

  return (
    <PanelCard>
      <CardTitle icon={<SmileIcon color={PURPLE} size={24} />}>
        {t('debug.expression')}{' '}
        <span className="text-[13px] font-normal text-ink-dim">
          {t('debug.mainBlendshapes')}
        </span>
      </CardTitle>
      <div className="grid grid-cols-[auto_44px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3">
        {rows.map((row) => (
          <Fragment key={row.name}>
            <div className="font-mono text-sm text-ink-bright">{row.name}</div>
            <div className="text-right text-base font-bold tabular-nums text-white">
              {Math.max(0, row.value).toFixed(2)}
            </div>
            <div className="h-[9px] overflow-hidden rounded-[5px] bg-[#3c3c82]/55">
              <div
                className="h-full rounded-[5px] transition-[width] duration-[250ms] ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, row.value) * 100)}%`,
                  background: row.grad,
                  boxShadow: `0 0 10px ${row.glow}88`,
                }}
              />
            </div>
          </Fragment>
        ))}
      </div>
    </PanelCard>
  )
}

function StartButton({ running, onClick }: { running: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3.5 rounded-[14px] border-2 border-neon-cyan bg-gradient-to-b from-[#141446]/90 to-[#080824]/95 px-[30px] py-3.5 font-display text-2xl font-extrabold tracking-[2px] text-neon-cyan transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-pink hover:text-[#ff8fe8]"
      style={{
        boxShadow:
          '0 0 22px rgba(63,240,255,.45),0 0 40px rgba(255,63,214,.25),inset 0 0 18px rgba(63,240,255,.12)',
        textShadow: '0 0 10px rgba(63,240,255,.8)',
      }}
    >
      {running ? 'STOP' : 'START'}
      <ChevronsIcon />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Icons - inlined from the artboard                                   */
/* ------------------------------------------------------------------ */

function LogoMark() {
  return (
    <svg
      width="56"
      height="40"
      viewBox="0 0 56 40"
      fill="none"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 8px rgba(63,240,255,.8))' }}
    >
      <rect x="3" y="8" width="50" height="26" rx="12" stroke={CYAN} strokeWidth="3" />
      <path d="M14 16v10M9 21h10" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="18" r="2.4" fill={PINK} />
      <circle cx="44" cy="22" r="2.4" fill={PINK} />
      <circle cx="38" cy="26" r="2.4" fill={PURPLE} />
      <circle cx="32" cy="22" r="2.4" fill={PURPLE} />
    </svg>
  )
}

function BadgeLogo() {
  return (
    <svg
      width="70"
      height="56"
      viewBox="0 0 70 56"
      fill="none"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 10px rgba(63,240,255,.7))' }}
    >
      <rect x="4" y="12" width="62" height="34" rx="14" stroke={CYAN} strokeWidth="3" />
      <path d="M18 22v14M11 29h14" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
      <rect x="46" y="20" width="5" height="5" fill={PINK} />
      <rect x="54" y="26" width="5" height="5" fill={PINK} />
      <rect x="46" y="32" width="5" height="5" fill={PURPLE} />
      <rect x="38" y="26" width="5" height="5" fill={PURPLE} />
      <path d="M8 4l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={PINK} />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function FaceScanIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.8"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 6px rgba(63,240,255,.8))' }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6c-2.8 0-4.5 2.2-4.5 5s1.7 6 4.5 6 4.5-3.2 4.5-6-1.7-5-4.5-5z" />
      <path d="M9.5 11h1.5M13 11h1.5M10.5 14.5h3" />
    </svg>
  )
}

function LandmarkWireframe() {
  return (
    <svg
      viewBox="0 0 100 130"
      width="100"
      height="130"
      fill="none"
      stroke="#6e7dff"
      strokeWidth=".9"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 6px rgba(110,125,255,.9))' }}
    >
      <ellipse cx="50" cy="60" rx="34" ry="48" />
      <ellipse cx="50" cy="60" rx="24" ry="44" />
      <ellipse cx="50" cy="60" rx="12" ry="40" />
      <path d="M16 60h68M18 45h64M20 30h60M26 18h48M18 75h64M22 90h56M30 104h40" />
      <ellipse cx="36" cy="50" rx="8" ry="4" />
      <ellipse cx="64" cy="50" rx="8" ry="4" />
      <path d="M50 55v18l-5 4h10l-5-4" />
      <path d="M38 90q12 8 24 0" />
    </svg>
  )
}

function SmileIcon({ color = CYAN, size = 34 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={size > 24 ? 1.8 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ filter: `drop-shadow(0 0 6px ${color}cc)` }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01M15 9h.01" strokeWidth="2.5" />
    </svg>
  )
}

function MouthIcon({ color }: { color: string }) {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12c3-4 6-5 9-5s6 1 9 5c-3 4-6 5-9 5s-6-1-9-5z" />
      <path d="M3 12h18" />
    </svg>
  )
}

function EyeIcon({ color }: { color: string }) {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function TiltHeadIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={size > 24 ? 1.8 : 2}
      strokeLinecap="round"
      aria-hidden
      style={{ filter: `drop-shadow(0 0 6px ${color}e6)` }}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
      <path d="M17 4l3-2M20 8l2-1" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 6px rgba(63,240,255,.8))' }}
    >
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke={PINK}
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 6px rgba(255,63,214,.8))' }}
    >
      <path d="M12 2l3 6.5 7 .9-5 4.9 1.3 7L12 18l-6.3 3.3L7 14.3 2 9.4l7-.9z" />
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke={PINK}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 6px rgba(255,63,214,.9))' }}
    >
      <path d="M2 12h4l2-7 4 14 3-9 2 4h5" />
    </svg>
  )
}

function SpeedIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={PURPLE}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 6px rgba(176,108,255,.9))' }}
    >
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="M12 16l4-6" />
      <circle cx="12" cy="16" r="1.5" fill={PURPLE} />
    </svg>
  )
}

function ChevronsIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l6 6-6 6M13 6l6 6-6 6" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke={PINK}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mx-auto"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke={CYAN}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="mx-auto animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  )
}
