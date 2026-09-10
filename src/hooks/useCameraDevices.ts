import { useCallback, useEffect, useState } from 'react'
import { translate, useLang } from '../i18n'

export interface CameraDevice {
  deviceId: string
  label: string
}

/**
 * Lists video input devices. Labels are only populated once the page has
 * camera permission, so this re-queries on `devicechange` and can be refreshed
 * manually after the stream starts.
 */
export function useCameraDevices(): { devices: CameraDevice[]; refresh: () => void } {
  const lang = useLang()
  const [devices, setDevices] = useState<CameraDevice[]>([])

  const refresh = useCallback(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => {
        const cameras = list
          .filter((device) => device.kind === 'videoinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || translate(lang, 'camera.numbered', { n: index + 1 }),
          }))
        setDevices(cameras)
      })
      .catch(() => setDevices([]))
  }, [lang])

  useEffect(() => {
    refresh()
    const media = navigator.mediaDevices
    if (!media?.addEventListener) return
    media.addEventListener('devicechange', refresh)
    return () => media.removeEventListener('devicechange', refresh)
  }, [refresh])

  return { devices, refresh }
}
