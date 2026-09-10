/**
 * shared/catalog.mjs restates fields that really live in src/games/*.ts.
 * This reads both and reports every disagreement, so a stale catalog cannot
 * put the wrong title on a link preview or on the share landing page.
 *
 * Player-visible fields carry both languages, so both are compared - an
 * English title updated in one place only is just as much a drift as a Korean
 * one.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CATALOG, LANGS } from '../../shared/catalog.mjs'

const SOURCES = ['tiltRunner', 'mouthCatch', 'mimic', 'winkShooter']

/** Fields written once per language in both files. */
const LOCALIZED_FIELDS = ['title', 'tagline', 'scoreUnit']
/** Fields written as a single plain value. */
const PLAIN_FIELDS = ['emoji']

/** A single-quoted TS string literal, allowing escaped quotes inside. */
const STR = String.raw`'((?:[^'\\]|\\.)*)'`

/** Reads `key: 'value'` from a definition block. */
function plainField(block, key) {
  return block.match(new RegExp(`^  ${key}: ${STR}`, 'm'))?.[1]
}

/**
 * Reads `key: { ko: '...', en: '...' }` from a definition block, whether it
 * was written on one line or spread over several.
 */
function localizedField(block, key) {
  const match = block.match(
    new RegExp(`^  ${key}: \\{\\s*ko: ${STR},\\s*en: ${STR},?\\s*\\}`, 'ms'),
  )
  if (!match) return undefined
  return { ko: match[1], en: match[2] }
}

function unescape(value) {
  return typeof value === 'string' ? value.replace(/\\(['\\])/g, '$1') : value
}

export async function assertCatalogMatchesGames(root) {
  const problems = []

  for (const name of SOURCES) {
    const code = await readFile(join(root, 'src', 'games', `${name}.ts`), 'utf8')
    const accentConst = code.match(/^const ACCENT = '(#[0-9a-fA-F]{6})'/m)?.[1]
    const block = code.match(/export const \w+: GameDefinition = \{[\s\S]*?\n\}/)?.[0] ?? ''

    const id = plainField(block, 'id')
    const game = CATALOG.find((item) => item.id === id)
    if (!game) {
      problems.push(`${name}.ts: id "${id}" is missing from shared/catalog.mjs`)
      continue
    }

    for (const key of PLAIN_FIELDS) {
      const expected = unescape(plainField(block, key))
      if (expected !== undefined && game[key] !== expected) {
        problems.push(
          `${id}.${key}: src/games has ${JSON.stringify(expected)}, catalog has ${JSON.stringify(game[key])}`,
        )
      }
    }

    for (const key of LOCALIZED_FIELDS) {
      const expected = localizedField(block, key)
      if (!expected) {
        problems.push(`${id}.${key}: could not read a { ko, en } pair out of ${name}.ts`)
        continue
      }
      for (const lang of LANGS) {
        const want = unescape(expected[lang])
        const have = game[key]?.[lang]
        if (want !== have) {
          problems.push(
            `${id}.${key}.${lang}: src/games has ${JSON.stringify(want)}, catalog has ${JSON.stringify(have)}`,
          )
        }
      }
    }

    const accent = block.includes('accent: ACCENT') ? accentConst : plainField(block, 'accent')
    if (accent !== undefined && game.accent !== accent) {
      problems.push(
        `${id}.accent: src/games has ${JSON.stringify(accent)}, catalog has ${JSON.stringify(game.accent)}`,
      )
    }

    const durationSec = Number(block.match(/^  durationSec: (\d+)/m)?.[1])
    if (Number.isFinite(durationSec) && game.durationSec !== durationSec) {
      problems.push(
        `${id}.durationSec: src/games has ${durationSec}, catalog has ${game.durationSec}`,
      )
    }
  }

  if (problems.length > 0) {
    console.error('shared/catalog.mjs is out of date:')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
}
