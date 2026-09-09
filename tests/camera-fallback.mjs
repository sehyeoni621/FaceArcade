// Regression test for the camera-open fallback ladder.
//
// A saved `cameraDeviceId` goes stale whenever the browser reissues device ids
// (site data cleared, different profile). The old code asked for it with
// `deviceId: { exact }`, got OverconstrainedError, and showed a "no webcam"
// error on a machine whose webcam was fine. The fix retries without the dead
// id, then forgets it. This drives the built app through headless Chromium
// with a fake camera and checks both the fresh and the stale-id paths.
//
// Run: `npm run build && npm run test:camera`
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 4173
const BASE = `http://localhost:${PORT}`
const SETTINGS_KEY = 'facearcade:settings:v1'
const STALE_ID = 'stale-device-id-that-no-longer-exists'
const BOOT_TIMEOUT_MS = 120_000

const CHROMIUM_ARGS = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--enable-unsafe-swiftshader',
  '--no-sandbox',
]

/* ---------------------------- preview server ---------------------------- */

function startPreview() {
  const child = spawn(`npx vite preview --port ${PORT} --strictPort`, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`))
  return child
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`preview server did not come up at ${url}`)
}

function stopPreview(child) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // `child` is the shell; /T takes the whole tree (npx -> node -> vite)
      // and we wait for it so the port is free before the process exits.
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
      killer.on('exit', () => resolve())
      killer.on('error', () => resolve())
    } else {
      child.kill('SIGTERM')
      resolve()
    }
  })
}

/* ------------------------------- helpers -------------------------------- */

const ERROR_TEXTS = ['카메라를 시작할 수 없습니다', '사용 가능한 웹캠을 찾을 수 없습니다', '선택한 카메라를 사용할 수 없습니다']

async function bootToLobby(page, label) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  // Either the lobby or the error screen ends the boot; race them so a
  // failure is reported immediately instead of after the full timeout.
  const lobby = page.getByText('SELECT GAME').waitFor({ timeout: BOOT_TIMEOUT_MS }).then(() => 'lobby')
  const error = Promise.any(
    ERROR_TEXTS.map((text) => page.getByText(text).waitFor({ timeout: BOOT_TIMEOUT_MS }).then(() => text)),
  ).catch(() => new Promise(() => {}))
  const outcome = await Promise.race([lobby, error])
  if (outcome !== 'lobby') throw new Error(`${label}: landed on error screen ("${outcome}")`)
}

async function readVideo(page) {
  return page.evaluate(() => {
    const video = document.querySelector('video')
    if (!video) return null
    const stream = video.srcObject
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      live: Boolean(stream && stream.active && !video.paused && video.readyState >= 2),
    }
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/* -------------------------------- cases --------------------------------- */

async function caseFreshStart(browser) {
  const context = await browser.newContext({ permissions: ['camera'] })
  const page = await context.newPage()
  try {
    await bootToLobby(page, 'A')
    const video = await readVideo(page)
    assert(video, 'A: no <video> element')
    assert(video.live, `A: stream not live (${JSON.stringify(video)})`)
    assert(video.width === 1280 && video.height === 720, `A: expected 1280x720, got ${video.width}x${video.height}`)
    console.log(`  A  fresh start          -> lobby, video ${video.width}x${video.height} live`)
  } finally {
    await context.close()
  }
}

async function caseStaleDeviceId(browser) {
  const context = await browser.newContext({ permissions: ['camera'] })
  await context.addInitScript(
    ([key, id]) => localStorage.setItem(key, JSON.stringify({ cameraDeviceId: id })),
    [SETTINGS_KEY, STALE_ID],
  )
  const page = await context.newPage()
  try {
    await bootToLobby(page, 'B')
    const video = await readVideo(page)
    assert(video, 'B: no <video> element')
    assert(video.live, `B: stream not live (${JSON.stringify(video)})`)
    assert(video.width === 1280 && video.height === 720, `B: expected 1280x720, got ${video.width}x${video.height}`)

    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SETTINGS_KEY)
    assert(saved.cameraDeviceId === null, `B: stale cameraDeviceId not cleared (got ${JSON.stringify(saved.cameraDeviceId)})`)
    console.log(`  B  stale saved deviceId -> lobby, video ${video.width}x${video.height} live, cameraDeviceId cleared`)
  } finally {
    await context.close()
  }
}

/* --------------------------------- main --------------------------------- */

const preview = startPreview()
let browser
let failed = false
try {
  await waitForServer(BASE)
  browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS })
  console.log('camera fallback regression')
  await caseFreshStart(browser)
  await caseStaleDeviceId(browser)
  console.log('PASS')
} catch (error) {
  failed = true
  console.error('FAIL:', error instanceof Error ? error.message : error)
} finally {
  await browser?.close()
  await stopPreview(preview)
}
process.exit(failed ? 1 : 0)
