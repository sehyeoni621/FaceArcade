import { useCallback, useEffect, useState } from 'react'

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
            label: device.label || `카메라 ${index + 1}`,
          }))
        setDevices(cameras)
      })
      .catch(() => setDevices([]))
  }, [])

  useEffect(() => {
    refresh()
    const media = navigator.mediaDevices
    if (!media?.addEventListener) return
    media.addEventListener('devicechange', refresh)
    return () => media.removeEventListener('devicechange', refresh)
  }, [refresh])

  return { devices, refresh }
}
