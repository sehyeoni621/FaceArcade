import { useMemo, useState } from 'react'
import { Play, Share2, Trash2 } from 'lucide-react'
import { GAMES, getGame } from '../../games/registry'
import { EMPTY_RECORD, clearScores, useScoreBook } from '../../store/scores'
import { formatDate } from '../format'
import { ShareSheet } from '../share/ShareSheet'
import type { ShareCardData } from '../share/shareCard'
import { shareOrigin } from '../share/shareLink'

export function RecordsScreen({
  initialGameId,
  onPlay,
}: {
  initialGameId?: string
  onPlay: (gameId: string) => void
}) {
  const book = useScoreBook()
  const [gameId, setGameId] = useState(initialGameId ?? GAMES[0].id)
  const [confirmClear, setConfirmClear] = useState(false)
  const [sharing, setSharing] = useState<ShareCardData | null>(null)
  const game = getGame(gameId) ?? GAMES[0]
  const record = book[game.id] ?? EMPTY_RECORD
  const top = record.board[0]

  // Shares this game's best run. Stats the board actually stores, nothing more.
  const shareBest = () => {
    if (!top) return
    setSharing({
      game,
      score: top.score,
      rank: 1,
      initials: top.initials,
      stats: [
        { label: '플레이', value: `${record.plays}회` },
        { label: '등록된 기록', value: `${record.board.length}개` },
      ],
      url: shareOrigin(),
      at: new Date(top.at),
    })
  }

  // Every game's board merged into one recent-first history, as the artboard
  // shows it: this is "내 기록", not one game's leaderboard.
  const history = useMemo(() => {
    return GAMES.flatMap((item) =>
      (book[item.id]?.board ?? []).map((entry) => ({
        ...entry,
        gameTitle: item.title,
        accent: item.accent,
      })),
    )
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
  }, [book])

  return (
    <div className="page-gutter mx-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto pb-tabbar">
      <header className="pb-4">
        <div className="font-display text-xs tracking-[3px] text-neon-pink">RECORDS</div>
        <h1 className="text-3xl font-black text-white">내 기록</h1>
        <p className="mt-0.5 text-xs text-ink-mute">이 기기에 로컬 저장됨</p>
      </header>

      {/* Per-game summary cards. Horizontal scroll on a phone. */}
      <div
        className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-4"
        style={{
          WebkitMaskImage: 'linear-gradient(90deg,#000 88%,transparent)',
          maskImage: 'linear-gradient(90deg,#000 88%,transparent)',
        }}
      >
        {GAMES.map((item) => {
          const item_record = book[item.id] ?? EMPTY_RECORD
          const selected = item.id === game.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setGameId(item.id)
                setConfirmClear(false)
              }}
              aria-pressed={selected}
              className="flex w-[130px] flex-none flex-col gap-2 rounded-2xl border-[1.5px] bg-fa-card/85 p-3.5 text-left transition active:scale-95"
              style={{
                borderColor: selected ? item.accent : `${item.accent}66`,
                boxShadow: selected ? `0 0 18px ${item.accent}55` : undefined,
              }}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-[10px] text-xl"
                style={{ background: `${item.accent}22` }}
              >
                {item.emoji}
              </span>
              <span className="truncate text-[13px] font-black text-white">{item.title}</span>
              <span
                className="font-display text-[22px] font-extrabold tabular-nums"
                style={{ color: item.accent }}
              >
                {item_record.best}
              </span>
              <span className="text-[11px] text-ink-mute">{item_record.plays}회 플레이</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pb-2">
        <h2 className="text-[13px] font-bold text-ink-dim">{game.title} TOP {record.board.length || ''}</h2>
        {confirmClear ? (
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                clearScores(game.id)
                setConfirmClear(false)
              }}
              className="rounded-lg border border-neon-pink/60 px-3 py-1.5 text-xs font-bold text-neon-pink"
            >
              정말 삭제
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded-lg border border-edge-violet/50 px-3 py-1.5 text-xs text-ink-soft"
            >
              취소
            </button>
          </span>
        ) : (
          <span className="flex gap-2">
            <button
              type="button"
              onClick={shareBest}
              disabled={!top}
              className="flex items-center gap-1.5 rounded-lg border border-neon-pink/50 bg-neon-pink/10 px-3 py-1.5 text-xs font-bold text-[#ff8fe8] disabled:opacity-40"
            >
              <Share2 className="h-3.5 w-3.5" />
              최고 기록 공유
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={record.plays === 0}
              className="flex items-center gap-1.5 rounded-lg border border-edge-violet/40 px-3 py-1.5 text-xs text-ink-mute disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              초기화
            </button>
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border-[1.5px] border-edge-violet/50 bg-fa-card/85">
        {record.board.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-sm text-ink-mute">아직 기록이 없어요. 첫 기록을 남겨보세요!</p>
            <button
              type="button"
              onClick={() => onPlay(game.id)}
              className="flex h-cta-sm items-center gap-2 rounded-xl border-2 px-5 font-bold"
              style={{ borderColor: game.accent, color: game.accent, background: `${game.accent}1f` }}
            >
              <Play className="h-4 w-4 fill-current" />
              {game.title} 플레이
            </button>
          </div>
        ) : (
          <ol>
            {record.board.map((entry, index) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 border-b border-edge-violet/15 px-4 py-3.5 last:border-b-0"
                style={index === 0 ? { background: 'rgba(255,63,214,.06)' } : undefined}
              >
                <span
                  className="w-7 font-display text-[13px] font-extrabold"
                  style={{ color: index === 0 ? '#ff3fd6' : index < 3 ? '#3ff0ff' : '#8a90c8' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: game.accent }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-sm font-bold tracking-[0.2em] text-white">
                    {entry.initials}
                  </span>
                  <span className="text-[11px] text-ink-mute">{formatDate(entry.at)}</span>
                </span>
                <span className="font-display text-base font-extrabold tabular-nums text-white">
                  {entry.score}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="pb-2 pt-5 text-[13px] font-bold text-ink-dim">전체 최고 기록</h2>
          <ol className="overflow-hidden rounded-2xl border-[1.5px] border-edge-violet/50 bg-fa-card/85">
            {history.map((entry, index) => (
              <li
                key={`${entry.gameTitle}-${entry.id}`}
                className="flex items-center gap-3 border-b border-edge-violet/15 px-4 py-3.5 last:border-b-0"
                style={index === 0 ? { background: 'rgba(255,63,214,.06)' } : undefined}
              >
                <span
                  className="w-7 font-display text-[13px] font-extrabold"
                  style={{ color: index === 0 ? '#ff3fd6' : index < 3 ? '#3ff0ff' : '#8a90c8' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: entry.accent }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold text-white">{entry.gameTitle}</span>
                  <span className="text-[11px] text-ink-mute">
                    {formatDate(entry.at)} · {entry.initials}
                  </span>
                </span>
                <span className="font-display text-base font-extrabold tabular-nums text-white">
                  {entry.score}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      {sharing && <ShareSheet data={sharing} onClose={() => setSharing(null)} />}
    </div>
  )
}
