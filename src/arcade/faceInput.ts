import { createContext, useContext } from 'react'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import {
  EMPTY_FACE_FRAME,
  mergeEdges,
  NO_EDGES,
  type FaceFrame,
  type GestureEdges,
} from '../utils/gestureInput'

/**
 * Hands the per-inference-frame face input from the camera pipeline (which
 * lives at the app root) to whichever screen is consuming it, without going
 * through React state.
 *
 * Edges are accumulated until a consumer takes them, so a game loop that runs
 * at 60 Hz against a 30 Hz camera never drops a "mouth just opened".
 */
export class FaceInputBus {
  latest: FaceFrame = EMPTY_FACE_FRAME
  latestLandmarks: NormalizedLandmark[] | undefined
  /** `performance.now()` of the last inference. Stale input means a stalled camera. */
  lastAt = 0
  private pending: GestureEdges = NO_EDGES

  push(frame: FaceFrame, edges: GestureEdges, landmarks: NormalizedLandmark[] | undefined) {
    this.latest = frame
    this.latestLandmarks = landmarks
    this.lastAt = performance.now()
    this.pending = mergeEdges(this.pending, edges)
  }

  /** Returns and clears the edges accumulated since the previous call. */
  consumeEdges(): GestureEdges {
    const edges = this.pending
    this.pending = NO_EDGES
    return edges
  }

  /** Drops queued edges, e.g. when a game starts so a pre-start wink is ignored. */
  clearEdges() {
    this.pending = NO_EDGES
  }

  /** True when the camera has produced a frame within `maxAgeMs`. */
  isFresh(maxAgeMs = 1500) {
    return performance.now() - this.lastAt < maxAgeMs
  }
}

export const FaceInputContext = createContext<FaceInputBus | null>(null)

export function useFaceInputBus(): FaceInputBus {
  const bus = useContext(FaceInputContext)
  if (!bus) throw new Error('useFaceInputBus must be used inside <FaceInputContext.Provider>')
  return bus
}
