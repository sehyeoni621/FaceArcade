export type CameraErrorKind = 'pipeline' | 'disconnected'

function isIOS() {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

/** Per-platform recovery steps, numbered as in the artboard. */
function recoverySteps(): string[] {
  if (isIOS()) {
    return [
      'iOS 설정 앱 → Safari(또는 Chrome)',
      '카메라 항목을 “허용”으로 변경',
      '앱으로 돌아와 아래 “다시 시도”를 누르세요',
    ]
  }
  if (isAndroid()) {
    return [
      '주소창 왼쪽 자물쇠 아이콘 → 권한',
      '카메라를 “허용”으로 변경',
      '이 화면으로 돌아와 “다시 시도”를 누르세요',
    ]
  }
  return [
    '주소창 왼쪽 자물쇠(또는 카메라) 아이콘 클릭',
    '카메라를 “허용”으로 변경',
    '“다시 시도”를 누르세요',
  ]
}

/**
 * Shown whenever the pipeline errors out or the camera track ends.
 *
 * Permission is the common case and the recovery path differs per platform, so
 * it gets numbered steps rather than a paragraph.
 */
export function CameraErrorScreen({
  kind,
  message,
  onRetry,
}: {
  kind: CameraErrorKind
  message: string | null
  onRetry: () => void
}) {
  const permissionDenied = message?.includes('권한') ?? false
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
        {disconnected ? (
          <>
            카메라 연결이
            <br />
            끊어졌습니다
          </>
        ) : permissionDenied ? (
          <>
            카메라 권한이
            <br />
            거부되었습니다
          </>
        ) : (
          <>카메라를 시작할 수 없습니다</>
        )}
      </h1>

      <p className="text-sm leading-relaxed text-ink-soft">
        {disconnected
          ? '다른 앱이 카메라를 가져갔거나 장치가 분리되었습니다. 연결을 확인한 뒤 다시 시도해 주세요.'
          : permissionDenied
            ? '설정에서 권한을 다시 허용해야 게임을 시작할 수 있어요.'
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
              {step}
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
        다시 시도
      </button>
    </div>
  )
}
