import { Fragment } from 'react'
import type { CameraFailure } from '../../hooks/useFaceLandmarker'
import { useT, type StringKey } from '../../i18n'

export type CameraErrorKind = 'pipeline' | 'disconnected'

function isIOS() {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

/** Per-platform recovery steps, numbered as in the artboard. */
function recoverySteps(): StringKey[] {
  if (isIOS()) {
    return ['cameraError.iosStep1', 'cameraError.iosStep2', 'cameraError.iosStep3']
  }
  if (isAndroid()) {
    return ['cameraError.androidStep1', 'cameraError.androidStep2', 'cameraError.androidStep3']
  }
  return ['cameraError.desktopStep1', 'cameraError.desktopStep2', 'cameraError.desktopStep3']
}

/** Renders a heading that carries its own line break. */
function Lines({ text }: { text: string }) {
  const parts = text.split('\n')
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={part}>
          {index > 0 && <br />}
          {part}
        </Fragment>
      ))}
    </>
  )
}

/**
 * Shown whenever the pipeline errors out or the camera track ends.
 *
 * Permission is the common case and the recovery path differs per platform, so
 * it gets numbered steps rather than a paragraph.
 */
export function CameraErrorScreen({
  kind,
  failure,
  message,
  onRetry,
}: {
  kind: CameraErrorKind
  /** Why the camera failed. Branching on this, not on the message text, is
   *  what keeps the screen correct in every language. */
  failure: CameraFailure | null
  message: string | null
  onRetry: () => void
}) {
  const { t } = useT()
  const permissionDenied = failure?.code === 'permission'
  const disconnected = kind === 'disconnected'

  return (
    <div
      className="page-gutter mx-auto flex h-full w-full max-w-sm flex-col gap-5 overflow-y-auto pt-24"
      style={{
        background: disconnected
          ? undefined
          : 'radial-gradient(ellipse 80% 40% at 50% 0%,rgba(255,63,214,.18),transparent 70%)',
      }}
    >
      <div
        className="grid h-20 w-20 place-items-center rounded-full border-2 border-neon-pink bg-neon-pink/[.12]"
        style={{ boxShadow: '0 0 22px rgba(255,63,214,.4)' }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff3fd6"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M3 3l18 18" />
        </svg>
      </div>

      <h1 className="text-[26px] font-black leading-[1.3] text-white">
        <Lines
          text={
            disconnected
              ? t('cameraError.disconnectedTitle')
              : permissionDenied
                ? t('cameraError.permissionTitle')
                : t('cameraError.genericTitle')
          }
        />
      </h1>

      <p className="text-sm leading-relaxed text-ink-soft">
        {disconnected
          ? t('cameraError.disconnectedBody')
          : permissionDenied
            ? t('cameraError.permissionBody')
            : message}
      </p>

      {permissionDenied && (
        <ol className="flex flex-col gap-2.5">
          {recoverySteps().map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-3.5 rounded-2xl border border-neon-pink/30 bg-[#0e0a2c]/80 px-4 py-3.5 text-sm leading-snug"
            >
              <span
                className="grid h-7 w-7 flex-none place-items-center rounded-full font-display text-[13px] font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg,#ff3fd6,#7b5cff)' }}
              >
                {index + 1}
              </span>
              {t(step)}
            </li>
          ))}
        </ol>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onRetry}
        className="h-cta w-full rounded-2xl border-2 border-neon-cyan bg-neon-cyan/15 text-[17px] font-black text-ink-ice transition active:scale-[0.98]"
        style={{ boxShadow: '0 0 22px rgba(63,240,255,.4)' }}
      >
        {t('common.retry')}
      </button>
    </div>
  )
}
