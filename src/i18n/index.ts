import { useEffect, useMemo } from 'react'
import { settingsStore } from '../store/settings'
import { applyDocumentLang, makeT, type Lang, type T } from './core'

export * from './core'

/** The language the app is currently displayed in. */
export function useLang(): Lang {
  return settingsStore.use().lang
}

/**
 * The translator, rebuilt only when the language changes so components that
 * depend on `t` keep stable identities between renders.
 */
export function useT(): { t: T; lang: Lang } {
  const lang = useLang()
  return useMemo(() => ({ t: makeT(lang), lang }), [lang])
}

/** Keeps `<html lang>` and the pre-React landscape notice in step. */
export function useDocumentLang() {
  const lang = useLang()
  useEffect(() => applyDocumentLang(lang), [lang])
}
