import { useLayoutEffect, useState } from 'react'

/**
 * Largest `aspect` (width / height) box that fits inside the element, in CSS
 * pixels. CSS `aspect-ratio` alone cannot shrink the width when the height is
 * the limiting side, which is exactly the case for a landscape webcam on a
 * short viewport, so this measures instead.
 */
export function useFitBox(
  containerRef: React.RefObject<HTMLElement | null>,
  aspect: number,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = () => {
      const { clientWidth, clientHeight } = element
      if (clientWidth === 0 || clientHeight === 0) return
      let width = clientWidth
      let height = width / aspect
      if (height > clientHeight) {
        height = clientHeight
        width = height * aspect
      }
      setSize((current) =>
        Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5
          ? current
          : { width, height },
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [containerRef, aspect])

  return size
}
