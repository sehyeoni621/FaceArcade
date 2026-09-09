/**
 * Plain-data mirror of the `GameDefinition`s in `src/games/*.ts`.
 *
 * The share landing page (`api/share.js`) and the brand renderer
 * (`scripts/brand/brand.mjs`) both run outside the Vite bundle and cannot
 * import the real definitions - those pull in canvas and game loops. So the
 * presentational fields live here as well.
 *
 * `node scripts/render-brand.mjs` diffs this file against src/games and fails
 * loudly when the two drift, so a renamed game cannot silently ship a stale
 * share page.
 */
export const CATALOG = [
  {
    id: 'tilt-runner',
    title: '틸트 러너',
    tagline: '머리를 기울여 장애물을 피하세요',
    description:
      '머리를 좌우로 기울이면 글라이더가 따라 움직입니다. 떨어지는 블록을 피하고 코인을 모으세요. 세 번 부딪히면 끝!',
    emoji: '🛸',
    accent: '#3ff0ff',
    control: '머리 기울이기',
    durationSec: 60,
    scoreUnit: '점',
  },
  {
    id: 'mouth-catch',
    title: '냠냠 캐치',
    tagline: '입을 벌려 떨어지는 음식을 받아먹으세요',
    description:
      '얼굴을 움직여 떨어지는 음식 아래로 가고, 입을 크게 벌려 받아먹으세요. 폭탄과 고추는 입을 다물고 흘려보내야 합니다.',
    emoji: '🍔',
    accent: '#3dff7a',
    control: '얼굴 움직이기 + 입 벌리기',
    durationSec: 45,
    scoreUnit: '점',
  },
  {
    id: 'mimic',
    title: '표정 따라하기',
    tagline: '카드에 뜬 표정을 시간 안에 지으세요',
    description:
      '웃기, 입 벌리기, 윙크, 머리 기울이기… 카드가 시키는 표정을 시간이 끝나기 전에 지으세요. 라운드가 오를수록 시간이 짧아집니다.',
    emoji: '🎭',
    accent: '#b06cff',
    control: '표정 짓기',
    durationSec: 60,
    scoreUnit: '점',
  },
  {
    id: 'wink-shooter',
    title: '윙크 슈터',
    tagline: '표적이 뜬 쪽 눈을 윙크해 쏘세요',
    description:
      '화면 왼쪽에 표적이 뜨면 왼쪽 눈을, 오른쪽에 뜨면 오른쪽 눈을 윙크하세요. 표적이 작아져 사라지기 전에 맞춰야 합니다.',
    emoji: '🎯',
    accent: '#ff3fd6',
    control: '윙크',
    durationSec: 45,
    scoreUnit: '점',
  },
]

export function findGame(id) {
  return CATALOG.find((game) => game.id === id) ?? null
}
