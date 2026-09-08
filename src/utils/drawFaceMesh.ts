import { FaceLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * `Connection` is not exported from the package, so we mirror its shape. Each
 * entry is a pair of indices into the 478-point landmark array.
 */
type Connection = { start: number; end: number }

/** Default wireframe color, from the design's `meshColor` prop. */
export const DEFAULT_MESH_COLOR = '#6ea8ff'

/**
 * The design marks roughly a hundred vertices, not all 478 - drawing a glowing
 * dot per landmark would both bury the face and cost a shadow-blur pass each.
 * The contour set (oval, brows, eyes, lips) is that density, so collect its
 * unique indices once at module load.
 */
const VERTEX_INDICES: number[] = (() => {
  const seen = new Set<number>()
  for (const { start, end } of FaceLandmarker.FACE_LANDMARKS_CONTOURS as Connection[]) {
    seen.add(start)
    seen.add(end)
  }
  return [...seen]
})()

/**
 * Paints the landmark wireframe onto an overlay canvas: faint tesselation
 * links under white vertices that breathe, matching the dashboard artboard.
 *
 * Landmarks are normalized (0..1), so pass the canvas backing-store size. The
 * canvas is mirrored via CSS to match the selfie-view video, so nothing is
 * flipped here.
 */
export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  faces: NormalizedLandmark[][],
  width: number,
  height: number,
  color: string = DEFAULT_MESH_COLOR,
) {
  ctx.clearRect(0, 0, width, height)
  if (faces.length === 0) return

  // Scale line and dot weights with the canvas so the mesh reads the same at
  // any resolution.
  const unit = Math.max(1, Math.min(width, height) / 720)
  const time = performance.now() / 1000

  for (const landmarks of faces) {
    ctx.save()

    ctx.strokeStyle = color
    ctx.globalAlpha = 0.45
    ctx.lineWidth = unit
    ctx.beginPath()
    for (const { start, end } of FaceLandmarker.FACE_LANDMARKS_TESSELATION as Connection[]) {
      const from = landmarks[start]
      const to = landmarks[end]
      if (!from || !to) continue
      ctx.moveTo(from.x * width, from.y * height)
      ctx.lineTo(to.x * width, to.y * height)
    }
    ctx.stroke()

    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = color
    ctx.shadowBlur = 10 * unit
    VERTEX_INDICES.forEach((index, i) => {
      const point = landmarks[index]
      if (!point) return
      const radius = (2.6 + Math.sin(time * 3 + i) * 0.6) * unit
      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.restore()
  }
}
