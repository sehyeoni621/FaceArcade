// Copies the MediaPipe wasm runtime out of node_modules into public/ so the
// app serves it from its own origin instead of a CDN. Runs on postinstall to
// keep the vendored files in step with the installed package version.
import { access, cp, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const require = createRequire(import.meta.url)
// The package does not expose ./package.json through "exports", so resolve its
// main bundle instead — it sits at the package root, next to wasm/.
const packageRoot = dirname(require.resolve('@mediapipe/tasks-vision'))

const source = resolve(packageRoot, 'wasm')
const destination = resolve(process.cwd(), 'public/mediapipe/wasm')

await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })

console.log(`[FaceArcade] Synced MediaPipe wasm -> ${destination}`)

// The .task model is not shipped with the npm package; fetch it once.
const modelPath = resolve(process.cwd(), 'public/models/face_landmarker.task')
try {
  await access(modelPath)
  console.log('[FaceArcade] Face Landmarker model already present.')
} catch {
  console.log('[FaceArcade] Downloading Face Landmarker model...')
  const response = await fetch(MODEL_URL)
  if (!response.ok) {
    throw new Error(`Model download failed: ${response.status} ${response.statusText}`)
  }
  await mkdir(dirname(modelPath), { recursive: true })
  await writeFile(modelPath, Buffer.from(await response.arrayBuffer()))
  console.log(`[FaceArcade] Saved model -> ${modelPath}`)
}
