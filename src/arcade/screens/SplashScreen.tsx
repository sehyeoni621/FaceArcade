import type { FaceLandmarkerStatus } from '../../hooks/useFaceLandmarker'
import { useT, type StringKey } from '../../i18n'

const STEP_LABEL: Record<FaceLandmarkerStatus, StringKey> = {
  idle: 'splash.idle',
  'loading-model': 'splash.loadingModel',
  'starting-camera': 'splash.startingCamera',
  ready: 'splash.ready',
  error: 'splash.error',
}

/** Rough share of the boot each stage represents, for the progress bar. */
const STEP_PROGRESS: Record<FaceLandmarkerStatus, number> = {
  idle: 4,
  'loading-model': 55,
  'starting-camera': 88,
  ready: 100,
  error: 100,
}

/** First screen: model download + camera start, with a progress bar. */
export function SplashScreen({ status }: { status: FaceLandmarkerStatus }) {
  const { t } = useT()
  const percent = STEP_PROGRESS[status]

  return (
    <div className="page-gutter mx-auto flex h-full w-full max-w-sm flex-col items-center justify-between pt-24 text-center">
      <div className="mt-16 flex animate-fa-float flex-col items-center gap-4">
        <svg
          width="130"
          height="94"
          viewBox="0 0 56 40"
          fill="none"
          aria-hidden
          style={{ filter: 'drop-shadow(0 0 18px rgba(63,240,255,.8))' }}
        >
          <rect x="3" y="8" width="50" height="26" rx="12" stroke="#3ff0ff" strokeWidth="3" />
          <path d="M14 16v10M9 21h10" stroke="#3ff0ff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="38" cy="18" r="2.4" fill="#ff3fd6" />
          <circle cx="44" cy="22" r="2.4" fill="#ff3fd6" />
          <circle cx="38" cy="26" r="2.4" fill="#b06cff" />
          <circle cx="32" cy="22" r="2.4" fill="#b06cff" />
        </svg>
        <h1 className="wordmark font-display text-[40px] font-extrabold leading-none">FaceArcade</h1>
        <p className="text-[15px] text-ink-dim">Your Face, Play the Game!</p>
      </div>

      <div className="flex w-full flex-col gap-3.5 pb-2">
        <div
          className="h-2 overflow-hidden rounded-full border border-edge-violet/40 bg-[#3c3c82]/50"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('splash.progress')}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg,#3ff0ff,#7b5cff,#ff3fd6)',
              boxShadow: '0 0 12px rgba(63,240,255,.7)',
            }}
          />
        </div>

        <div className="flex justify-between text-[13px] text-ink-dim">
          <span>{t(STEP_LABEL[status])}</span>
          <span className="font-display tabular-nums text-neon-cyan">{percent}%</span>
        </div>

        <p className="text-xs leading-relaxed text-ink-faint">
          {status === 'starting-camera' ? (
            t('splash.allowCamera')
          ) : (
            <>
              {t('splash.firstRun')}
              <br />
              {t('splash.wifi')}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
