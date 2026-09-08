import { useEffect, useState } from 'react'
import { ChevronRight, RefreshCcw } from 'lucide-react'
import { useCameraDevices } from '../../hooks/useCameraDevices'
import {
  DIFFICULTY_LABEL,
  resetSettings,
  THRESHOLD_RANGE,
  updateSettings,
  updateThreshold,
  useSettings,
  type Difficulty,
} from '../../store/settings'
import type { GestureThresholds } from '../../utils/gestureInput'
import { MAX_HEAD_TILT_DEG } from '../../utils/faceGestures'
import { useFaceInputBus } from '../faceInput'
import { ThresholdMeter } from '../ui'

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

interface SliderSpec {
  key: keyof GestureThresholds
  label: string
  hint: string
  color: string
  /** Reads the live value from the current frame for the calibration meter. */
  live: (frame: { smile: number; mouthOpen: number; blinkLeft: number; blinkRight: number; tilt: number }) => number
  max: number
  format: (value: number) => string
}

const SLIDERS: SliderSpec[] = [
  {
    key: 'smile',
    label: '웃음 민감도',
    hint: 'mouthSmile 임계값',
    color: '#ff3fd6',
    live: (f) => f.smile,
    max: 1,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'mouthOpen',
    label: '입 벌림 민감도',
    hint: 'jawOpen 임계값',
    color: '#3dff7a',
    live: (f) => f.mouthOpen,
    max: 1,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'blink',
    label: '깜빡임 민감도',
    hint: 'eyeBlink 임계값',
    color: '#3ff0ff',
    live: (f) => Math.max(f.blinkLeft, f.blinkRight),
    max: 1,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'tilt',
    label: '기울기 민감도',
    hint: '이 각도를 넘어야 좌/우로 인식',
    color: '#b06cff',
    live: (f) => Math.abs(f.tilt),
    max: MAX_HEAD_TILT_DEG,
    format: (v) => `${Math.round(v)}°`,
  },
]

/** One row in the settings list. 56px minimum, per the artboard. */
function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-cta items-center justify-between gap-3 border-b border-edge-violet/20 py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[15px] font-bold text-white">{label}</div>
        {description && <div className="text-xs text-ink-mute">{description}</div>}
      </div>
      {children}
    </div>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-[30px] w-[52px] flex-none rounded-[15px] border-[1.5px] transition-all duration-200"
      style={{
        borderColor: on ? '#3ff0ff' : 'rgba(120,90,255,.6)',
        background: on ? 'rgba(63,240,255,.35)' : 'rgba(14,12,50,.9)',
      }}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-[left] duration-200"
        style={{ left: on ? '25px' : '3px' }}
      />
    </button>
  )
}

export function SettingsScreen() {
  const settings = useSettings()
  const bus = useFaceInputBus()
  const { devices, refresh } = useCameraDevices()
  const [live, setLive] = useState(bus.latest)

  // Live meters at 15 Hz so the player can see where their own expressions land.
  useEffect(() => {
    const id = window.setInterval(() => setLive(bus.latest), 66)
    return () => window.clearInterval(id)
  }, [bus])

  return (
    <div className="page-gutter mx-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto pb-tabbar">
      <header className="pb-4">
        <div className="font-display text-xs tracking-[3px] text-neon-pink">SETTINGS</div>
        <h1 className="text-3xl font-black text-white">설정</h1>
      </header>

      <div className="rounded-2xl border-[1.5px] border-edge-violet/50 bg-fa-card/85 px-4">
        <Row label="카메라" description={devices.length > 0 ? `${devices.length}개 사용 가능` : '전면 카메라'}>
          <select
            value={settings.cameraDeviceId ?? ''}
            onFocus={refresh}
            onChange={(event) => updateSettings({ cameraDeviceId: event.target.value || null })}
            aria-label="카메라 장치"
            className="max-w-[45%] rounded-lg border border-edge-violet/40 bg-fa-void px-2 py-2 text-[13px] text-neon-cyan outline-none focus:border-neon-cyan"
          >
            <option value="">기본 (전면)</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </Row>

        <Row label="난이도" description="다음 게임부터 적용">
          <div className="flex flex-none gap-1.5">
            {DIFFICULTIES.map((level) => {
              const active = settings.difficulty === level
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => updateSettings({ difficulty: level })}
                  aria-pressed={active}
                  className={`h-touch rounded-xl border px-3 text-[13px] font-bold transition ${
                    active
                      ? 'border-neon-cyan/70 bg-neon-cyan/15 text-neon-cyan'
                      : 'border-edge-violet/40 text-ink-mute'
                  }`}
                >
                  {DIFFICULTY_LABEL[level]}
                </button>
              )
            })}
          </div>
        </Row>

        <Row label="미러링" description="거울처럼 좌우 반전">
          <Switch
            on={settings.mirror}
            onChange={(mirror) => updateSettings({ mirror })}
            label="미러링"
          />
        </Row>

        <Row label="얼굴 메쉬" description="플레이 중 랜드마크 표시">
          <Switch
            on={settings.showMesh}
            onChange={(showMesh) => updateSettings({ showMesh })}
            label="얼굴 메쉬"
          />
        </Row>

        <Row label="사운드" description="효과음 · 카운트다운">
          <Switch on={settings.sound} onChange={(sound) => updateSettings({ sound })} label="사운드" />
        </Row>

        <a
          href="#/debug"
          className="flex min-h-cta items-center justify-between gap-3 py-2 no-underline"
        >
          <span>
            <span className="block text-[15px] font-bold text-neon-cyan">디버그 대시보드</span>
            <span className="block text-xs text-ink-mute">랜드마크 · 블렌드셰이프 · FPS</span>
          </span>
          <ChevronRight className="h-5 w-5 flex-none text-neon-cyan" />
        </a>
      </div>

      <div className="flex items-center justify-between pb-2 pt-6">
        <h2 className="text-[13px] font-bold text-ink-dim">인식 민감도</h2>
        <button
          type="button"
          onClick={resetSettings}
          className="flex h-touch items-center gap-1.5 rounded-lg border border-edge-violet/40 px-3 text-xs text-ink-mute"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          기본값
        </button>
      </div>

      <p className="pb-3 text-[11px] leading-relaxed text-ink-mute">
        막대는 지금 카메라에 비친 내 표정 값이고, 흰 선이 인식 기준입니다. 표정을 지어 보면서 막대가
        선을 넘도록 맞춰 보세요.
      </p>

      <div className="flex flex-col gap-2.5">
        {SLIDERS.map((slider) => {
          const range = THRESHOLD_RANGE[slider.key]
          const threshold = settings.thresholds[slider.key]
          const value = live.face ? slider.live(live) : 0
          const active = live.face && value >= threshold
          return (
            <div
              key={slider.key}
              className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-edge-violet/50 bg-fa-card/85 px-4 py-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-white">{slider.label}</div>
                  <div className="text-xs text-ink-mute">{slider.hint}</div>
                </div>
                <span className="flex flex-none items-center gap-2">
                  <span className="font-mono text-xs text-ink-mute">{slider.format(value)}</span>
                  <span
                    className="font-display text-base font-extrabold tabular-nums"
                    style={{ color: active ? slider.color : '#8a90c8' }}
                  >
                    {slider.format(threshold)}
                  </span>
                </span>
              </div>
              <ThresholdMeter value={value} threshold={threshold} max={slider.max} color={slider.color} />
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={threshold}
                onChange={(event) => updateThreshold(slider.key, Number(event.target.value))}
                className="h-6 w-full"
                style={{ accentColor: slider.color }}
                aria-label={`${slider.label} 기준값`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
