# FaceArcade

노트북 웹캠과 얼굴 인식으로 조작하는 인터랙티브 미니게임 아케이드.
모든 추론은 브라우저 안에서만 실행되며, 영상은 어디에도 전송되지 않습니다.

## 스택

- React 19 + TypeScript + Vite
- Tailwind CSS 3 (네온 아케이드 다크 테마)
- `@mediapipe/tasks-vision` — Face Landmarker (478 랜드마크 / 52 블렌드셰이프)
- `lucide-react`, `canvas-confetti`

## 실행

```bash
npm install
npm run dev
```

브라우저가 카메라 권한을 물어보면 허용해 주세요. `localhost`는 보안 컨텍스트로 취급되므로
별도의 HTTPS 설정 없이 웹캠을 사용할 수 있습니다.

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (http://localhost:5173) |
| `npm run dev:mobile` | HTTPS + LAN 바인딩 개발 서버 (실기기 테스트용) |
| `npm run build` | 타입 체크 후 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | oxlint |
| `npm run sync:mediapipe` | wasm 런타임 재복사 + 모델 내려받기 (`postinstall`에서 자동 실행) |

## 모바일에서 확인하기

```bash
npm run dev:mobile
```

`getUserMedia`는 보안 컨텍스트에서만 동작합니다. `localhost`는 예외로 인정되지만
폰에서 `http://192.168.x.x:5173`으로 접속하면 보안 컨텍스트가 아니라서 카메라가 아예
열리지 않습니다. 그래서 이 스크립트가 자체 서명 인증서로 HTTPS를 켜고 LAN에 바인딩합니다.
터미널에 찍히는 `https://192.168.x.x:5173`을 폰에서 열고, 인증서 경고는 한 번 넘기면 됩니다.

모바일 대응으로 들어가 있는 것:

- `viewport-fit=cover` + `.safe-area` — 노치·홈 인디케이터 회피
- 카메라 해상도를 기기 등급에 맞춰 요청 (모바일 720px폭, 데스크톱 1280×720)
- 스테이지가 실제 스트림 비율을 따라감 — 세로 스트림도 레터박스 없이 표시
- Screen Wake Lock — 얼굴로 조작하는 동안 화면이 꺼지지 않음
- 복귀 시 `video.play()` 재호출 — iOS Safari가 백그라운드에서 비디오를 멈추는 문제
- `overscroll-behavior: none` — 플레이 중 당겨서 새로고침 방지

## 모델 자산

CDN에 의존하지 않도록 wasm 런타임과 모델을 `public/`에서 직접 서빙합니다.

- `public/mediapipe/wasm/` — `node_modules/@mediapipe/tasks-vision/wasm`에서 복사
- `public/models/face_landmarker.task` — Google 스토리지에서 1회 다운로드 (약 3.7 MB)

둘 다 `scripts/sync-mediapipe.mjs`가 관리하며, `npm install` 시 `postinstall`로 자동
동기화됩니다. 패키지 버전을 올린 뒤 wasm이 어긋나면 `npm run sync:mediapipe`를 실행하세요.

## 구조

```
src/
├─ main.tsx / Root.tsx            # 진입점. 기본은 아케이드, `#/debug`는 디버그 대시보드
├─ App.tsx                        # 디버그 대시보드 (카메라 스테이지 + 실시간 감지 패널)
├─ arcade/
│  ├─ Arcade.tsx                  # 아케이드 루트: 카메라 파이프라인 1개 소유, 화면 라우팅, 전역 오버레이
│  ├─ faceInput.ts                # 프레임 입력 버스 (추론 결과 → 게임/화면, React state 미경유)
│  ├─ ui.tsx · format.ts          # 버튼/패널 등 공통 프리미티브, 포맷 유틸
│  ├─ share/                      # 기록 공유: 카드 이미지 렌더러 · 공유 링크 · 바텀시트
│  └─ screens/                    # Splash · CameraError · Lobby · Ready · Play · Result · Records · Settings
├─ games/
│  ├─ types.ts                    # GameDefinition / GameEngine 인터페이스
│  ├─ registry.ts                 # 로비에 노출되는 게임 목록
│  ├─ draw.ts                     # 캔버스 드로잉 헬퍼 (네온 스트로크, 팝업 등)
│  ├─ tiltRunner.ts               # 🛸 틸트 러너 — 머리 기울기
│  ├─ mouthCatch.ts               # 🍔 냠냠 캐치 — 얼굴 이동 + 입 벌리기
│  ├─ mimic.ts                    # 🎭 표정 따라하기 — 모든 제스처
│  └─ winkShooter.ts              # 🎯 윙크 슈터 — 좌/우 윙크
├─ hooks/
│  ├─ useFaceLandmarker.ts        # 모델 로딩 · 웹캠 · rAF 추론 루프
│  ├─ useGameRunner.ts            # 게임 1판 실행: 엔진·게임 시계·카운트다운·얼굴 이탈 자동 일시정지·캔버스
│  ├─ useCameraDevices.ts         # 카메라 장치 목록
│  └─ useFitBox.ts                # 영상 비율에 맞춰 스테이지 크기 계산
├─ store/
│  ├─ storage.ts                  # localStorage 기반 스토어 + useSyncExternalStore
│  ├─ settings.ts                 # 거울/효과음/메쉬/카메라/난이도/민감도 설정
│  └─ scores.ts                   # 게임별 TOP 10 리더보드(이니셜) · 플레이 수 · 최근 점수
└─ utils/
   ├─ faceGestures.ts             # 블렌드셰이프/랜드마크 → 제스처 판정 (순수 함수)
   ├─ gestureInput.ts             # 게임용 입력 계층: 조절 가능한 임계값, 히스테리시스, 상승 엣지, 화면 좌표
   ├─ drawFaceMesh.ts             # 오버레이 캔버스에 랜드마크 스켈레톤 렌더링
   ├─ sfx.ts                      # WebAudio 합성 효과음 (에셋 없음)
   └─ rng.ts                      # 시드 가능한 PRNG (mulberry32)
```

## 화면 흐름

```
스플래시(모델·카메라) ─► 로비(게임 카드 · BEST) ─► 준비(조작법 · 얼굴 정렬 · 입 벌려 시작)
      │                                                     │
      └─ 카메라 오류 / 연결 끊김 ◄── 어디서든                 ▼
                                    플레이(HUD · 캔버스 · 일시정지 · 얼굴 이탈 자동 정지)
                                                            │
                          기록·랭킹 ◄──── 결과(점수 · 신기록 · 이니셜 입력) ──► 다시하기
                          설정(카메라 · 거울 · 효과음 · 난이도 · 민감도 캘리브레이션 · 디버그)
```

- 플레이 중 얼굴이 프레임을 벗어나면 게임 시계가 멈추고, 돌아오면 1초 카운트다운 후 자동 재개됩니다.
- `Esc`/`P` 일시정지, `Space` 시작·재개. 준비 화면에서는 입을 1초간 벌려도 시작됩니다.
- 기록과 설정은 `localStorage`(`facearcade:scores:v1`, `facearcade:settings:v1`)에 저장됩니다.
- FPS가 15 미만으로 떨어지면 상단에 성능 저하 배너가 뜹니다.

## 기록 공유 · 브랜드 자산

결과 화면과 기록 화면의 공유 버튼은 바텀시트를 열고, 그 자리에서 4:5 기록 카드(PNG)를 캔버스로 그립니다.
카카오톡·인스타그램에 실제로 보이는 건 이 이미지라서, 카드 자체에 마크·게임·점수·주소가 모두 들어갑니다.

- `src/arcade/share/shareCard.ts` — 1080×1350 카드 렌더러 (앱 아이콘·게임 악센트·배지·스탯)
- `src/arcade/share/shareLink.ts` — 공유 링크(`/s?g=…&v=…`) 생성, Web Share(이미지/링크)·저장·복사
- `api/share.js` — 공유 링크가 열리는 랜딩 페이지. 쿼리스트링만으로 렌더링되는 서버리스 함수이고,
  게임별 og: 태그를 내보내 메신저 미리보기에 게임 이름·점수가 뜨게 합니다. `vercel.json`이 `/s` → 이 함수로 리라이트.
  링크의 CTA는 `/?g=<gameId>`로 돌아와 해당 게임의 준비 화면에서 시작합니다.
- `shared/catalog.mjs` — 번들 밖(랜딩 페이지·이미지 생성)에서 쓰는 게임 메타데이터 사본.

아이콘과 og: 카드는 `scripts/brand/brand.mjs`에서 SVG로 그려집니다:

```bash
node scripts/render-brand.mjs   # public/icon*.svg|png, apple-touch-icon, public/og/*.png 갱신
```

Chrome을 직접 띄워 래스터화하므로 빌드에는 포함되지 않고, 결과물만 커밋합니다(`CHROME_PATH`로 경로 지정 가능).
이 스크립트는 `shared/catalog.mjs`와 `src/games/*.ts`의 제목·이모지·악센트가 어긋나면 렌더 대신 실패합니다.

## 게임 추가하기

`GameDefinition`(`src/games/types.ts`)을 구현해 `registry.ts`에 넣으면 로비·준비·결과 화면이 그대로 재사용됩니다.
엔진은 `update(input)` / `draw(ctx, w, h)` / `hud()` / `result()` 네 가지만 구현하면 되고, React를 알 필요가 없습니다.
`input.frame`에는 임계값이 적용된 제스처 상태와 0..1 화면 좌표(`headX`, `mouthX` …)가, `input.edges`에는 지난 틱 이후
새로 발생한 제스처(입 벌림, 윙크 등)가 들어옵니다.

### `useFaceLandmarker`

GPU 델리게이트로 먼저 시도하고, WebGL을 쓸 수 없는 환경이면 CPU로 자동 폴백합니다.
매 프레임 데이터는 `onFrame` 콜백과 `resultRef`로 전달되고, 대시보드용 `result` 상태는
기본 12 Hz로 스로틀링되어 React 리렌더가 추론 속도를 깎지 않습니다.

```tsx
const { videoRef, status, fps, result, resultRef, restart } = useFaceLandmarker({
  onFrame: (result, video) => {
    // 게임 루프 · 캔버스 드로잉 (스로틀링 없음)
  },
})
```

### `faceGestures`

| 함수 | 판정 기준 |
| --- | --- |
| `isSmiling` | `mouthSmileLeft` / `mouthSmileRight` 평균 ≥ 0.5 |
| `isMouthOpen` | `jawOpen` ≥ 0.4 |
| `isBlinking` | `eyeBlinkLeft`, `eyeBlinkRight` 양쪽 모두 ≥ 0.5 |
| `isWinking` | 한쪽 눈만 ≥ 0.5 |
| `getHeadTilt` | 양쪽 눈 바깥 꼬리(33 / 263) 각도, ±45°로 클램프 |

`getHeadTilt`는 눈 좌표를 쓸 수 없을 때 코(1) → 턱(152) 축으로 폴백합니다. 값이 양수면
사용자의 오른쪽 어깨 방향(미러 프리뷰 기준 화면 오른쪽)으로 기울인 상태입니다. 정규화
좌표를 쓰므로 영상 비율(`width / height`)을 함께 넘겨야 각도가 왜곡되지 않습니다.

한 프레임 전체를 한 번에 읽으려면 `readGestures(landmarks, categories, aspectRatio)`를
사용하세요.
