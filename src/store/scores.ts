import { createPersistedStore } from './storage'

/** How many entries each game's leaderboard keeps. */
export const BOARD_SIZE = 10
/** How many recent scores are kept for the history sparkline. */
const RECENT_SIZE = 20

export const DEFAULT_INITIALS = '---'

export interface ScoreEntry {
  id: string
  score: number
  /** ISO timestamp. */
  at: string
  initials: string
}

export interface GameRecord {
  best: number
  plays: number
  /** Top scores, highest first. */
  board: ScoreEntry[]
  /** Most recent scores, newest first. */
  recent: number[]
}

export type ScoreBook = Record<string, GameRecord>

export const EMPTY_RECORD: GameRecord = { best: 0, plays: 0, board: [], recent: [] }

export const scoreStore = createPersistedStore<ScoreBook>('facearcade:scores:v1', {}, (raw) => {
  const book = (raw ?? {}) as Record<string, Partial<GameRecord>>
  const repaired: ScoreBook = {}
  for (const [gameId, record] of Object.entries(book)) {
    repaired[gameId] = {
      best: record.best ?? 0,
      plays: record.plays ?? 0,
      board: Array.isArray(record.board) ? record.board : [],
      recent: Array.isArray(record.recent) ? record.recent : [],
    }
  }
  return repaired
})

export function useScoreBook(): ScoreBook {
  return scoreStore.use()
}

export function getRecord(gameId: string): GameRecord {
  return scoreStore.get()[gameId] ?? EMPTY_RECORD
}

export interface RunOutcome {
  /** Id of the leaderboard entry, when the score made the board. */
  entryId: string | null
  /** 1-based leaderboard rank, or null when it did not qualify. */
  rank: number | null
  /** True when this beat the previous best for the game. */
  isNewBest: boolean
  previousBest: number
}

/**
 * Records a finished run. The score always counts toward plays/recent; it
 * only lands on the board if it beats the current tenth place.
 */
export function submitRun(gameId: string, score: number): RunOutcome {
  const previous = getRecord(gameId)
  const previousBest = previous.best
  let outcome: RunOutcome = { entryId: null, rank: null, isNewBest: false, previousBest }

  scoreStore.set((book) => {
    const record = book[gameId] ?? EMPTY_RECORD
    const entry: ScoreEntry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      score,
      at: new Date().toISOString(),
      initials: DEFAULT_INITIALS,
    }

    const board = [...record.board, entry]
      .sort((a, b) => b.score - a.score || a.at.localeCompare(b.at))
      .slice(0, BOARD_SIZE)
    const rankIndex = board.findIndex((item) => item.id === entry.id)

    outcome = {
      entryId: rankIndex >= 0 ? entry.id : null,
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      isNewBest: score > record.best,
      previousBest: record.best,
    }

    return {
      ...book,
      [gameId]: {
        best: Math.max(record.best, score),
        plays: record.plays + 1,
        board,
        recent: [score, ...record.recent].slice(0, RECENT_SIZE),
      },
    }
  })

  return outcome
}

/** Names a leaderboard entry after the fact (arcade-style initials). */
export function setEntryInitials(gameId: string, entryId: string, initials: string) {
  const clean = initials.toUpperCase().replace(/[^A-Z0-9가-힣]/g, '').slice(0, 3) || DEFAULT_INITIALS
  scoreStore.set((book) => {
    const record = book[gameId]
    if (!record) return book
    return {
      ...book,
      [gameId]: {
        ...record,
        board: record.board.map((entry) => (entry.id === entryId ? { ...entry, initials: clean } : entry)),
      },
    }
  })
}

export function clearScores(gameId?: string) {
  scoreStore.set((book) => {
    if (!gameId) return {}
    const next = { ...book }
    delete next[gameId]
    return next
  })
}
