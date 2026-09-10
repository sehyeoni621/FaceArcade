import { useEffect, useState } from 'react'
import { Play, Timer, X } from 'lucide-react'
import { useGames } from '../../games/registry'
import { CONTROL_LABEL, type ResolvedGame } from '../../games/types'
import { useT } from '../../i18n'
import { useScoreBook } from '../../store/scores'
import { Wordmark } from '../ui'

export function LobbyScreen({
  faceDetected,
  fps,
  onPlay,
}: {
  faceDetected: boolean
  fps: number
  onPlay: (game: ResolvedGame) => void
}) {
  const { t } = useT()
  const games = useGames()
  const book = useScoreBook()
  const [detailId, setDetailId] = useState<string | null>(null)

  // Held by id, not by object: the sheet has to survive a language switch,
  // which rebuilds every ResolvedGame.
  const detail = detailId ? games.find((game) => game.id === detailId) : undefined

  const totalPlays = games.reduce((sum, game) => sum + (book[game.id]?.plays ?? 0), 0)
  const topScore = games.reduce((best, game) => Math.max(best, book[game.id]?.best ?? 0), 0)
  const playedCount = games.filter((game) => (book[game.id]?.plays ?? 0) > 0).length

  return (
    <div className="page-gutter mx-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto pb-tabbar">
      <header className="flex items-center justify-between gap-3 pb-3.5">
        <div className="flex items-center gap-2.5">
          <svg width="34" height="24" viewBox="0 0 56 40" fill="none" aria-hidden>
            <rect x="3" y="8" width="50" height="26" rx="12" stroke="#3ff0ff" strokeWidth="3" />
            <path d="M14 16v10M9 21h10" stroke="#3ff0ff" strokeWidth="3" strokeLinecap="round" />
            <circle cx="38" cy="18" r="2.4" fill="#ff3fd6" />
            <circle cx="44" cy="22" r="2.4" fill="#ff3fd6" />
          </svg>
          <Wordmark className="text-xl" />
        </div>
        <span
          className={`flex flex-none items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-3 py-2 text-xs ${
            faceDetected
              ? 'border-neon-cyan/60 bg-[#0a1432]/70 text-ink-ice'
              : 'border-edge-violet/45 bg-fa-card/70 text-ink-mute'
          }`}
        >
          <span
            className={`h-[7px] w-[7px] rounded-full ${faceDetected ? 'bg-neon-green' : 'bg-ink-mute'}`}
            style={faceDetected ? { boxShadow: '0 0 8px #3dff7a' } : undefined}
          />
          {faceDetected ? t('lobby.cameraOn', { fps }) : t('lobby.searching')}
        </span>
      </header>

      <div className="flex gap-2.5 pb-4">
        <StatTile label={t('lobby.totalPlays')} value={totalPlays} color="#3ff0ff" />
        <StatTile label={t('lobby.topScore')} value={topScore} color="#ff3fd6" />
        <StatTile
          label={t('lobby.gamesPlayed')}
          value={`${playedCount}/${games.length}`}
          color="#b06cff"
        />
      </div>

      <h2 className="pb-2 font-display text-xs tracking-[3px] text-neon-pink">SELECT GAME</h2>

      <ul className="flex flex-col gap-3">
        {games.map((game) => {
          const record = book[game.id]
          return (
            <li key={game.id}>
              <div
                className="relative flex min-h-[64px] items-center gap-3.5 rounded-[18px] border-[1.5px] bg-fa-deep/85 p-4"
                style={{ borderColor: `${game.accent}aa`, boxShadow: `0 0 20px ${game.accent}33` }}
              >
                <button
                  type="button"
                  onClick={() => setDetailId(game.id)}
                  className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                  aria-label={t('lobby.viewDetails', { title: game.title })}
                >
                  <span
                    className="grid h-14 w-14 flex-none place-items-center rounded-[14px] text-3xl"
                    style={{ background: `${game.accent}22` }}
                  >
                    {game.emoji}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-black text-white">{game.title}</span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[11px] font-bold"
                        style={{ borderColor: game.accent, color: game.accent }}
                      >
                        {t(CONTROL_LABEL[game.controls[0]])}
                      </span>
                    </span>
                    <span className="text-xs leading-snug text-ink-dim">{game.tagline}</span>
                    <span className="text-xs text-ink-mute">
                      BEST{' '}
                      <b className="font-display tabular-nums" style={{ color: game.accent }}>
                        {record?.best ?? 0}
                      </b>
                      {(record?.plays ?? 0) > 0 && (
                        <span className="ml-2">{t('unit.times', { n: record?.plays ?? 0 })}</span>
                      )}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onPlay(game)}
                  aria-label={t('lobby.quickStart', { title: game.title })}
                  className="grid h-12 w-12 flex-none place-items-center rounded-full text-[#04122a] transition active:scale-95"
                  style={{ background: game.accent, boxShadow: `0 0 14px ${game.accent}` }}
                >
                  <Play className="h-5 w-5 fill-current" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {detail && (
        <GameSheet
          game={detail}
          best={book[detail.id]?.best ?? 0}
          onClose={() => setDetailId(null)}
          onStart={() => {
            const game = detail
            setDetailId(null)
            onPlay(game)
          }}
        />
      )}
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex-1 rounded-[14px] border border-edge-violet/45 bg-fa-card/70 px-3.5 py-3">
      <div className="text-[11px] text-ink-mute">{label}</div>
      <div className="font-display text-xl font-extrabold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

/** Game detail as a bottom sheet - the artboard's modal pattern on mobile. */
function GameSheet({
  game,
  best,
  onClose,
  onStart,
}: {
  game: ResolvedGame
  best: number
  onClose: () => void
  onStart: () => void
}) {
  const { t } = useT()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 bg-[#020210]/80 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('lobby.detail', { title: game.title })}
        className="sheet-shell relative mx-auto flex w-full max-w-2xl flex-col gap-4 border-2 bg-fa-deep/[.98] px-5 pt-3"
        style={{ borderColor: game.accent, boxShadow: `0 -10px 50px ${game.accent}4d` }}
      >
        <div className="sheet-grabber" />

        <div className="flex items-center gap-3.5">
          <span
            className="grid h-[60px] w-[60px] flex-none place-items-center rounded-2xl text-3xl"
            style={{ background: `${game.accent}26` }}
          >
            {game.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-white">{game.title}</h2>
            <p className="text-[13px]" style={{ color: game.accent }}>
              {game.controls.map((c) => t(CONTROL_LABEL[c])).join(' · ')} ·{' '}
              {t('unit.seconds', { n: game.durationSec })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid h-touch w-touch flex-none place-items-center rounded-full border-[1.5px] border-edge-violet/60 text-ink-soft"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm leading-[1.7] text-ink-soft">{game.description}</p>

        <ul className="flex flex-col gap-2">
          {game.howTo.map((line) => (
            <li
              key={line}
              className="flex items-center gap-3 rounded-xl border border-edge-violet/35 bg-fa-panel/70 px-3.5 py-3 text-sm"
            >
              <Timer className="h-4 w-4 flex-none" style={{ color: game.accent }} />
              {line}
            </li>
          ))}
        </ul>

        <div className="flex justify-between text-[13px] text-ink-dim">
          <span>{t('lobby.best')}</span>
          <span className="font-display font-extrabold tabular-nums" style={{ color: game.accent }}>
            {best}
            {game.scoreUnit}
          </span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="h-cta w-full rounded-2xl font-display text-lg font-extrabold tracking-[2px] text-[#04122a] transition active:scale-[0.98]"
          style={{ background: game.accent, boxShadow: `0 0 24px ${game.accent}99` }}
        >
          GAME START
        </button>
      </div>
    </div>
  )
}
