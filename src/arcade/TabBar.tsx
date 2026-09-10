import { Gamepad2, Settings, Trophy } from 'lucide-react'
import { useT, type StringKey } from '../i18n'
import { playSfx, unlockSfx } from '../utils/sfx'

export type TabKey = 'games' | 'records' | 'settings'

const TABS: { key: TabKey; labelKey: StringKey; Icon: typeof Gamepad2 }[] = [
  { key: 'games', labelKey: 'tab.games', Icon: Gamepad2 },
  { key: 'records', labelKey: 'tab.records', Icon: Trophy },
  { key: 'settings', labelKey: 'tab.settings', Icon: Settings },
]

/**
 * Bottom tab bar from the mobile artboard. Fixed to the bottom of the screen,
 * fading into the page, with the home indicator accounted for.
 *
 * Screens that show it reserve `pb-tabbar` worth of scroll space so the last
 * row never hides underneath.
 */
export function TabBar({
  active,
  onNavigate,
}: {
  active: TabKey
  onNavigate: (tab: TabKey) => void
}) {
  const { t } = useT()

  return (
    <nav
      aria-label={t('tab.nav')}
      className="tabbar-shell pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-start justify-around px-4 pt-2.5"
    >
      {TABS.map(({ key, labelKey, Icon }) => {
        const current = key === active
        return (
          <button
            key={key}
            type="button"
            aria-current={current ? 'page' : undefined}
            onClick={() => {
              unlockSfx()
              playSfx('select')
              onNavigate(key)
            }}
            className={`flex h-14 w-20 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition active:scale-95 ${
              current ? 'text-neon-cyan' : 'text-ink-faint hover:text-ink-soft'
            }`}
          >
            <Icon
              className="h-6 w-6"
              style={current ? { filter: 'drop-shadow(0 0 8px rgba(63,240,255,.8))' } : undefined}
            />
            {t(labelKey)}
          </button>
        )
      })}
    </nav>
  )
}
