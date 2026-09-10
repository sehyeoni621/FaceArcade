import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'
import { useT, type T } from '../i18n'

/** Where the wasm runtime and the model live under `public/`. */
const WASM_BASE_PATH = `${import.meta.env.BASE_URL}mediapipe/wasm`
const MODEL_ASSET_PATH = `${import.meta.env.BASE_URL}models/face_landmarker.task`

export type FaceLandmarkerStatus =
  | 'idle'
  | 'loading-model'
  | 'starting-camera'
  | 'ready'
  | 'error'

export type InferenceDelegate = 'GPU' | 'CPU'

/**
 * Phones do not need 720p to track a face, and a smaller frame buys back the
 * FPS a mobile GPU cannot spare. Only the width is pinned so a portrait sensor
 * is never forced into a landscape mode - the UI reads the real dimensions back
 * from the video element and adapts.
 */
function defaultVideoConstraints(): MediaTrackConstraints {
  const coarsePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  return coarsePointer
    ? { facingMode: 'user', width: { ideal: 720 } }
    : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
}

/**
 * 카메라를 열되, 한 번에 실패하지 않고 요청을 단계적으로 완화한다.
 *
 * 대개는 저장된 `deviceId`가 원인이다. 브라우저는 사이트 데이터가 지워지면
 * 이 id를 새로 발급하고 프로필 간에 공유하지도 않아서, 저장해둔 값이 죽은
 * 장치를 가리키게 된다. `exact`가 그걸 OverconstrainedError로 만들고,
 * 플레이어에게는 웹캠이 멀쩡한 기기에서 "웹캠 없음"으로 보인다.
 * 가상 카메라는 `facingMode`를 노출하지 않아 같은 곳에서 걸린다.
 *
 * OverconstrainedError만 재시도한다. 권한 거부나 다른 앱의 점유는 제약을
 * 풀어도 나아지지 않는다.
 */
async function openCamera(
  constraints: MediaTrackConstraints,
): Promise<{ stream: MediaStream; usedFallback: boolean }> {
  const attempts: MediaTrackConstraints[] = [constraints]

  const relaxed = { ...constraints }
  delete relaxed.deviceId
  delete relaxed.facingMode
  if (Object.keys(relaxed).length !== Object.keys(constraints).length) attempts.push(relaxed)
  // 최후의 수단: 아무 카메라나 아무 해상도로라도 게임은 돌아가야 한다.
  attempts.push({})

  let lastError: unknown
  for (let index = 0; index < attempts.length; index += 1) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: attempts[index],
        audio: false,
      })
      return { stream, usedFallback: index > 0 }
    } catch (err) {
      if (!(err instanceof DOMException) || err.name !== 'OverconstrainedError') throw err
      lastError = err
    }
  }
  throw lastError
}

export interface UseFaceLandmarkerOptions {
  /** Set to false to keep the camera off (e.g. while a menu is open). */
  enabled?: boolean
  /** Maximum faces to track. Defaults to 1. */
  numFaces?: number
  /**
   * Called on every frame the model actually ran on, before React re-renders.
   * Use it for canvas drawing and game logic - it is not rate limited.
   */
  onFrame?: (result: FaceLandmarkerResult, video: HTMLVideoElement) => void
  /**
   * How often the `result` state is refreshed for UI, in Hz. The raw per-frame
   * data always stays available through `resultRef` / `onFrame`.
   */
  uiUpdateHz?: number
  /**
   * Overrides the camera request. Defaults to the front camera at a resolution
   * chosen for the device class.
   */
  videoConstraints?: MediaTrackConstraints
  /**
   * 요청한 카메라를 쓰지 못하고 다른 카메라로 열렸을 때 호출된다.
   * 더 이상 존재하지 않는 저장된 카메라를 잊어야 한다는 신호다.
   */
  onCameraFallback?: () => void
  /**
   * Holds the screen on while the camera runs. A face-controlled game gets no
   * touch input, so the phone would otherwise dim and sleep mid-play.
   * Defaults to true.
   */
  keepScreenAwake?: boolean
}

export interface UseFaceLandmarker {
  /** Attach to a muted, playsInline `<video>` element. */
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: FaceLandmarkerStatus
  /** Ready-to-show message in the current language, or null. */
  error: string | null
  /** Why it failed, for UI that branches on the cause. */
  failure: CameraFailure | null
  isModelLoading: boolean
  isWebcamReady: boolean
  /** Which backend the model ended up running on. */
  delegate: InferenceDelegate | null
  /** Smoothed inference rate, in frames per second. */
  fps: number
  /** Latest result, throttled to `uiUpdateHz` so the UI does not thrash. */
  result: FaceLandmarkerResult | null
  /** Latest result with no throttling - read this inside animation loops. */
  resultRef: React.RefObject<FaceLandmarkerResult | null>
  /** Intrinsic size of the camera stream. */
  videoSize: { width: number; height: number }
  /** Tears everything down and initializes again. */
  restart: () => void
}

/**
 * Why the camera would not start. Kept as a code rather than a sentence so
 * the UI can branch on the cause and render it in the current language -
 * matching on message text breaks the moment the language changes.
 */
export type CameraErrorCode =
  | 'permission'
  | 'not-found'
  | 'overconstrained'
  | 'in-use'
  | 'no-video'
  | 'unknown'

export interface CameraFailure {
  code: CameraErrorCode
  /** Raw browser detail, shown only when the code is unknown. */
  detail?: string
}

function classifyError(err: unknown): CameraFailure {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return { code: 'permission' }
      case 'NotFoundError':
        return { code: 'not-found' }
      case 'OverconstrainedError':
        return { code: 'overconstrained' }
      case 'NotReadableError':
        return { code: 'in-use' }
      default:
        return { code: 'unknown', detail: err.name }
    }
  }
  if (err instanceof Error) return { code: 'unknown', detail: err.message }
  return { code: 'unknown', detail: String(err) }
}

/** Turns a failure into the sentence shown to the player. */
export function describeCameraFailure(failure: CameraFailure, t: T): string {
  switch (failure.code) {
    case 'permission':
      return t('camera.permissionDenied')
    case 'not-found':
      return t('camera.notFound')
    case 'overconstrained':
      return t('camera.overconstrained')
    case 'in-use':
      return t('camera.inUse')
    case 'no-video':
      return t('camera.noVideoElement')
    default:
      return t('camera.startFailed', { name: failure.detail ?? '?' })
  }
}

/**
 * Loads the MediaPipe Face Landmarker, opens the webcam, and runs a
 * requestAnimationFrame inference loop.
 *
 * Each result carries 478 3D landmarks plus the 52 expression blendshapes.
 */
export function useFaceLandmarker(options: UseFaceLandmarkerOptions = {}): UseFaceLandmarker {
  const {
    enabled = true,
    numFaces = 1,
    onFrame,
    uiUpdateHz = 12,
    videoConstraints,
    onCameraFallback,
    keepScreenAwake = true,
  } = options

  const { t } = useT()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const resultRef = useRef<FaceLandmarkerResult | null>(null)

  // Kept in a ref so a new callback identity never restarts the pipeline.
  const onFrameRef = useRef(onFrame)
  // Read once at start-up, so an inline constraints object cannot restart the
  // pipeline on every render. Call `restart()` to apply a change.
  const videoConstraintsRef = useRef(videoConstraints)
  const onCameraFallbackRef = useRef(onCameraFallback)
  useEffect(() => {
    onFrameRef.current = onFrame
    videoConstraintsRef.current = videoConstraints
    onCameraFallbackRef.current = onCameraFallback
  })

  const [pipelineStatus, setStatus] = useState<FaceLandmarkerStatus>('idle')
  const [failure, setFailure] = useState<CameraFailure | null>(null)
  const [delegate, setDelegate] = useState<InferenceDelegate | null>(null)
  const [fps, setFps] = useState(0)
  const [result, setResult] = useState<FaceLandmarkerResult | null>(null)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [runId, setRunId] = useState(0)

  const restart = useCallback(() => setRunId((id) => id + 1), [])

  // Derived rather than stored, so disabling the hook never needs a setState.
  const status: FaceLandmarkerStatus = enabled ? pipelineStatus : 'idle'

  useEffect(() => {
    if (!enabled) return

    // Guards against the StrictMode double effect invocation and against a
    // restart landing while the previous init is still in flight.
    let cancelled = false
    let landmarker: FaceLandmarker | null = null
    let stream: MediaStream | null = null
    let rafId = 0
    let wakeLock: WakeLockSentinel | null = null
    let detachVisibility: (() => void) | null = null

    const video = videoRef.current

    const start = async () => {
      if (!video) {
        setFailure({ code: 'no-video' })
        setStatus('error')
        return
      }

      try {
        setFailure(null)
        setStatus('loading-model')

        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_PATH)
        if (cancelled) return

        const createWith = (backend: InferenceDelegate) =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: backend },
            runningMode: 'VIDEO',
            numFaces,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          })

        let activeDelegate: InferenceDelegate = 'GPU'
        try {
          landmarker = await createWith('GPU')
        } catch (gpuError) {
          // Some machines (headless GPUs, locked-down drivers) reject WebGL.
          console.warn('[FaceArcade] GPU delegate unavailable, falling back to CPU.', gpuError)
          if (cancelled) return
          activeDelegate = 'CPU'
          landmarker = await createWith('CPU')
        }

        if (cancelled) {
          landmarker?.close()
          landmarker = null
          return
        }
        setDelegate(activeDelegate)

        setStatus('starting-camera')
        const opened = await openCamera(
          videoConstraintsRef.current ?? defaultVideoConstraints(),
        )
        stream = opened.stream
        if (opened.usedFallback) onCameraFallbackRef.current?.()

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          stream = null
          return
        }

        video.srcObject = stream
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) {
            resolve()
            return
          }
          video.addEventListener('loadeddata', () => resolve(), { once: true })
        })
        if (cancelled) return

        await video.play()
        if (cancelled) return

        setVideoSize({ width: video.videoWidth, height: video.videoHeight })
        setStatus('ready')

        const acquireWakeLock = async () => {
          if (!keepScreenAwake || cancelled || !navigator.wakeLock) return
          try {
            wakeLock = await navigator.wakeLock.request('screen')
          } catch {
            // Unsupported, or refused because the page is not visible. Not fatal.
          }
        }
        void acquireWakeLock()

        // Returning to the tab needs both re-armed: iOS Safari pauses the video
        // element when backgrounded, and the browser always drops the wake lock.
        const handleVisibility = () => {
          if (document.visibilityState !== 'visible' || cancelled) return
          void video.play().catch(() => {})
          void acquireWakeLock()
        }
        document.addEventListener('visibilitychange', handleVisibility)
        detachVisibility = () => document.removeEventListener('visibilitychange', handleVisibility)

        let lastVideoTime = -1
        let smoothedFps = 0
        let lastFrameAt = performance.now()
        let lastUiPushAt = 0
        const uiInterval = 1000 / Math.max(1, uiUpdateHz)

        const tick = () => {
          if (cancelled || !landmarker) return
          rafId = requestAnimationFrame(tick)

          // The video has to have advanced, otherwise we would spend a full
          // inference pass on a frame we already processed.
          if (video.paused || video.ended || video.currentTime === lastVideoTime) return
          lastVideoTime = video.currentTime

          const now = performance.now()
          let detection: FaceLandmarkerResult
          try {
            detection = landmarker.detectForVideo(video, now)
          } catch (inferenceError) {
            console.error('[FaceArcade] Inference failed.', inferenceError)
            return
          }

          resultRef.current = detection
          onFrameRef.current?.(detection, video)

          const delta = now - lastFrameAt
          lastFrameAt = now
          if (delta > 0) {
            const instantFps = 1000 / delta
            // Exponential moving average keeps the readout from flickering.
            smoothedFps = smoothedFps === 0 ? instantFps : smoothedFps * 0.9 + instantFps * 0.1
          }

          if (now - lastUiPushAt >= uiInterval) {
            lastUiPushAt = now
            setResult(detection)
            setFps(Math.round(smoothedFps))
          }
        }

        rafId = requestAnimationFrame(tick)
      } catch (err) {
        if (cancelled) return
        console.error('[FaceArcade] Failed to start the face pipeline.', err)
        setFailure(classifyError(err))
        setStatus('error')
      }
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      detachVisibility?.()
      void wakeLock?.release().catch(() => {})
      wakeLock = null
      stream?.getTracks().forEach((track) => track.stop())
      landmarker?.close()
      landmarker = null
      resultRef.current = null
      if (video) video.srcObject = null
      setResult(null)
      setFps(0)
    }
  }, [enabled, numFaces, uiUpdateHz, keepScreenAwake, runId])

  return {
    videoRef,
    status,
    error: failure ? describeCameraFailure(failure, t) : null,
    failure,
    isModelLoading: status === 'loading-model',
    isWebcamReady: status === 'ready',
    delegate,
    fps,
    result,
    resultRef,
    videoSize,
    restart,
  }
}
