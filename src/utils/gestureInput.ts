import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision'
import {
  blendshapeScore,
  FACE_LANDMARK,
  GESTURE_THRESHOLD,
  getBlinkScores,
  getHeadTilt,
  getMouthOpenScore,
  getSmileScore,
  toBlendshapeMap,
} from './faceGestures'

/**
 * Game-facing input layer on top of `faceGestures`.
 *
 * `faceGestures` answers "is the user smiling right now?" with fixed
 * thresholds. Games need more than that: thresholds the player can tune,
 * hysteresis so a score hovering at the threshold does not flicker, rising
 * edges ("the mouth just opened"), and positions in *screen* space so a game
 * object can be drawn under the nose regardless of mirroring.
 */

export interface GestureThresholds {
  smile: number
  mouthOpen: number
  blink: number
  /** Degrees of head roll before a direction is reported. */
  tilt: number
}

export const DEFAULT_THRESHOLDS: GestureThresholds = {
  smile: GESTURE_THRESHOLD.smile,
  mouthOpen: GESTURE_THRESHOLD.mouthOpen,
  blink: GESTURE_THRESHOLD.blink,
  tilt: GESTURE_THRESHOLD.tilt,
}

/** Landmark indices used for positions, beyond the ones `faceGestures` exports. */
const LIP_UPPER_INNER = 13
const LIP_LOWER_INNER = 14

/** Levels and latched states for one inference frame, in screen space. */
export interface FaceFrame {
  face: boolean
  /** Raw scores, 0..1. */
  smile: number
  mouthOpen: number
  blinkLeft: number
  blinkRight: number
  browUp: number
  /** Latched booleans (with hysteresis). */
  smiling: boolean
  mouthOpened: boolean
  eyesClosed: boolean
  /** One eye shut, the other open. "Left" is the eye on the left of the screen. */
  winkLeft: boolean
  winkRight: boolean
  browRaised: boolean
  /** Head roll in degrees. Positive leans toward the right of the screen. */
  tilt: number
  tiltDir: 'left' | 'center' | 'right'
  /** Nose tip in 0..1 screen coordinates (0 = left edge of the displayed video). */
  headX: number
  headY: number
  /** Center of the lips in 0..1 screen coordinates. */
  mouthX: number
  mouthY: number
}

/** Rising edges since the previous inference frame. */
export interface GestureEdges {
  smile: boolean
  mouthOpen: boolean
  blink: boolean
  winkLeft: boolean
  winkRight: boolean
  browUp: boolean
  tiltLeft: boolean
  tiltRight: boolean
}

export const NO_EDGES: GestureEdges = {
  smile: false,
  mouthOpen: false,
  blink: false,
  winkLeft: false,
  winkRight: false,
  browUp: false,
  tiltLeft: false,
  tiltRight: false,
}

export const EMPTY_FACE_FRAME: FaceFrame = {
  face: false,
  smile: 0,
  mouthOpen: 0,
  blinkLeft: 0,
  blinkRight: 0,
  browUp: 0,
  smiling: false,
  mouthOpened: false,
  eyesClosed: false,
  winkLeft: false,
  winkRight: false,
  browRaised: false,
  tilt: 0,
  tiltDir: 'center',
  headX: 0.5,
  headY: 0.5,
  mouthX: 0.5,
  mouthY: 0.6,
}

/** Merges two edge sets, so edges are never lost between game ticks. */
export function mergeEdges(a: GestureEdges, b: GestureEdges): GestureEdges {
  return {
    smile: a.smile || b.smile,
    mouthOpen: a.mouthOpen || b.mouthOpen,
    blink: a.blink || b.blink,
    winkLeft: a.winkLeft || b.winkLeft,
    winkRight: a.winkRight || b.winkRight,
    browUp: a.browUp || b.browUp,
    tiltLeft: a.tiltLeft || b.tiltLeft,
    tiltRight: a.tiltRight || b.tiltRight,
  }
}

/**
 * Boolean with hysteresis: switches on at `threshold`, off again only once
 * the value drops below `threshold * releaseRatio`.
 */
class Latch {
  private on = false
  private readonly releaseRatio: number

  constructor(releaseRatio = 0.7) {
    this.releaseRatio = releaseRatio
  }

  update(value: number, threshold: number): boolean {
    if (this.on) {
      if (value < threshold * this.releaseRatio) this.on = false
    } else if (value >= threshold) {
      this.on = true
    }
    return this.on
  }

  reset() {
    this.on = false
  }
}

export interface FaceInputReaderOptions {
  thresholds?: GestureThresholds
  /**
   * Whether the video is displayed mirrored (selfie view). Controls how raw
   * landmark x and left/right are mapped to screen space. Defaults to true.
   */
  mirror?: boolean
  /** Smoothing factor for positions and tilt, 0..1. Higher = snappier. */
  smoothing?: number
}

/**
 * Stateful reader: feed it every inference result, get back a `FaceFrame` and
 * the rising edges since the last call. One instance per consumer.
 */
export class FaceInputReader {
  thresholds: GestureThresholds
  mirror: boolean
  private readonly alpha: number

  private readonly smileLatch = new Latch()
  private readonly mouthLatch = new Latch()
  private readonly blinkLatch = new Latch()
  private readonly winkLeftLatch = new Latch(0.6)
  private readonly winkRightLatch = new Latch(0.6)
  private readonly browLatch = new Latch()

  private prev: FaceFrame = EMPTY_FACE_FRAME
  private smoothTilt = 0
  private smoothHeadX = 0.5
  private smoothHeadY = 0.5
  private smoothMouthX = 0.5
  private smoothMouthY = 0.6
  private hasSmoothState = false

  constructor(options: FaceInputReaderOptions = {}) {
    this.thresholds = options.thresholds ?? DEFAULT_THRESHOLDS
    this.mirror = options.mirror ?? true
    this.alpha = options.smoothing ?? 0.55
  }

  /** Applies new thresholds / mirroring; takes effect from the next frame. */
  configure(options: Pick<FaceInputReaderOptions, 'thresholds' | 'mirror'>) {
    if (options.thresholds) this.thresholds = options.thresholds
    if (options.mirror !== undefined) this.mirror = options.mirror
  }

  reset() {
    this.prev = EMPTY_FACE_FRAME
    this.hasSmoothState = false
    for (const latch of [
      this.smileLatch,
      this.mouthLatch,
      this.blinkLatch,
      this.winkLeftLatch,
      this.winkRightLatch,
      this.browLatch,
    ]) {
      latch.reset()
    }
  }

  get last(): FaceFrame {
    return this.prev
  }

  read(
    landmarks: NormalizedLandmark[] | undefined,
    categories: Category[] | undefined,
    aspectRatio = 1,
  ): { frame: FaceFrame; edges: GestureEdges } {
    if (!landmarks || landmarks.length === 0) {
      // Keep the latches armed so a face returning mid-gesture does not fire
      // a phantom edge, but report everything off.
      const frame: FaceFrame = { ...EMPTY_FACE_FRAME, headX: this.prev.headX, headY: this.prev.headY }
      this.prev = frame
      return { frame, edges: NO_EDGES }
    }

    const t = this.thresholds
    const shapes = toBlendshapeMap(categories)
    const smile = getSmileScore(shapes)
    const mouthOpen = getMouthOpenScore(shapes)
    const rawBlink = getBlinkScores(shapes)
    const browUp = blendshapeScore(shapes, 'browInnerUp')

    // MediaPipe's "left" is the subject's left. In a mirrored preview the
    // subject's left eye sits on the left of the screen, so nothing swaps.
    const blinkLeft = this.mirror ? rawBlink.left : rawBlink.right
    const blinkRight = this.mirror ? rawBlink.right : rawBlink.left

    const smiling = this.smileLatch.update(smile, t.smile)
    const mouthOpened = this.mouthLatch.update(mouthOpen, t.mouthOpen)
    const eyesClosed = this.blinkLatch.update(Math.min(blinkLeft, blinkRight), t.blink)
    // A wink needs the other eye clearly open, otherwise a slow blink reads as
    // two winks in a row.
    const winkLeft =
      !eyesClosed && this.winkLeftLatch.update(blinkRight < t.blink * 0.6 ? blinkLeft : 0, t.blink)
    const winkRight =
      !eyesClosed && this.winkRightLatch.update(blinkLeft < t.blink * 0.6 ? blinkRight : 0, t.blink)
    const browRaised = this.browLatch.update(browUp, 0.5)

    // `getHeadTilt` is positive toward the user's right shoulder, which is
    // screen-right only when mirrored.
    const rawTilt = getHeadTilt(landmarks, aspectRatio) * (this.mirror ? 1 : -1)

    const nose = landmarks[FACE_LANDMARK.NOSE_TIP]
    const lipTop = landmarks[LIP_UPPER_INNER]
    const lipBottom = landmarks[LIP_LOWER_INNER]
    const toScreenX = (x: number) => (this.mirror ? 1 - x : x)
    const rawHeadX = nose ? toScreenX(nose.x) : 0.5
    const rawHeadY = nose ? nose.y : 0.5
    const rawMouthX = lipTop && lipBottom ? toScreenX((lipTop.x + lipBottom.x) / 2) : rawHeadX
    const rawMouthY = lipTop && lipBottom ? (lipTop.y + lipBottom.y) / 2 : rawHeadY + 0.12

    if (!this.hasSmoothState) {
      this.smoothTilt = rawTilt
      this.smoothHeadX = rawHeadX
      this.smoothHeadY = rawHeadY
      this.smoothMouthX = rawMouthX
      this.smoothMouthY = rawMouthY
      this.hasSmoothState = true
    } else {
      const a = this.alpha
      this.smoothTilt += (rawTilt - this.smoothTilt) * a
      this.smoothHeadX += (rawHeadX - this.smoothHeadX) * a
      this.smoothHeadY += (rawHeadY - this.smoothHeadY) * a
      this.smoothMouthX += (rawMouthX - this.smoothMouthX) * a
      this.smoothMouthY += (rawMouthY - this.smoothMouthY) * a
    }

    const tiltDir: FaceFrame['tiltDir'] =
      this.smoothTilt <= -t.tilt ? 'left' : this.smoothTilt >= t.tilt ? 'right' : 'center'

    const frame: FaceFrame = {
      face: true,
      smile,
      mouthOpen,
      blinkLeft,
      blinkRight,
      browUp,
      smiling,
      mouthOpened,
      eyesClosed,
      winkLeft,
      winkRight,
      browRaised,
      tilt: this.smoothTilt,
      tiltDir,
      headX: this.smoothHeadX,
      headY: this.smoothHeadY,
      mouthX: this.smoothMouthX,
      mouthY: this.smoothMouthY,
    }

    const p = this.prev
    const edges: GestureEdges = {
      smile: smiling && !p.smiling,
      mouthOpen: mouthOpened && !p.mouthOpened,
      blink: eyesClosed && !p.eyesClosed,
      winkLeft: winkLeft && !p.winkLeft,
      winkRight: winkRight && !p.winkRight,
      browUp: browRaised && !p.browRaised,
      tiltLeft: tiltDir === 'left' && p.tiltDir !== 'left',
      tiltRight: tiltDir === 'right' && p.tiltDir !== 'right',
    }

    this.prev = frame
    return { frame, edges }
  }
}
