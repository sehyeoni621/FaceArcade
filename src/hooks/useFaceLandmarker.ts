import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

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
  error: string | null
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

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return '카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘에서 권한을 허용해 주세요.'
      case 'NotFoundError':
      case 'OverconstrainedError':
        return '사용 가능한 웹캠을 찾을 수 없습니다. 카메라 연결 상태를 확인해 주세요.'
      case 'NotReadableError':
        return '다른 프로그램이 카메라를 사용 중입니다. 해당 프로그램을 종료한 뒤 다시 시도해 주세요.'
      default:
        return `카메라를 시작하지 못했습니다: ${err.name}`
    }
  }
  if (err instanceof Error) return err.message
  return String(err)
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
    keepScreenAwake = true,
  } = options

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const resultRef = useRef<FaceLandmarkerResult | null>(null)

  // Kept in a ref so a new callback identity never restarts the pipeline.
  const onFrameRef = useRef(onFrame)
  // Read once at start-up, so an inline constraints object cannot restart the
  // pipeline on every render. Call `restart()` to apply a change.
  const videoConstraintsRef = useRef(videoConstraints)
  useEffect(() => {
    onFrameRef.current = onFrame
    videoConstraintsRef.current = videoConstraints
  })

  const [pipelineStatus, setStatus] = useState<FaceLandmarkerStatus>('idle')
  const [error, setError] = useState<string | null>(null)
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
        setError('비디오 엘리먼트를 찾을 수 없습니다.')
        setStatus('error')
        return
      }

      try {
        setError(null)
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
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraintsRef.current ?? defaultVideoConstraints(),
          audio: false,
        })

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
        setError(describeError(err))
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
    error,
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
