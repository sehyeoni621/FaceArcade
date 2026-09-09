import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Share2, Trophy } from 'lucide-react'
import type { GameDefinition, GameResult } from '../../games/types'
import { DEFAULT_INITIALS, type RunOutcome } from '../../store/scores'
import { ShareSheet } from '../share/ShareSheet'
import type { ShareCardData } from '../share/shareCard'
import { shareOrigin } from '../share/shareLink'
import { playSfx } from '../../utils/sfx'

export function ResultScreen({
  game,
  result,
  outcome,
  onSaveInitials,
  onRetry,
  onLobby,
  onRecords,
}: {
  game: GameDefinition
  result: GameResult
  outcome: RunOutcome
  onSaveInitials: (initials: string) => void
  onRetry: () => void
  onLobby: () => void
  onRecords: () => void
}) {
  const [initials, setInitials] = useState('')
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const ranked = outcome.rank !== null
  const isRecord = outcome.isNewBest && result.score > 0

  // The share sheet renders a card image and falls back to save/copy, so the
  // button is never a dead control - no `navigator.share` check needed here.
  // The snapshot is frozen on open: re-creating it would restart the render.
  const [sharing, setSharing] = useState<ShareCardData | null>(null)

  useEffect(() => {
    if (!isRecord) return
    playSfx('record')
    void confetti({
      particleCount: 140,
      spread: 80,
      startVelocity: 38,
      origin: { y: 0.6 },
      colors: ['#3ff0ff', '#ff3fd6', '#3dff7a', '#ffd23f', '#b06cff'],
      disableForReducedMotion: true,
    })
  }, [isRecord])

  useEffect(() => {
    if (ranked) inputRef.current?.focus()
  }, [ranked])

  const commitInitials = () => {
    if (!ranked || saved) return
    onSaveInitials(initials || DEFAULT_INITIALS)
    setSaved(true)
  }

  // Leaving the screen through any button keeps whatever was typed.
  const leave = (next: () => void) => {
    commitInitials()
    next()
  }

  // Whatever the player typed is on the card too, so it is read at open time.
  const snapshot = (): ShareCardData => ({
    game,
    score: result.score,
    rank: outcome.rank,
    isNewBest: isRecord,
    initials: initials || null,
    stats: result.stats,
    url: shareOrigin(),
  })

  return (
    <div
      className="page-gutter mx-auto flex h-full w-full max-w-md flex-col items-center gap-5 overflow-y-auto pt-20 text-center"
      style={{
        background: 'radial-gradient(ellipse 90% 40% at 50% 10%,rgba(255,63,214,.25),transparent 70%)',
      }}
    >
      {isRecord ? (
        <span
          className="rounded-full px-5 py-2 font-display text-[13px] font-extrabold tracking-[3px] text-white"
          style={{
            background: 'linear-gradient(90deg,#ff3fd6,#7b5cff)',
            boxShadow: '0 0 30px rgba(255,63,214,.7)',
          }}
        >
          ★ NEW RECORD ★
        </span>
      ) : (
        <span className="rounded-full border border-edge-violet/50 px-5 py-2 font-display text-[13px] font-bold tracking-[3px] text-ink-soft">
          GAME OVER
        </span>
      )}

      <div>
        <div className="font-display text-xs tracking-[3px] text-ink-mute">
          {game.emoji} {game.title.toUpperCase()}
        </div>
        <div
          className="mt-2 font-display text-[84px] font-extrabold leading-none tabular-nums text-white"
          style={{ textShadow: '0 0 30px #3ff0ff,0 0 70px rgba(255,63,214,.6)' }}
        >
          {result.score}
        </div>
        <div className="mt-2 text-sm text-ink-dim">
          {isRecord
            ? outcome.previousBest > 0
              ? `이전 최고 ${outcome.previousBest}${game.scoreUnit}`
              : '첫 기록이에요'
            : `최고 기록 ${Math.max(outcome.previousBest, result.score)}${game.scoreUnit}`}
        </div>
      </div>

      {result.stats.length > 0 && (
        <dl className="grid w-full grid-cols-2 gap-2.5">
          {result.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[14px] border border-edge-violet/45 bg-fa-card/80 p-3.5 text-left"
            >
              <dt className="text-[11px] text-ink-mute">{stat.label}</dt>
              <dd className="font-display text-[22px] font-extrabold tabular-nums text-white">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {ranked && (
        <div
          className="flex w-full items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-3 text-left"
          style={{ borderColor: `${game.accent}`, background: `${game.accent}1a` }}
        >
          <Trophy className="h-5 w-5 flex-none" style={{ color: game.accent }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">랭킹 {outcome.rank}위 진입</p>
            <p className="text-[11px] text-ink-mute">이름(최대 3글자)을 남겨 두세요</p>
          </div>
          <input
            ref={inputRef}
            value={initials}
            maxLength={3}
            disabled={saved}
            onChange={(event) => setInitials(event.target.value.toUpperCase().slice(0, 3))}
            onKeyDown={(event) => event.key === 'Enter' && commitInitials()}
            onBlur={commitInitials}
            placeholder="AAA"
            aria-label="이니셜"
            className="w-20 flex-none rounded-lg border border-edge-violet/50 bg-fa-void px-2 py-2 text-center font-display text-lg font-bold uppercase tracking-[0.2em] text-ink outline-none focus:border-neon-cyan disabled:opacity-60"
          />
        </div>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => leave(onRetry)}
        className="h-cta w-full rounded-2xl border-2 border-neon-cyan bg-neon-cyan/20 text-[17px] font-black text-ink-ice transition active:scale-[0.98]"
        style={{ boxShadow: '0 0 22px rgba(63,240,255,.4)' }}
      >
        다시하기
      </button>

      <div className="flex w-full gap-2.5">
        <button
          type="button"
          onClick={() => leave(onLobby)}
          className="h-[50px] flex-1 rounded-[14px] border-[1.5px] border-neon-purple/80 bg-fa-card/80 text-[15px] font-bold text-ink transition active:scale-[0.98]"
        >
          다른 게임
        </button>
        <button
          type="button"
          onClick={() => leave(onRecords)}
          className="h-[50px] flex-1 rounded-[14px] border-[1.5px] border-edge-violet/70 bg-fa-card/80 text-[15px] font-bold text-ink transition active:scale-[0.98]"
        >
          기록 보기
        </button>
        <button
          type="button"
          onClick={() => {
            commitInitials()
            setSharing(snapshot())
          }}
          aria-label="기록 공유"
          className="grid h-[50px] w-[50px] flex-none place-items-center rounded-[14px] border-[1.5px] border-neon-pink/60 bg-neon-pink/10 text-[#ff8fe8] transition active:scale-[0.98]"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {sharing && <ShareSheet data={sharing} onClose={() => setSharing(null)} />}
    </div>
  )
}
