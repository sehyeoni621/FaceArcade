import { useMemo } from 'react'
import { pick, useLang, type Lang } from '../i18n'
import { mimic } from './mimic'
import { mouthCatch } from './mouthCatch'
import { tiltRunner } from './tiltRunner'
import type { GameDefinition, ResolvedGame } from './types'
import { winkShooter } from './winkShooter'

/** Lobby order. */
export const GAMES: GameDefinition[] = [tiltRunner, mouthCatch, mimic, winkShooter]

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}

/** Flattens one game's two-language strings down to the language in use. */
export function resolveGame(game: GameDefinition, lang: Lang): ResolvedGame {
  return {
    ...game,
    title: pick(game.title, lang),
    tagline: pick(game.tagline, lang),
    description: pick(game.description, lang),
    howTo: pick(game.howTo, lang),
    scoreUnit: pick(game.scoreUnit, lang),
  }
}

/**
 * The lobby list in the current language. Memoised per language so the array
 * identity is stable across renders and cards do not remount on every tick.
 */
export function useGames(): ResolvedGame[] {
  const lang = useLang()
  return useMemo(() => GAMES.map((game) => resolveGame(game, lang)), [lang])
}

export function useGame(id: string | null | undefined): ResolvedGame | undefined {
  const games = useGames()
  return id ? games.find((game) => game.id === id) : undefined
}
