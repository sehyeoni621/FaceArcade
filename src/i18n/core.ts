import { EN } from './strings.en'
import { KO, type StringKey } from './strings.ko'

export type { StringKey }

export type Lang = 'ko' | 'en'

/** Order used by the language picker in Settings. */
export const LANGS: readonly Lang[] = ['ko', 'en'] as const

/** Each language names itself, so the picker reads for the person switching. */
export const LANG_LABEL: Record<Lang, string> = {
  ko: '한국어',
  en: 'English',
}

const TABLES: Record<Lang, Record<StringKey, string>> = { ko: KO, en: EN }

/** A value that exists once per language - game titles, control names, etc. */
export type Localized = Record<Lang, string>
export type LocalizedList = Record<Lang, string[]>

export function isLang(value: unknown): value is Lang {
  return value === 'ko' || value === 'en'
}

/**
 * Picks the starting language from the browser. Anything Korean gets Korean;
 * everything else gets English, which is the wider net of the two.
 */
export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of tags) {
    if (typeof tag !== 'string') continue
    if (tag.toLowerCase().startsWith('ko')) return 'ko'
  }
  return 'en'
}

export type TranslateParams = Record<string, string | number>

/** Fills `{name}` placeholders. An unknown placeholder is left as written. */
function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  )
}

export function translate(lang: Lang, key: StringKey, params?: TranslateParams): string {
  return interpolate(TABLES[lang][key] ?? KO[key], params)
}

/** A bound `translate` - what components and game engines actually hold. */
export type T = (key: StringKey, params?: TranslateParams) => string

export function makeT(lang: Lang): T {
  return (key, params) => translate(lang, key, params)
}

export function pick(value: Localized, lang: Lang): string
export function pick(value: LocalizedList, lang: Lang): string[]
export function pick(value: Localized | LocalizedList, lang: Lang): string | string[] {
  return value[lang] ?? value.ko
}

/**
 * Applies the language to the document shell: the `lang` attribute (screen
 * readers and hyphenation read it) and the rotate-your-phone notice, which
 * lives in index.html so it can paint before React mounts.
 */
export function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang

  const notice = document.getElementById('landscape-notice')
  if (!notice) return
  const set = (selector: string, key: StringKey) => {
    const el = notice.querySelector<HTMLElement>(selector)
    if (el) el.textContent = translate(lang, key)
  }
  set('[data-i18n="landscape.rotate"]', 'landscape.rotate')
  set('[data-i18n="landscape.hint"]', 'landscape.hint')
}
