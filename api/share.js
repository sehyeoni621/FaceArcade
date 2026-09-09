/**
 * The share landing page: `https://facearcade.vercel.app/s?g=...&v=...`
 *
 * Everything a shared record needs lives in the query string, so this route is
 * static-cacheable and needs no database. It exists because the app is a hash
 * routed SPA - a crawler that fetches `/#/...` gets index.html's generic tags,
 * and a record shared into KakaoTalk would preview as "FaceArcade" and nothing
 * else. Here the og: tags carry the game and the score.
 *
 * The query string is attacker-controlled (anyone can hand-edit a link), so
 * every value is validated against the catalog or a pattern before it reaches
 * the HTML, and everything interpolated goes through escapeHtml.
 *
 * `vercel.json` rewrites /s to this function.
 */
import { CATALOG, findGame } from '../shared/catalog.mjs'

const ORIGIN = 'https://facearcade.vercel.app'
const MAX_SCORE = 9_999_999

export default function handler(req, res) {
  const params = new URL(req.url, ORIGIN).searchParams
  const record = readRecord(params)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // The page is a pure function of the query string, so it can sit on the edge.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800')
  res.status(200).send(page(record))
}

/* ------------------------------------------------------------------ */
/* Reading the link                                                    */
/* ------------------------------------------------------------------ */

function readRecord(params) {
  const game = findGame(params.get('g') ?? '')
  if (!game) return null

  const score = clampInt(params.get('v'), 0, MAX_SCORE)
  if (score === null) return null

  return {
    game,
    score,
    rank: clampInt(params.get('r'), 1, 10),
    isNewBest: params.get('b') === '1',
    initials: readInitials(params.get('n')),
    stats: readStats(params.get('x')),
    date: /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') ?? '') ? params.get('d') : null,
  }
}

function clampInt(raw, min, max) {
  if (raw === null || !/^\d{1,9}$/.test(raw)) return null
  const value = Number(raw)
  return value >= min && value <= max ? value : null
}

function readInitials(raw) {
  if (!raw) return null
  const clean = raw.toUpperCase().replace(/[^A-Z0-9가-힣]/g, '').slice(0, 3)
  return clean && clean !== '---' ? clean : null
}

/** `라벨~값|라벨~값`, as written by src/arcade/share/shareLink.ts. */
function readStats(raw) {
  if (!raw) return []
  return raw
    .split('|')
    .slice(0, 3)
    .map((pair) => pair.split('~'))
    .filter(([label, value]) => label && value)
    .map(([label, value]) => ({ label: label.slice(0, 16), value: value.slice(0, 16) }))
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

function page(record) {
  const game = record?.game ?? null
  const accent = game?.accent ?? '#7b5cff'
  const image = `${ORIGIN}/og/${game ? game.id : 'facearcade'}.png`
  const score = record ? `${record.score.toLocaleString('ko-KR')}${record.game.scoreUnit}` : null

  const title = record
    ? `${record.isNewBest ? '🏆 ' : ''}${record.game.title} ${score} · FaceArcade`
    : 'FaceArcade · 얼굴로 조종하는 웹캠 아케이드'
  const description = record
    ? `${record.initials ? `${record.initials}님이 ` : ''}${record.game.title}에서 ${score}${
        record.rank ? ` (랭킹 ${record.rank}위)` : ''
      }. ${record.game.tagline} 카메라만 켜면 바로 도전할 수 있어요.`
    : '설치 없이 카메라만 켜면 시작. 머리를 기울이고, 입을 벌리고, 윙크해서 즐기는 미니게임 4종.'

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta name="theme-color" content="#04041a" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="FaceArcade" />
<meta property="og:locale" content="ko_KR" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(game ? `${game.title} - FaceArcade` : 'FaceArcade')}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Orbitron:wght@600;800&display=swap" rel="stylesheet" />
<style>${styles(accent)}</style>
</head>
<body>
<div class="floor" aria-hidden="true"></div>
<main>
  <a class="brand" href="/">
    <img src="/icon.svg" width="44" height="44" alt="" />
    <span>
      <b>FACEARCADE</b>
      <i>얼굴로 조종하는 웹캠 아케이드</i>
    </span>
  </a>

  ${record ? recordCard(record) : invite()}

  <a class="cta" href="${game ? `/?g=${encodeURIComponent(game.id)}` : '/'}">${
    record ? `${escapeHtml(record.game.title)} 도전하기` : '지금 플레이하기'
  }</a>
  <p class="note">설치 없이 브라우저에서 바로 실행돼요. 카메라 영상은 기기 안에서만 처리되고 어디에도 전송되지 않습니다.</p>

  ${gameStrip(game?.id)}

  <footer>
    <a href="/">facearcade.vercel.app</a>
  </footer>
</main>
</body>
</html>`
}

function recordCard(record) {
  const { game, score, rank, isNewBest, initials, stats, date } = record
  const badges = [
    isNewBest ? `<span class="badge best">★ NEW RECORD</span>` : '',
    rank ? `<span class="badge">랭킹 ${rank}위</span>` : '',
    initials ? `<span class="badge who">${escapeHtml(initials)}</span>` : '',
  ].join('')

  return `
  <p class="eyebrow">공유된 기록</p>
  <section class="card">
    <div class="game">
      <span class="emoji">${escapeHtml(game.emoji)}</span>
      <span>
        <b>${escapeHtml(game.title)}</b>
        <i>${escapeHtml(game.tagline)}</i>
      </span>
    </div>

    <p class="label">SCORE</p>
    <p class="score">${escapeHtml(score.toLocaleString('ko-KR'))}<em>${escapeHtml(game.scoreUnit)}</em></p>
    ${badges ? `<div class="badges">${badges}</div>` : ''}

    ${
      stats.length
        ? `<dl class="stats">${stats
            .map(
              (stat) =>
                `<div><dt>${escapeHtml(stat.label)}</dt><dd>${escapeHtml(stat.value)}</dd></div>`,
            )
            .join('')}</dl>`
        : ''
    }
    ${date ? `<p class="date">${escapeHtml(date.replace(/-/g, '.'))} 기록</p>` : ''}
  </section>

  <section class="how">
    <h2>${escapeHtml(game.title)}, 이런 게임이에요</h2>
    <p>${escapeHtml(game.description)}</p>
    <ul>
      <li><span>조작</span>${escapeHtml(game.control)}</li>
      <li><span>한 판</span>${game.durationSec}초</li>
      <li><span>준비물</span>웹캠 또는 휴대폰 앞 카메라</li>
    </ul>
  </section>`
}

function invite() {
  return `
  <p class="eyebrow">웹캠 아케이드</p>
  <section class="card">
    <div class="game">
      <span class="emoji">🕹️</span>
      <span>
        <b>FaceArcade</b>
        <i>웹캠과 얼굴만으로 즐기는 미니게임 아케이드</i>
      </span>
    </div>
    <p class="label">READY</p>
    <p class="score">4<em>게임</em></p>
    <p class="date">머리를 기울이고, 입을 벌리고, 윙크해서 플레이합니다</p>
  </section>`
}

function gameStrip(currentId) {
  return `<section class="strip">
  <h2>아케이드의 게임들</h2>
  <ul>
    ${CATALOG.map(
      (game) => `<li${game.id === currentId ? ' class="on"' : ''} style="--accent:${game.accent}">
      <span class="emoji">${escapeHtml(game.emoji)}</span>
      <b>${escapeHtml(game.title)}</b>
      <i>${escapeHtml(game.tagline)}</i>
    </li>`,
    ).join('')}
  </ul>
</section>`
}

/* ------------------------------------------------------------------ */
/* Styling - the app's tokens, inlined so the page needs no bundle.    */
/* ------------------------------------------------------------------ */

function styles(accent) {
  return `
:root{--accent:${accent};--void:#04041a;--card:#080824;--panel:#0e0c32;--ink:#e6e9ff;--dim:#b9bff0;--mute:#8a90c8;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--void);color:var(--ink);font-family:'Noto Sans KR',system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 45% at 50% 0%,color-mix(in srgb,var(--accent) 26%,transparent),transparent 70%);pointer-events:none}
.floor{position:fixed;left:-25%;right:-25%;bottom:0;height:42vh;background-image:linear-gradient(color-mix(in srgb,var(--accent) 26%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--accent) 26%,transparent) 1px,transparent 1px);background-size:64px 48px;transform:perspective(500px) rotateX(60deg);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(to top,#000,transparent);mask-image:linear-gradient(to top,#000,transparent);opacity:.5;pointer-events:none}
main{position:relative;width:100%;max-width:480px;margin:0 auto;padding:max(24px,env(safe-area-inset-top)) 20px calc(40px + env(safe-area-inset-bottom))}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none;margin-bottom:28px}
.brand img{border-radius:12px}
.brand b{display:block;font-family:Orbitron,sans-serif;font-weight:800;font-size:19px;letter-spacing:.18em;background:linear-gradient(90deg,#3ff0ff,#7b5cff 55%,#ff3fd6);-webkit-background-clip:text;background-clip:text;color:transparent}
.brand i{display:block;font-style:normal;font-size:11px;color:var(--mute);margin-top:2px}
.eyebrow{font-family:Orbitron,sans-serif;font-size:11px;font-weight:800;letter-spacing:.3em;color:var(--mute);text-align:center;margin:0 0 12px}

.card{border:1.5px solid color-mix(in srgb,var(--accent) 60%,transparent);background:rgba(8,8,36,.8);border-radius:26px;padding:24px 20px 26px;text-align:center;box-shadow:0 0 40px color-mix(in srgb,var(--accent) 22%,transparent),inset 0 0 40px rgba(120,90,255,.07);backdrop-filter:blur(8px)}
.game{display:flex;align-items:center;gap:12px;text-align:left;justify-content:center}
.game .emoji{font-size:38px;line-height:1}
.game b{display:block;font-size:20px;font-weight:900;color:#fff}
.game i{display:block;font-style:normal;font-size:12px;color:var(--dim);margin-top:2px}
.label{font-family:Orbitron,sans-serif;font-size:11px;font-weight:800;letter-spacing:.3em;color:var(--mute);margin:22px 0 2px}
.score{font-family:Orbitron,sans-serif;font-size:clamp(56px,17vw,76px);font-weight:800;line-height:1;color:#fff;margin:0;text-shadow:0 0 30px var(--accent),0 0 70px color-mix(in srgb,var(--accent) 45%,transparent);font-variant-numeric:tabular-nums}
.score em{font-family:'Noto Sans KR',sans-serif;font-style:normal;font-size:22px;font-weight:900;color:var(--accent);margin-left:6px;text-shadow:none}
.badges{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px}
.badge{border:1.5px solid color-mix(in srgb,var(--accent) 70%,transparent);background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);border-radius:999px;padding:7px 15px;font-size:12px;font-weight:800}
.badge.best{border-color:#ff3fd6;background:linear-gradient(90deg,#ff3fd6,#7b5cff);color:#fff;box-shadow:0 0 22px rgba(255,63,214,.55)}
.badge.who{border-color:rgba(123,92,255,.8);background:rgba(123,92,255,.16);color:#c7bcff;font-family:Orbitron,sans-serif;letter-spacing:.16em}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;margin:20px 0 0}
.stats div{border:1px solid rgba(120,90,255,.32);background:rgba(4,4,26,.6);border-radius:14px;padding:11px 8px}
.stats dt{font-size:11px;color:var(--mute)}
.stats dd{margin:4px 0 0;font-family:Orbitron,sans-serif;font-size:18px;font-weight:800;color:#fff}
.date{margin:16px 0 0;font-size:11px;color:var(--mute)}

.how{margin-top:22px;border:1px solid rgba(120,90,255,.3);background:rgba(8,8,36,.6);border-radius:20px;padding:20px}
.how h2{margin:0 0 8px;font-size:14px;font-weight:900;color:#fff}
.how p{margin:0;font-size:13px;line-height:1.7;color:var(--dim)}
.how ul{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:8px}
.how li{display:flex;gap:10px;align-items:center;font-size:12.5px;color:var(--ink)}
.how li span{flex:none;min-width:56px;font-size:11px;font-weight:700;color:var(--accent)}

.cta{display:flex;align-items:center;justify-content:center;height:58px;margin-top:24px;border-radius:18px;border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 20%,transparent);color:#fff;font-size:17px;font-weight:900;text-decoration:none;box-shadow:0 0 26px color-mix(in srgb,var(--accent) 40%,transparent)}
.cta:active{transform:scale(.985)}
.note{margin:12px 0 0;font-size:11px;line-height:1.6;color:var(--mute);text-align:center}

.strip{margin-top:34px}
.strip h2{font-family:Orbitron,sans-serif;font-size:11px;font-weight:800;letter-spacing:.28em;color:var(--mute);margin:0 0 12px}
.strip ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.strip li{display:flex;align-items:center;gap:12px;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);background:rgba(8,8,36,.7);border-radius:16px;padding:12px 14px}
.strip li.on{border-color:var(--accent);box-shadow:0 0 18px color-mix(in srgb,var(--accent) 33%,transparent)}
.strip .emoji{font-size:24px}
.strip b{font-size:13.5px;font-weight:800;color:#fff}
.strip i{font-style:normal;font-size:11px;color:var(--mute);margin-left:auto;text-align:right;max-width:52%}

footer{margin-top:28px;text-align:center}
footer a{font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:.22em;color:var(--mute);text-decoration:none}

@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  )
}
