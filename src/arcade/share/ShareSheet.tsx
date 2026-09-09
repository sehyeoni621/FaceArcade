import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Download, Link2, Share2, X } from 'lucide-react'
import { renderShareCard, type ShareCardData } from './shareCard'
import {
  buildShareUrl,
  canShareImage,
  canShareLink,
  copyLink,
  downloadCard,
  shareImage,
  shareLink,
  type ShareOutcome,
} from './shareLink'

/**
 * The share sheet: shows the record exactly as the recipient will see it, then
 * hands it off. Rendering the card up front - rather than only on tap - is the
 * point of the screen; nobody shares a score they have not seen.
 */
export function ShareSheet({ data, onClose }: { data: ShareCardData; onClose: () => void }) {
  const [card, setCard] = useState<{ blob: Blob; src: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const noteTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let src: string | null = null
    let live = true
    renderShareCard(data)
      .then((blob) => {
        if (!live) return
        src = URL.createObjectURL(blob)
        setCard({ blob, src })
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (src) URL.revokeObjectURL(src)
    }
  }, [data])

  // Escape closes, and the sheet owns the page scroll while it is up.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      window.clearTimeout(noteTimer.current)
    }
  }, [onClose])

  const announce = (outcome: ShareOutcome) => {
    const messages: Record<ShareOutcome, string | null> = {
      shared: null, // The OS already showed its own confirmation.
      copied: '링크를 복사했어요',
      downloaded: '이미지를 저장했어요',
      cancelled: null,
      unsupported: '이 브라우저에서는 지원되지 않아요',
      failed: '공유하지 못했어요. 다시 시도해 주세요',
    }
    const message = messages[outcome]
    if (!message) return
    setNote(message)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(null), 2400)
  }

  const act = async (run: () => ShareOutcome | Promise<ShareOutcome>) => {
    if (busy) return
    setBusy(true)
    announce(await run())
    setBusy(false)
  }

  const accent = data.game.accent
  const imageReady = card !== null
  const withImage = canShareImage(card?.blob ?? null, data.game.id)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-fa-void/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="기록 공유"
      onClick={onClose}
    >
      <div
        className="sheet-shell mx-auto w-full max-w-md border border-edge-line/40 bg-fa-card px-6 pt-3"
        style={{ boxShadow: `0 -20px 60px ${accent}33` }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grabber" />

        <header className="flex items-center justify-between pb-4 pt-4">
          <div>
            <p className="font-display text-[11px] font-bold tracking-[0.28em] text-neon-pink">SHARE</p>
            <h2 className="text-xl font-black text-white">기록 공유</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-11 w-11 place-items-center rounded-full border border-edge-line/40 text-ink-mute transition active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Preview. The 4:5 box is reserved up front so the sheet does not
            jump when the render lands. */}
        <div
          className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border-[1.5px]"
          style={{ aspectRatio: '4 / 5', borderColor: `${accent}80`, boxShadow: `0 0 28px ${accent}33` }}
        >
          {card ? (
            <img src={card.src} alt={`${data.game.title} ${data.score}${data.game.scoreUnit} 기록 카드`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-fa-void">
              <p className="animate-fa-pulse font-display text-[11px] tracking-[0.28em] text-ink-mute">
                {failed ? 'NO IMAGE' : 'RENDERING'}
              </p>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-ink-mute">
          {failed
            ? '이미지를 만들지 못했어요. 링크로 공유해 주세요.'
            : withImage
              ? '이미지와 링크가 함께 전달돼요'
              : '카드를 저장하거나 링크로 공유할 수 있어요'}
        </p>

        <div className="mt-5 space-y-2.5">
          {withImage && card ? (
            <SheetButton
              primary
              accent={accent}
              icon={<Share2 className="h-[18px] w-[18px]" />}
              disabled={busy}
              onClick={() => act(() => shareImage(card.blob, data))}
            >
              이미지로 공유
            </SheetButton>
          ) : (
            <SheetButton
              primary
              accent={accent}
              icon={<Share2 className="h-[18px] w-[18px]" />}
              disabled={busy}
              onClick={() => act(() => (canShareLink() ? shareLink(data) : copyLink(data)))}
            >
              {canShareLink() ? '링크 공유' : '링크 복사'}
            </SheetButton>
          )}

          <div className="flex gap-2.5">
            <SheetButton
              icon={<Download className="h-4 w-4" />}
              disabled={busy || !imageReady}
              onClick={() => card && act(() => downloadCard(card.blob, data))}
            >
              이미지 저장
            </SheetButton>
            <SheetButton
              icon={note === '링크를 복사했어요' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              disabled={busy}
              onClick={() => act(() => copyLink(data))}
            >
              링크 복사
            </SheetButton>
          </div>
        </div>

        <p className="mt-4 truncate text-center font-mono text-[10px] text-ink-faint" title={buildShareUrl(data)}>
          {buildShareUrl(data).replace(/^https?:\/\//, '')}
        </p>

        <p aria-live="polite" className="mt-2 h-4 text-center text-[11px] font-bold" style={{ color: accent }}>
          {note}
        </p>
      </div>
    </div>
  )
}

function SheetButton({
  children,
  icon,
  onClick,
  disabled,
  primary,
  accent,
}: {
  children: ReactNode
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-2xl border-[1.5px] font-bold transition active:scale-[0.98] disabled:opacity-40 ${
        primary
          ? 'h-cta w-full text-[16px] text-white'
          : 'h-cta-sm flex-1 border-edge-violet/60 bg-fa-panel/70 text-[14px] text-ink'
      }`}
      style={primary && accent ? { borderColor: accent, background: `${accent}26`, boxShadow: `0 0 22px ${accent}4d` } : undefined}
    >
      {icon}
      {children}
    </button>
  )
}
