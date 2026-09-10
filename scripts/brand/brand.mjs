/**
 * Every FaceArcade brand image is drawn here, so the app icon, the favicon and
 * the link-preview cards can never drift apart.
 *
 * `node scripts/render-brand.mjs` writes the SVGs into `public/` and rasterises
 * the PNG sizes that iOS/Android/messengers insist on. It is a design-time
 * script, not part of `npm run build` - it shells out to Chrome.
 */

export { CATALOG as GAMES } from '../../shared/catalog.mjs'
import { CATALOG, localizeGame } from '../../shared/catalog.mjs'

/** The app skin, mirrored from tailwind.config.js. */
export const PALETTE = {
  void: '#04041a',
  card: '#080824',
  panel: '#0e0c32',
  cyan: '#3ff0ff',
  pink: '#ff3fd6',
  violet: '#7b5cff',
  purple: '#b06cff',
  green: '#3dff7a',
  ink: '#e6e9ff',
  dim: '#b9bff0',
  mute: '#8a90c8',
}

/* ------------------------------------------------------------------ */
/* App icon                                                            */
/* ------------------------------------------------------------------ */

/**
 * The mark: a face being scanned by an arcade cabinet. One eye open, one
 * winking - the wink is the app's whole input vocabulary in one glyph.
 *
 * @param {object} [options]
 * @param {boolean} [options.maskable] Full-bleed, content inside the 80% safe
 *   circle Android crops to.
 * @param {boolean} [options.simple] Drop the mesh and brackets, fatten the
 *   strokes. For favicon sizes where fine detail turns to mud.
 */
export function iconBody({ maskable = false, simple = false } = {}) {
  const face = `
  <g clip-path="url(#headClip)">
    <rect x="120" y="84" width="272" height="320" fill="#080a28" />
    ${simple ? '' : '<rect x="120" y="84" width="272" height="320" fill="url(#weave)" />'}
    <ellipse cx="256" cy="242" rx="150" ry="150" fill="url(#bloom)" />
  </g>
  <path d="${HEAD_PATH}" fill="none" stroke="url(#mesh)" stroke-width="${simple ? 16 : 12}" filter="url(#glow)" />
  <g filter="url(#glow)">
    <circle cx="203" cy="228" r="${simple ? 23 : 20}" fill="${PALETTE.cyan}" />
    <path d="M281 238q29-28 58 0" fill="none" stroke="${PALETTE.pink}" stroke-width="${simple ? 18 : 15}" stroke-linecap="round" />
    <path d="M198 300q58 58 116 0" fill="none" stroke="${PALETTE.cyan}" stroke-width="${simple ? 19 : 16}" stroke-linecap="round" />
  </g>`

  const brackets = simple
    ? ''
    : `
  <g stroke="${PALETTE.cyan}" stroke-opacity="0.5" stroke-width="9" stroke-linecap="round" fill="none">
    <path d="M96 152V116a20 20 0 0 1 20-20h36" />
    <path d="M416 152V116a20 20 0 0 0-20-20h-36" />
    <path d="M96 372v36a20 20 0 0 0 20 20h36" />
    <path d="M416 372v36a20 20 0 0 1-20 20h-36" />
  </g>`

  // Maskable icons get cropped to a circle on some launchers, so the tile fills
  // the canvas and the artwork shrinks into the safe zone instead.
  const body = brackets + face
  const inner = maskable
    ? `<g transform="translate(256 256) scale(0.76) translate(-256 -256)">${body}</g>`
    : body
  const plate = maskable
    ? `<rect width="512" height="512" fill="url(#tile)" /><rect width="512" height="512" fill="url(#bloom)" />`
    : `<rect width="512" height="512" rx="116" fill="url(#tile)" />
       <rect width="512" height="512" rx="116" fill="url(#bloom)" />
       <rect x="7" y="7" width="498" height="498" rx="110" fill="none" stroke="url(#neon)" stroke-width="9" stroke-opacity="0.95" />`

  return `${plate}
  ${inner}`
}

/** The icon as a standalone document. */
export function appIcon(options = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="FaceArcade">
  <title>FaceArcade</title>
  <defs>${ICON_DEFS(options.simple ?? false)}</defs>
  ${iconBody(options)}
</svg>
`
}

const HEAD_PATH =
  'M256 96c-76 0-124 47-124 122v46c0 74 55 124 124 124s124-50 124-124v-46c0-75-48-122-124-122z'

const ICON_DEFS = (simple) => `
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#171243" />
      <stop offset="0.55" stop-color="#0a0830" />
      <stop offset="1" stop-color="${PALETTE.void}" />
    </linearGradient>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.cyan}" />
      <stop offset="0.52" stop-color="${PALETTE.violet}" />
      <stop offset="1" stop-color="${PALETTE.pink}" />
    </linearGradient>
    <linearGradient id="mesh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PALETTE.cyan}" stop-opacity="0.6" />
      <stop offset="1" stop-color="${PALETTE.pink}" stop-opacity="0.4" />
    </linearGradient>
    <radialGradient id="bloom" cx="0.5" cy="0.42" r="0.62">
      <stop offset="0" stop-color="${PALETTE.violet}" stop-opacity="0.55" />
      <stop offset="1" stop-color="${PALETTE.violet}" stop-opacity="0" />
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${simple ? 6 : 9}" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <pattern id="weave" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(15 256 256)">
      <path d="M0 0H34M0 0V34" stroke="#6ea8ff" stroke-opacity="0.42" stroke-width="1.6" fill="none" />
      <path d="M0 34L34 0" stroke="#6ea8ff" stroke-opacity="0.22" stroke-width="1.4" fill="none" />
    </pattern>
    <clipPath id="headClip"><path d="${HEAD_PATH}" /></clipPath>`

/* ------------------------------------------------------------------ */
/* Link preview cards                                                  */
/* ------------------------------------------------------------------ */

/**
 * 1200x630 og:image. One per game plus a default, pre-rendered as PNG because
 * every messenger that matters refuses SVG previews.
 *
 * The score is deliberately absent: these are static files, and a preview that
 * showed someone else's number would be a lie. The score rides in og:title,
 * which Kakao/Slack/Twitter all render next to the image.
 */
const DEFAULT_TAGLINE = {
  ko: '웹캠과 얼굴만으로 즐기는 미니게임 아케이드',
  en: 'A minigame arcade you play with a webcam and your face',
}

/** Sits under the wordmark on every card. */
const SITE_TAGLINE = {
  ko: '얼굴로 조종하는 웹캠 아케이드',
  en: 'The webcam arcade you play with your face',
}

/** The one-line promise in the pill. Widths differ enough to matter. */
const CAMERA_BADGE = {
  ko: { text: '📷 카메라만 있으면 OK', width: 330 },
  en: { text: '📷 All you need is a camera', width: 430 },
}

const HEADLINE = {
  ko: '얼굴이 곧 조이스틱입니다',
  en: 'Your face is the controller',
}

export function ogCard(game, lang = 'ko') {
  const local = game ? localizeGame(game, lang) : null
  const accent = local?.accent ?? PALETTE.violet
  const title = local?.title ?? 'FaceArcade'
  const tagline = local?.tagline ?? DEFAULT_TAGLINE[lang]
  const emoji = local?.emoji ?? '🕹️'
  const badge = CAMERA_BADGE[lang]

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" font-family="Orbitron, 'Noto Sans KR', sans-serif">
  <defs>${ICON_DEFS(false)}
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0930" />
      <stop offset="1" stop-color="${PALETTE.void}" />
    </linearGradient>
    <radialGradient id="halo" cx="0.72" cy="0.28" r="0.7">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.42" />
      <stop offset="1" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="wordmark" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${PALETTE.cyan}" />
      <stop offset="0.55" stop-color="${PALETTE.violet}" />
      <stop offset="1" stop-color="${PALETTE.pink}" />
    </linearGradient>
    <pattern id="floor" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M0 0H60M0 0V60" stroke="${accent}" stroke-opacity="0.16" stroke-width="1.5" fill="none" />
    </pattern>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#floor)" />
  <rect width="1200" height="630" fill="url(#halo)" />
  <rect x="14" y="14" width="1172" height="602" rx="34" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="3" />

  <!-- The mark, reused at card scale. -->
  <g transform="translate(72 64) scale(0.235)">${iconBody()}</g>
  <text x="212" y="120" fill="url(#wordmark)" font-size="42" font-weight="800" letter-spacing="7">FACEARCADE</text>
  <text x="214" y="158" fill="${PALETTE.mute}" font-size="21" font-family="'Noto Sans KR', sans-serif" letter-spacing="1">${escapeXml(SITE_TAGLINE[lang])}</text>

  <!-- Oversized ghost of the mark, bled off the right edge. -->
  <g opacity="0.2" transform="translate(830 60) scale(1.05)" stroke="${accent}" fill="none" stroke-linecap="round">
    <path d="${HEAD_PATH}" stroke-width="14" filter="url(#soft)" />
    <path d="${HEAD_PATH}" stroke-width="8" />
    <circle cx="203" cy="228" r="20" fill="${accent}" stroke="none" />
    <path d="M281 238q29-28 58 0" stroke-width="15" />
    <path d="M198 300q58 58 116 0" stroke-width="16" />
  </g>

  <text x="76" y="360" font-size="120" font-family="'Noto Color Emoji','Segoe UI Emoji', sans-serif">${emoji}</text>
  <text x="230" y="352" fill="#ffffff" font-size="82" font-weight="800" font-family="'Noto Sans KR', sans-serif">${escapeXml(title)}</text>
  <text x="234" y="410" fill="${PALETTE.dim}" font-size="30" font-family="'Noto Sans KR', sans-serif">${escapeXml(tagline)}</text>

  <g transform="translate(76 470)">
    <rect width="${badge.width}" height="66" rx="33" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-opacity="0.8" stroke-width="2.5" />
    <text x="34" y="43" fill="${accent}" font-size="25" font-weight="700" font-family="'Noto Sans KR', sans-serif">${escapeXml(badge.text)}</text>
  </g>
  <text x="${76 + badge.width + 34}" y="512" fill="${PALETTE.mute}" font-size="24" letter-spacing="3">FACEARCADE.VERCEL.APP</text>
</svg>
`
}

/* ------------------------------------------------------------------ */
/* Play Store feature graphic                                          */
/* ------------------------------------------------------------------ */

/**
 * 1024x500 feature graphic for the Play Store listing. Play crops it and
 * sometimes lays the app icon and title over one side, so the composition
 * keeps a wide margin and puts nothing critical at the very edges.
 *
 * @param {string} [lang] ko | en
 */
export function featureGraphic(lang = 'ko') {
  const games = CATALOG.map((game) => localizeGame(game, lang))
  const pad = 56
  const gap = 16
  const chipW = Math.round((1024 - pad * 2 - gap * (games.length - 1)) / games.length)

  const chips = games
    .map(
      (game, index) => `
  <g transform="translate(${pad + index * (chipW + gap)} 296)">
    <rect width="${chipW}" height="96" rx="22" fill="${PALETTE.panel}" fill-opacity="0.85" stroke="${game.accent}" stroke-opacity="0.75" stroke-width="2.5" />
    <text x="${chipW / 2}" y="46" text-anchor="middle" font-size="34" font-family="'Noto Color Emoji','Segoe UI Emoji', sans-serif">${game.emoji}</text>
    <text x="${chipW / 2}" y="78" text-anchor="middle" fill="${PALETTE.ink}" font-size="17" font-weight="700" font-family="'Noto Sans KR', sans-serif">${escapeXml(game.title)}</text>
  </g>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500" font-family="Orbitron, 'Noto Sans KR', sans-serif">
  <defs>${ICON_DEFS(false)}
    <linearGradient id="fgBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b0930" />
      <stop offset="1" stop-color="${PALETTE.void}" />
    </linearGradient>
    <radialGradient id="fgHalo" cx="0.78" cy="0.22" r="0.75">
      <stop offset="0" stop-color="${PALETTE.violet}" stop-opacity="0.45" />
      <stop offset="1" stop-color="${PALETTE.violet}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="fgWord" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${PALETTE.cyan}" />
      <stop offset="0.55" stop-color="${PALETTE.violet}" />
      <stop offset="1" stop-color="${PALETTE.pink}" />
    </linearGradient>
    <pattern id="fgFloor" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M0 0H56M0 0V56" stroke="${PALETTE.cyan}" stroke-opacity="0.13" stroke-width="1.5" fill="none" />
    </pattern>
    <filter id="fgSoft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="16" />
    </filter>
  </defs>

  <rect width="1024" height="500" fill="url(#fgBg)" />
  <rect width="1024" height="500" fill="url(#fgFloor)" />
  <rect width="1024" height="500" fill="url(#fgHalo)" />

  <!-- Oversized ghost of the mark, bled off the right edge as texture. -->
  <g opacity="0.13" transform="translate(742 -46) scale(0.92)" stroke="${PALETTE.violet}" fill="none" stroke-linecap="round">
    <path d="${HEAD_PATH}" stroke-width="14" filter="url(#fgSoft)" />
    <path d="${HEAD_PATH}" stroke-width="8" />
    <circle cx="203" cy="228" r="20" fill="${PALETTE.violet}" stroke="none" />
    <path d="M281 238q29-28 58 0" stroke-width="15" />
    <path d="M198 300q58 58 116 0" stroke-width="16" />
  </g>

  <!-- The mark, reused at listing scale. -->
  <g transform="translate(${pad} 40) scale(0.19)">${iconBody()}</g>
  <text x="${pad + 116}" y="96" fill="url(#fgWord)" font-size="45" font-weight="800" letter-spacing="7">FACEARCADE</text>
  <text x="${pad + 118}" y="130" fill="${PALETTE.mute}" font-size="19" font-family="'Noto Sans KR', sans-serif" letter-spacing="1">${escapeXml(SITE_TAGLINE[lang])}</text>

  <text x="${pad}" y="232" fill="#ffffff" font-size="46" font-weight="800" font-family="'Noto Sans KR', sans-serif">${escapeXml(HEADLINE[lang])}</text>
${chips}
  <text x="${pad}" y="452" fill="${PALETTE.mute}" font-size="20" letter-spacing="3">FACEARCADE.VERCEL.APP</text>
</svg>
`
}

export function escapeXml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char],
  )
}
