/**
 * Plain-data mirror of the `GameDefinition`s in `src/games/*.ts`.
 *
 * The share landing page (`api/share.js`) and the brand renderer
 * (`scripts/brand/brand.mjs`) both run outside the Vite bundle and cannot
 * import the real definitions - those pull in canvas and game loops. So the
 * presentational fields live here as well.
 *
 * Player-visible fields carry both languages, exactly as `src/games/*.ts` does.
 * `node scripts/render-brand.mjs` diffs this file against src/games and fails
 * loudly when the two drift, so a renamed game cannot silently ship a stale
 * share page.
 */
export const LANGS = ['ko', 'en']

export const DEFAULT_LANG = 'ko'

export function isLang(value) {
  return LANGS.includes(value)
}

export const CATALOG = [
  {
    id: 'tilt-runner',
    title: { ko: '틸트 러너', en: 'Tilt Runner' },
    tagline: {
      ko: '머리를 기울여 장애물을 피하세요',
      en: 'Tilt your head to dodge the blocks',
    },
    description: {
      ko: '머리를 좌우로 기울이면 글라이더가 따라 움직입니다. 떨어지는 블록을 피하고 코인을 모으세요. 세 번 부딪히면 끝!',
      en: 'Lean your head left or right and the glider follows. Dodge the falling blocks, collect the coins. Three hits and you are done!',
    },
    emoji: '🛸',
    accent: '#3ff0ff',
    control: { ko: '머리 기울이기', en: 'Tilt your head' },
    durationSec: 60,
    scoreUnit: { ko: '점', en: ' pts' },
  },
  {
    id: 'mouth-catch',
    title: { ko: '냠냠 캐치', en: 'Chomp Catch' },
    tagline: {
      ko: '입을 벌려 떨어지는 음식을 받아먹으세요',
      en: 'Open wide and catch the falling food',
    },
    description: {
      ko: '얼굴을 움직여 떨어지는 음식 아래로 가고, 입을 크게 벌려 받아먹으세요. 폭탄과 고추는 입을 다물고 흘려보내야 합니다.',
      en: 'Move your face under the falling food and open wide to eat it. Bombs and chillies have to be let through with your mouth shut.',
    },
    emoji: '🍔',
    accent: '#3dff7a',
    control: { ko: '얼굴 움직이기 + 입 벌리기', en: 'Move your face + open your mouth' },
    durationSec: 45,
    scoreUnit: { ko: '점', en: ' pts' },
  },
  {
    id: 'mimic',
    title: { ko: '표정 따라하기', en: 'Face Mimic' },
    tagline: {
      ko: '카드에 뜬 표정을 시간 안에 지으세요',
      en: 'Pull the face on the card before time runs out',
    },
    description: {
      ko: '웃기, 입 벌리기, 윙크, 머리 기울이기… 카드가 시키는 표정을 시간이 끝나기 전에 지으세요. 라운드가 오를수록 시간이 짧아집니다.',
      en: 'Smile, open wide, wink, tilt your head… make the face the card asks for before the bar empties. Every round gives you a little less time.',
    },
    emoji: '🎭',
    accent: '#b06cff',
    control: { ko: '표정 짓기', en: 'Pull a face' },
    durationSec: 60,
    scoreUnit: { ko: '점', en: ' pts' },
  },
  {
    id: 'wink-shooter',
    title: { ko: '윙크 슈터', en: 'Wink Shooter' },
    tagline: {
      ko: '표적이 뜬 쪽 눈을 윙크해 쏘세요',
      en: 'Wink the eye on the side the target appears',
    },
    description: {
      ko: '화면 왼쪽에 표적이 뜨면 왼쪽 눈을, 오른쪽에 뜨면 오른쪽 눈을 윙크하세요. 표적이 작아져 사라지기 전에 맞춰야 합니다.',
      en: 'A target on the left half means wink your left eye; one on the right means your right. Hit it before it shrinks away.',
    },
    emoji: '🎯',
    accent: '#ff3fd6',
    control: { ko: '윙크', en: 'Wink' },
    durationSec: 45,
    scoreUnit: { ko: '점', en: ' pts' },
  },
]

export function findGame(id) {
  return CATALOG.find((game) => game.id === id) ?? null
}

/** Flattens a catalog entry into one language. */
export function localizeGame(game, lang) {
  const pick = (value) => (value && typeof value === 'object' ? (value[lang] ?? value.ko) : value)
  return {
    ...game,
    title: pick(game.title),
    tagline: pick(game.tagline),
    description: pick(game.description),
    control: pick(game.control),
    scoreUnit: pick(game.scoreUnit),
  }
}
