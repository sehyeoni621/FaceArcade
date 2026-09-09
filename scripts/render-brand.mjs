/**
 * Renders the FaceArcade brand assets from scripts/brand/brand.mjs into public/.
 *
 *   node scripts/render-brand.mjs
 *
 * Design-time only - it shells out to Chrome, so it is deliberately not wired
 * into `npm run build`. The outputs are committed; re-run this after editing
 * brand.mjs. Point CHROME_PATH at a binary if the default guesses miss.
 */
import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { GAMES, appIcon, ogCard } from './brand/brand.mjs'

const run = promisify(execFile)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const chrome = CHROME_CANDIDATES.find((path) => existsSync(path))
if (!chrome) {
  console.error('No Chrome found. Set CHROME_PATH to a Chrome/Chromium binary.')
  process.exit(1)
}

await assertCatalogMatchesGames()

const stage = join(tmpdir(), 'facearcade-brand')
await mkdir(stage, { recursive: true })
await mkdir(join(pub, 'og'), { recursive: true })

/**
 * Screenshots an SVG at an exact pixel size. The markup is inlined into a page
 * rather than loaded through <img> so the Google font in the OG cards actually
 * resolves - an externally referenced SVG gets no network of its own.
 */
async function raster(svg, out, width, height) {
  const page = join(stage, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.html`)
  await writeFile(
    page,
    `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Orbitron:wght@600;800&display=block" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style>
${svg}`,
    'utf8',
  )
  await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    '--virtual-time-budget=6000',
    `--window-size=${width},${height}`,
    `--screenshot=${out}`,
    pathToFileURL(page).href,
  ])
  await rm(page, { force: true })
  console.log(`  ${out.replace(root, '.').replace(/\\/g, '/')}  ${width}x${height}`)
}

console.log('app icon')
const icon = appIcon()
const maskable = appIcon({ maskable: true })
await writeFile(join(pub, 'icon.svg'), icon, 'utf8')
await writeFile(join(pub, 'icon-maskable.svg'), maskable, 'utf8')
// The favicon drops the mesh and fattens the strokes: at 16px the fine version
// collapses into a purple smudge.
await writeFile(join(pub, 'favicon.svg'), appIcon({ simple: true }), 'utf8')

await raster(icon, join(pub, 'icon-192.png'), 192, 192)
await raster(icon, join(pub, 'icon-512.png'), 512, 512)
await raster(maskable, join(pub, 'icon-maskable-512.png'), 512, 512)
// iOS ignores transparency and squircle-masks whatever it gets, so the
// apple-touch icon is the full-bleed maskable art at 180.
await raster(maskable, join(pub, 'apple-touch-icon.png'), 180, 180)

console.log('link previews')
await raster(ogCard(null), join(pub, 'og', 'facearcade.png'), 1200, 630)
for (const game of GAMES) {
  await raster(ogCard(game), join(pub, 'og', `${game.id}.png`), 1200, 630)
}

await rm(stage, { recursive: true, force: true })
console.log('done')

/**
 * shared/catalog.mjs restates fields that really live in src/games/*.ts. Read
 * both and refuse to render if they disagree - a stale catalog would put the
 * wrong title on every link preview.
 */
async function assertCatalogMatchesGames() {
  const sources = ['tiltRunner', 'mouthCatch', 'mimic', 'winkShooter']
  const problems = []

  for (const name of sources) {
    const code = await readFile(join(root, 'src', 'games', `${name}.ts`), 'utf8')
    const accentConst = code.match(/^const ACCENT = '(#[0-9a-fA-F]{6})'/m)?.[1]
    const block = code.match(/export const \w+: GameDefinition = \{[\s\S]*?\n\}/)?.[0] ?? ''
    const field = (key) => block.match(new RegExp(`^  ${key}: '([^']*)'`, 'm'))?.[1]
    const id = field('id')
    const game = GAMES.find((item) => item.id === id)
    if (!game) {
      problems.push(`${name}.ts: id "${id}" is missing from shared/catalog.mjs`)
      continue
    }
    const expected = {
      title: field('title'),
      tagline: field('tagline'),
      emoji: field('emoji'),
      scoreUnit: field('scoreUnit'),
      accent: block.includes('accent: ACCENT') ? accentConst : field('accent'),
      durationSec: Number(block.match(/^  durationSec: (\d+)/m)?.[1]),
    }
    for (const [key, value] of Object.entries(expected)) {
      if (value !== undefined && game[key] !== value) {
        problems.push(`${id}.${key}: src/games has ${JSON.stringify(value)}, catalog has ${JSON.stringify(game[key])}`)
      }
    }
  }

  if (problems.length > 0) {
    console.error('shared/catalog.mjs is out of date:')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
}
