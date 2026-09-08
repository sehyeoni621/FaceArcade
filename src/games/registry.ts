import { mimic } from './mimic'
import { mouthCatch } from './mouthCatch'
import { tiltRunner } from './tiltRunner'
import type { GameDefinition } from './types'
import { winkShooter } from './winkShooter'

/** Lobby order. */
export const GAMES: GameDefinition[] = [tiltRunner, mouthCatch, mimic, winkShooter]

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((game) => game.id === id)
}
