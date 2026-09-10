/**
 * Korean strings - the source of truth for the key set.
 *
 * `strings.en.ts` is typed as `Record<StringKey, string>`, so adding a key here
 * without an English counterpart is a compile error and the two cannot drift.
 *
 * Placeholders are `{name}` and are filled in by `translate()`.
 */
export const KO = {
  // Shared.
  'common.close': '닫기',
  'common.cancel': '취소',
  'common.retry': '다시 시도',

  // Bottom tab bar.
  'tab.nav': '주요 메뉴',
  'tab.games': '게임',
  'tab.records': '기록',
  'tab.settings': '설정',

  // Splash / start-up.
  'splash.idle': '준비 중…',
  'splash.loadingModel': '모델 다운로드 중…',
  'splash.startingCamera': '카메라 준비 중…',
  'splash.ready': '준비 완료',
  'splash.error': '오류',
  'splash.progress': '초기화 진행률',
  'splash.allowCamera': '브라우저가 카메라 권한을 물어보면 허용해 주세요.',
  'splash.firstRun': '첫 실행 시 모델(3.7MB)을 내려받아 저장합니다.',
  'splash.wifi': 'Wi-Fi 환경을 권장합니다.',

  // Lobby.
  'lobby.cameraOn': '카메라 ON · {fps}',
  'lobby.searching': '얼굴 찾는 중',
  'lobby.totalPlays': '총 플레이',
  'lobby.topScore': '최고 점수',
  'lobby.gamesPlayed': '플레이한 게임',
  'lobby.viewDetails': '{title} 자세히 보기',
  'lobby.quickStart': '{title} 바로 시작',
  'lobby.detail': '{title} 상세',
  'lobby.best': '최고 점수',

  // Ready screen.
  'ready.aligned': '정렬 완료',
  'ready.centerFace': '얼굴을 가운데로',
  'ready.showFace': '얼굴을 보여주세요',
  'ready.toLobby': '로비로',
  'ready.holding': '입을 벌린 채 유지…',
  'ready.hint': '입을 1초간 벌려도 시작됩니다 · Space',

  // Play screen.
  'play.pause': '일시정지',
  'play.faceDetected': '얼굴 감지',
  'play.noFace': '얼굴 없음',
  'play.lostFace': '얼굴을 놓쳤어요',
  'play.lostFaceHint': '카메라 정면으로 돌아오면 자동으로 이어집니다. 시간은 멈춰 있어요.',
  'play.resume': '계속하기',
  'play.restart': '다시 시작',
  'play.exit': '로비로 나가기',
  'play.soundOn': '사운드 ON',
  'play.soundOff': '사운드 OFF',

  // Result screen.
  'result.previousBest': '이전 최고 {score}{unit}',
  'result.firstRecord': '첫 기록이에요',
  'result.bestRecord': '최고 기록 {score}{unit}',
  'result.rankEntered': '랭킹 {rank}위 진입',
  'result.initialsHint': '이름(최대 3글자)을 남겨 두세요',
  'result.initials': '이니셜',
  'result.again': '다시하기',
  'result.otherGame': '다른 게임',
  'result.viewRecords': '기록 보기',
  'result.share': '기록 공유',

  // Records screen.
  'records.title': '내 기록',
  'records.localOnly': '이 기기에 로컬 저장됨',
  'records.plays': '플레이',
  'records.entries': '등록된 기록',
  'records.playsLabel': '{n}회 플레이',
  'records.confirmDelete': '정말 삭제',
  'records.shareBest': '최고 기록 공유',
  'records.clear': '초기화',
  'records.empty': '아직 기록이 없어요. 첫 기록을 남겨보세요!',
  'records.playGame': '{title} 플레이',
  'records.allTimeBest': '전체 최고 기록',

  // Settings screen.
  'settings.title': '설정',
  'settings.language': '언어',
  'settings.languageHint': '앱 표시 언어',
  'settings.camera': '카메라',
  'settings.cameraAvailable': '{n}개 사용 가능',
  'settings.cameraFront': '전면 카메라',
  'settings.cameraDevice': '카메라 장치',
  'settings.cameraDefault': '기본 (전면)',
  'settings.difficulty': '난이도',
  'settings.difficultyHint': '다음 게임부터 적용',
  'settings.mirror': '미러링',
  'settings.mirrorHint': '거울처럼 좌우 반전',
  'settings.mesh': '얼굴 메쉬',
  'settings.meshHint': '플레이 중 랜드마크 표시',
  'settings.sound': '사운드',
  'settings.soundHint': '효과음 · 카운트다운',
  'settings.debug': '디버그 대시보드',
  'settings.debugHint': '랜드마크 · 블렌드셰이프 · FPS',
  'settings.sensitivity': '인식 민감도',
  'settings.defaults': '기본값',
  'settings.sensitivityHelp':
    '막대는 지금 카메라에 비친 내 표정 값이고, 흰 선이 인식 기준입니다. 표정을 지어 보면서 막대가 선을 넘도록 맞춰 보세요.',
  'settings.thresholdAria': '{label} 기준값',

  // Sensitivity sliders.
  'slider.smile': '웃음 민감도',
  'slider.smileHint': 'mouthSmile 임계값',
  'slider.mouthOpen': '입 벌림 민감도',
  'slider.mouthOpenHint': 'jawOpen 임계값',
  'slider.blink': '깜빡임 민감도',
  'slider.blinkHint': 'eyeBlink 임계값',
  'slider.tilt': '기울기 민감도',
  'slider.tiltHint': '이 각도를 넘어야 좌/우로 인식',

  // Difficulty.
  'difficulty.easy': '쉬움',
  'difficulty.normal': '보통',
  'difficulty.hard': '어려움',

  // Face controls.
  'control.tilt': '머리 기울이기',
  'control.move': '얼굴 움직이기',
  'control.mouth': '입 벌리기',
  'control.smile': '웃기',
  'control.wink': '윙크',
  'control.blink': '눈 깜빡이기',
  'control.brow': '눈썹 올리기',

  // Camera failures, keyed by cause rather than by message text.
  'camera.permissionDenied':
    '카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘에서 권한을 허용해 주세요.',
  'camera.notFound': '사용 가능한 웹캠을 찾을 수 없습니다. 카메라 연결 상태를 확인해 주세요.',
  'camera.overconstrained': '선택한 카메라를 사용할 수 없습니다. 설정에서 다른 카메라를 선택해 주세요.',
  'camera.inUse': '다른 프로그램이 카메라를 사용 중입니다. 해당 프로그램을 종료한 뒤 다시 시도해 주세요.',
  'camera.startFailed': '카메라를 시작하지 못했습니다: {name}',
  'camera.noVideoElement': '비디오 엘리먼트를 찾을 수 없습니다.',
  'camera.numbered': '카메라 {n}',

  // Camera error screen. Titles carry a deliberate line break.
  'cameraError.disconnectedTitle': '카메라 연결이\n끊어졌습니다',
  'cameraError.permissionTitle': '카메라 권한이\n거부되었습니다',
  'cameraError.genericTitle': '카메라를 시작할 수 없습니다',
  'cameraError.disconnectedBody':
    '다른 앱이 카메라를 가져갔거나 장치가 분리되었습니다. 연결을 확인한 뒤 다시 시도해 주세요.',
  'cameraError.permissionBody': '설정에서 권한을 다시 허용해야 게임을 시작할 수 있어요.',
  'cameraError.iosStep1': 'iOS 설정 앱 → Safari(또는 Chrome)',
  'cameraError.iosStep2': '카메라 항목을 “허용”으로 변경',
  'cameraError.iosStep3': '앱으로 돌아와 아래 “다시 시도”를 누르세요',
  'cameraError.androidStep1': '주소창 왼쪽 자물쇠 아이콘 → 권한',
  'cameraError.androidStep2': '카메라를 “허용”으로 변경',
  'cameraError.androidStep3': '이 화면으로 돌아와 “다시 시도”를 누르세요',
  'cameraError.desktopStep1': '주소창 왼쪽 자물쇠(또는 카메라) 아이콘 클릭',
  'cameraError.desktopStep2': '카메라를 “허용”으로 변경',
  'cameraError.desktopStep3': '“다시 시도”를 누르세요',

  // Performance warning.
  'perf.warning': '성능 저하 · {fps} FPS{cpu} — 다른 탭을 닫거나 창을 줄여 보세요',
  'perf.cpuSuffix': ' · GPU 가속 불가, CPU 모드',

  // HUD.
  'hud.lives': '목숨 {lives} / {max}',

  // Share sheet.
  'share.title': '기록 공유',
  'share.copied': '링크를 복사했어요',
  'share.downloaded': '이미지를 저장했어요',
  'share.unsupported': '이 브라우저에서는 지원되지 않아요',
  'share.failed': '공유하지 못했어요. 다시 시도해 주세요',
  'share.cardAlt': '{title} {score}{unit} 기록 카드',
  'share.imageFailed': '이미지를 만들지 못했어요. 링크로 공유해 주세요.',
  'share.withImage': '이미지와 링크가 함께 전달돼요',
  'share.saveOrLink': '카드를 저장하거나 링크로 공유할 수 있어요',
  'share.shareImage': '이미지로 공유',
  'share.shareLink': '링크 공유',
  'share.copyLink': '링크 복사',
  'share.saveImage': '이미지 저장',

  // Share card, drawn onto a canvas.
  'card.tagline': '얼굴로 조종하는 웹캠 아케이드',
  'card.rank': '랭킹 {rank}위',
  'card.oneRound': '{sec}초 한 판',
  'card.controls': '조작',
  'card.date': '{date} 기록',
  'card.cta': '당신도 얼굴로 이겨보세요',

  // Share link text.
  'link.newRecord': '🏆 {title} 신기록 {score}!',
  'link.record': '{emoji} {title} {score} 기록!',
  'link.tagline': '얼굴로 조종하는 웹캠 아케이드, 당신도 이겨보세요.',

  // Landscape notice. Lives in index.html so it can show before React mounts.
  'landscape.rotate': '세로 모드로 돌려주세요',
  'landscape.hint': 'FaceArcade의 게임은 세로 화면에 맞춰 설계되었습니다.',

  // Counters. Korean needs a measure word; English usually does not.
  'unit.times': '{n}회',
  'unit.count': '{n}개',
  'unit.seconds': '{n}초',

  // Result stats.
  'stat.distance': '주행 거리',
  'stat.coins': '획득 코인',
  'stat.bestCoinStreak': '최다 연속 코인',
  'stat.crashes': '충돌',
  'stat.eaten': '먹은 음식',
  'stat.missedFood': '놓친 음식',
  'stat.bestCombo': '최대 콤보',
  'stat.bombs': '폭탄 섭취',
  'stat.cleared': '성공한 표정',
  'stat.failed': '실패',
  'stat.fastest': '가장 빠른 반응',
  'stat.hits': '명중',
  'stat.accuracy': '명중률',
  'stat.bestReaction': '최고 반응 속도',

  // Mimic prompt cards.
  'prompt.smile': '활짝 웃기',
  'prompt.mouth': '입 크게 벌리기',
  'prompt.blink': '두 눈 감기',
  'prompt.winkLeft': '왼쪽 눈 윙크',
  'prompt.winkRight': '오른쪽 눈 윙크',
  'prompt.tiltLeft': '머리 왼쪽으로 기울이기',
  'prompt.tiltRight': '머리 오른쪽으로 기울이기',
  'prompt.brow': '눈썹 올리기',

  // Wink Shooter intro hint.
  'wink.hint': '왼쪽 눈 → 왼쪽 표적 · 오른쪽 눈 → 오른쪽 표적',

  // Debug dashboard (#/debug).
  'debug.liveWebcam': '실시간 웹캠',
  'debug.awaitingResolution': '해상도 대기',
  'debug.landmarks': '랜드마크',
  'debug.blendshapes': '블렌드셰이프',
  'debug.landmarks3d': '3D 랜드마크 (예시)',
  'debug.noFace': '얼굴이 감지되지 않았습니다 — 카메라 정면을 봐 주세요',
  'debug.liveStatus': '실시간 감지 상태',
  'debug.smile': '웃음 감지',
  'debug.mouthOpen': '입 벌림',
  'debug.blink': '눈 깜빡임',
  'debug.headTilt': '머리 기울기',
  'debug.cameraConnected': '카메라 연결됨',
  'debug.cameraDropped': '카메라 끊김',
  'debug.meshHide': '랜드마크 오버레이 끄기',
  'debug.meshShow': '랜드마크 오버레이 켜기',
  'debug.meshToggle': '랜드마크 오버레이 토글',
  'debug.cameraStopped': '카메라 정지됨',
  'debug.loadingModel': '모델 로딩 중',
  'debug.startingCamera': '카메라 연결 중',
  'debug.pipelineError': '파이프라인 오류',
  'debug.pressStart': 'START를 누르면 카메라가 다시 켜집니다.',
  'debug.feature1a': '표정으로',
  'debug.feature1b': '미니게임 플레이',
  'debug.feature2a': '실시간',
  'debug.feature2b': '얼굴 인식 기술',
  'debug.feature3a': '다양한',
  'debug.feature3b': '미니게임 모음',
  'debug.tagline': '당신의 표정과 움직임이 게임이 되는 순간!',
  'debug.tiltAngle': '머리 기울기 각도',
  'debug.currentFps': '현재 FPS',
  'debug.expression': '표정 감지',
  'debug.mainBlendshapes': '(주요 블렌드셰이프)',
} as const

export type StringKey = keyof typeof KO
