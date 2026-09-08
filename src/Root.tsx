import { useEffect, useState } from 'react'
import App from './App.tsx'
import Arcade from './arcade/Arcade.tsx'

/**
 * Two roots share the page:
 *  - `#/debug` shows the realtime debug dashboard (`App`).
 *  - anything else is the arcade itself (lobby -> game -> result).
 * Each owns its own camera pipeline, so only one is mounted at a time.
 */
export default function Root() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (hash === '#/debug') {
    return (
      <>
        <App />
        <a
          href="#/"
          className="fixed bottom-4 right-4 z-50 rounded-full border border-neon-cyan/60 bg-fa-void/90 px-4 py-2 font-display text-[11px] font-bold tracking-[0.2em] text-neon-cyan shadow-[0_0_18px_rgba(63,240,255,0.3)] backdrop-blur hover:bg-neon-cyan/15"
        >
          ← ARCADE
        </a>
      </>
    )
  }

  return <Arcade />
}
