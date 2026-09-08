import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * Blendshape scores keyed by MediaPipe category name (e.g. `jawOpen`).
 * Every one of the 52 ARKit-style shapes is in the range 0..1.
 */
export type BlendshapeMap = Record<string, number>

/** Landmark indices we rely on, from the 478-point MediaPipe face mesh. */
export const FACE_LANDMARK = {
  /** Nose tip. */
  NOSE_TIP: 1,
  /** Bottom of the chin. */
  CHIN: 152,
  /** Outer corner of the subject's right eye (appears on the left of a raw frame). */
  RIGHT_EYE_OUTER: 33,
  /** Outer corner of the subject's left eye (appears on the right of a raw frame). */
  LEFT_EYE_OUTER: 263,
  /** Center of the forehead, between the eyebrows. */
  FOREHEAD: 10,
} as const

/** Default trigger points. Games can override them per difficulty level. */
export const GESTURE_THRESHOLD = {
  smile: 0.5,
  mouthOpen: 0.4,
  blink: 0.5,
  /** Head tilt (deg) past which `tiltDirection` stops reporting `center`. */
  tilt: 12,
} as const

/** Head tilt is reported (and clamped) within this range, in degrees. */
export const MAX_HEAD_TILT_DEG = 45

/** Everything a game needs to know about the current frame's face. */
export interface GestureSnapshot {
  faceDetected: boolean
  smiling: boolean
  smileScore: number
  mouthOpen: boolean
  mouthOpenScore: number
  blinking: boolean
  leftEyeClosed: boolean
  rightEyeClosed: boolean
  winking: boolean
  headTilt: number
  tiltDirection: 'left' | 'center' | 'right'
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Turns MediaPipe's `faceBlendshapes[0].categories` array into a plain lookup
 * object so callers can read scores by name instead of scanning the array.
 */
export function toBlendshapeMap(categories: Category[] | undefined): BlendshapeMap {
  const map: BlendshapeMap = {}
  if (!categories) return map
  for (const category of categories) {
    map[category.categoryName] = category.score
  }
  return map
}

/** Reads a single blendshape score, defaulting to 0 when the shape is absent. */
export function blendshapeScore(shapes: BlendshapeMap, name: string): number {
  return shapes[name] ?? 0
}

/** Average of the left and right halves of a symmetric blendshape pair. */
function pairScore(shapes: BlendshapeMap, left: string, right: string): number {
  return (blendshapeScore(shapes, left) + blendshapeScore(shapes, right)) / 2
}

/** Mean of `mouthSmileLeft` and `mouthSmileRight`, 0..1. */
export function getSmileScore(shapes: BlendshapeMap): number {
  return pairScore(shapes, 'mouthSmileLeft', 'mouthSmileRight')
}

/** True while both mouth corners are pulled up past `threshold` on average. */
export function isSmiling(shapes: BlendshapeMap, threshold = GESTURE_THRESHOLD.smile): boolean {
  return getSmileScore(shapes) >= threshold
}

/** How far the jaw is dropped, 0..1. */
export function getMouthOpenScore(shapes: BlendshapeMap): number {
  return blendshapeScore(shapes, 'jawOpen')
}

/** True while the jaw is dropped past `threshold`. */
export function isMouthOpen(shapes: BlendshapeMap, threshold = GESTURE_THRESHOLD.mouthOpen): boolean {
  return getMouthOpenScore(shapes) >= threshold
}

/** Per-eye blink scores, 0 (wide open) to 1 (fully shut). */
export function getBlinkScores(shapes: BlendshapeMap): { left: number; right: number } {
  return {
    left: blendshapeScore(shapes, 'eyeBlinkLeft'),
    right: blendshapeScore(shapes, 'eyeBlinkRight'),
  }
}

/** True only when *both* eyes are shut — a deliberate blink, not a wink. */
export function isBlinking(shapes: BlendshapeMap, threshold = GESTURE_THRESHOLD.blink): boolean {
  const { left, right } = getBlinkScores(shapes)
  return left >= threshold && right >= threshold
}

/** True when exactly one eye is shut. */
export function isWinking(shapes: BlendshapeMap, threshold = GESTURE_THRESHOLD.blink): boolean {
  const { left, right } = getBlinkScores(shapes)
  return (left >= threshold) !== (right >= threshold)
}

/**
 * Head roll in degrees, clamped to ±45.
 *
 * Positive means the head is leaning toward the user's own right shoulder,
 * which is also what a mirrored (selfie) preview shows leaning to the right.
 *
 * The angle is measured across the outer eye corners; if either is missing we
 * fall back to the nose-tip -> chin axis. Normalized landmarks are stretched by
 * `aspectRatio` (video width / height) first, otherwise a non-square frame
 * skews the angle.
 */
export function getHeadTilt(landmarks: NormalizedLandmark[] | undefined, aspectRatio = 1): number {
  if (!landmarks || landmarks.length === 0) return 0

  const rightEye = landmarks[FACE_LANDMARK.RIGHT_EYE_OUTER]
  const leftEye = landmarks[FACE_LANDMARK.LEFT_EYE_OUTER]

  if (rightEye && leftEye) {
    const dx = (leftEye.x - rightEye.x) * aspectRatio
    const dy = leftEye.y - rightEye.y
    // Negated so a head leaning to the user's right reads positive.
    const degrees = -Math.atan2(dy, dx) * (180 / Math.PI)
    return clamp(degrees, -MAX_HEAD_TILT_DEG, MAX_HEAD_TILT_DEG)
  }

  const nose = landmarks[FACE_LANDMARK.NOSE_TIP]
  const chin = landmarks[FACE_LANDMARK.CHIN]
  if (!nose || !chin) return 0

  // Angle of the chin -> nose axis away from straight up.
  const dx = (nose.x - chin.x) * aspectRatio
  const dy = nose.y - chin.y
  const degrees = Math.atan2(dx, -dy) * (180 / Math.PI)
  return clamp(degrees, -MAX_HEAD_TILT_DEG, MAX_HEAD_TILT_DEG)
}

/** Buckets a tilt angle into a direction, with a dead zone around center. */
export function getTiltDirection(
  tilt: number,
  threshold = GESTURE_THRESHOLD.tilt,
): GestureSnapshot['tiltDirection'] {
  if (tilt <= -threshold) return 'left'
  if (tilt >= threshold) return 'right'
  return 'center'
}

/** Neutral snapshot used whenever no face is in frame. */
export const EMPTY_GESTURES: GestureSnapshot = {
  faceDetected: false,
  smiling: false,
  smileScore: 0,
  mouthOpen: false,
  mouthOpenScore: 0,
  blinking: false,
  leftEyeClosed: false,
  rightEyeClosed: false,
  winking: false,
  headTilt: 0,
  tiltDirection: 'center',
}

/**
 * Runs every detector once and returns the combined result — the single call
 * a game loop needs per frame.
 */
export function readGestures(
  landmarks: NormalizedLandmark[] | undefined,
  categories: Category[] | undefined,
  aspectRatio = 1,
): GestureSnapshot {
  if (!landmarks || landmarks.length === 0) return EMPTY_GESTURES

  const shapes = toBlendshapeMap(categories)
  const blinks = getBlinkScores(shapes)
  const headTilt = getHeadTilt(landmarks, aspectRatio)

  return {
    faceDetected: true,
    smiling: isSmiling(shapes),
    smileScore: getSmileScore(shapes),
    mouthOpen: isMouthOpen(shapes),
    mouthOpenScore: getMouthOpenScore(shapes),
    blinking: isBlinking(shapes),
    leftEyeClosed: blinks.left >= GESTURE_THRESHOLD.blink,
    rightEyeClosed: blinks.right >= GESTURE_THRESHOLD.blink,
    winking: isWinking(shapes),
    headTilt,
    tiltDirection: getTiltDirection(headTilt),
  }
}
