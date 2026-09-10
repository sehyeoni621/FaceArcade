/**
 * The link a shared record points at, and the plumbing that hands the card to
 * the OS share sheet.
 *
 * A record link is `/s?g=<game>&v=<score>&...`. It is served by `api/share.js`,
 * which reads the same parameters back and renders the landing page with
 * matching og: tags - so keep the two in sync.
 */
import type { ResultStat } from '../../games/types'
import { makeT } from '../../i18n/core'
import { NUMBER_LOCALE, type ShareCardData } from './shareCard'

/** Where a shared link should point when the app runs off a dev origin. */
const PRODUCTION_ORIGIN = 'https://facearcade.vercel.app'

export function shareOrigin(): string {
  if (typeof window === 'undefined') return PRODUCTION_ORIGIN
  // localhost / LAN dev builds have no public /s route, so links stay useful
  // by pointing at production.
  const { origin, hostname } = window.location
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  return local ? PRODUCTION_ORIGIN : origin
}

export function buildShareUrl(data: ShareCardData): string {
  const url = new URL('/s', shareOrigin())
  url.searchParams.set('g', data.game.id)
  url.searchParams.set('v', String(Math.round(data.score)))
  if (data.rank) url.searchParams.set('r', String(data.rank))
  if (data.isNewBest) url.searchParams.set('b', '1')
  if (data.initials && data.initials !== '---') url.searchParams.set('n', data.initials)
  if (data.stats?.length) url.searchParams.set('x', encodeStats(data.stats))
  const at = data.at ?? new Date()
  url.searchParams.set('d', at.toISOString().slice(0, 10))
  // The landing page renders its own copy; tell it which language to use.
  url.searchParams.set('l', data.lang)
  return url.toString()
}

/** `라벨~값` pairs joined by `|`. Short enough to survive a Kakao message. */
function encodeStats(stats: ResultStat[]): string {
  return stats
    .slice(0, 3)
    .map((stat) => `${stat.label.replace(/[~|]/g, ' ')}~${String(stat.value).replace(/[~|]/g, ' ')}`)
    .join('|')
}

export function shareText(data: ShareCardData): string {
  const t = makeT(data.lang)
  const score = `${data.score.toLocaleString(NUMBER_LOCALE[data.lang])}${data.game.scoreUnit}`
  const lead = data.isNewBest
    ? t('link.newRecord', { title: data.game.title, score })
    : t('link.record', { emoji: data.game.emoji, title: data.game.title, score })
  return `${lead}\n${t('link.tagline')}`
}

/* ------------------------------------------------------------------ */
/* Handing it off                                                      */
/* ------------------------------------------------------------------ */

export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'unsupported' | 'failed'

function toFile(blob: Blob, gameId: string): File {
  return new File([blob], `facearcade-${gameId}.png`, { type: 'image/png' })
}

/** True when the OS sheet will take a PNG - iOS Safari and Android Chrome do. */
export function canShareImage(blob: Blob | null, gameId: string): boolean {
  if (!blob || typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [toFile(blob, gameId)] })
  } catch {
    return false
  }
}

export function canShareLink(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

/** Card + text + link into the OS share sheet. */
export async function shareImage(blob: Blob, data: ShareCardData): Promise<ShareOutcome> {
  try {
    await navigator.share({
      files: [toFile(blob, data.game.id)],
      title: `FaceArcade · ${data.game.title}`,
      text: shareText(data),
    })
    return 'shared'
  } catch (error) {
    return abortedByUser(error) ? 'cancelled' : 'failed'
  }
}

export async function shareLink(data: ShareCardData): Promise<ShareOutcome> {
  const url = buildShareUrl(data)
  if (!canShareLink()) return await copyLink(data)
  try {
    await navigator.share({ title: `FaceArcade · ${data.game.title}`, text: shareText(data), url })
    return 'shared'
  } catch (error) {
    return abortedByUser(error) ? 'cancelled' : 'failed'
  }
}

export async function copyLink(data: ShareCardData): Promise<ShareOutcome> {
  const payload = `${shareText(data)}\n${buildShareUrl(data)}`
  try {
    await navigator.clipboard.writeText(payload)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** Saves the PNG. On iOS this opens it in a tab instead - Safari's call. */
export function downloadCard(blob: Blob, data: ShareCardData): ShareOutcome {
  try {
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `facearcade-${data.game.id}-${data.score}.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(href), 10_000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

/** A dismissed share sheet rejects with AbortError; that is not an error. */
function abortedByUser(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
