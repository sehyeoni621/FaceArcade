/**
 * Wording for the share landing page (`api/share.js`), in both languages.
 *
 * It lives outside `api/` on purpose: every file under `api/` becomes a Vercel
 * function, and this is a plain module, not a route.
 */
export const SHARE_COPY = {
  ko: {
    htmlLang: 'ko',
    ogLocale: 'ko_KR',
    numberLocale: 'ko-KR',

    siteTagline: '얼굴로 조종하는 웹캠 아케이드',
    defaultTitle: 'FaceArcade · 얼굴로 조종하는 웹캠 아케이드',
    defaultDescription:
      '설치 없이 카메라만 켜면 시작. 머리를 기울이고, 입을 벌리고, 윙크해서 즐기는 미니게임 4종.',

    /** Description for a shared record. Pieces are already escaped upstream. */
    recordDescription: ({ initials, title, score, rank, tagline }) =>
      `${initials ? `${initials}님이 ` : ''}${title}에서 ${score}${
        rank ? ` (랭킹 ${rank}위)` : ''
      }. ${tagline} 카메라만 켜면 바로 도전할 수 있어요.`,

    ctaRecord: (title) => `${title} 도전하기`,
    ctaDefault: '지금 플레이하기',
    note: '설치 없이 브라우저에서 바로 실행돼요. 카메라 영상은 기기 안에서만 처리되고 어디에도 전송되지 않습니다.',

    eyebrowRecord: '공유된 기록',
    rankBadge: (rank) => `랭킹 ${rank}위`,
    dateLine: (date) => `${date} 기록`,

    howHeading: (title) => `${title}, 이런 게임이에요`,
    controlLabel: '조작',
    roundLabel: '한 판',
    roundValue: (sec) => `${sec}초`,
    needLabel: '준비물',
    needValue: '웹캠 또는 휴대폰 앞 카메라',

    eyebrowInvite: '웹캠 아케이드',
    inviteTagline: '웹캠과 얼굴만으로 즐기는 미니게임 아케이드',
    gamesUnit: '게임',
    inviteHint: '머리를 기울이고, 입을 벌리고, 윙크해서 플레이합니다',

    stripHeading: '아케이드의 게임들',
  },

  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    numberLocale: 'en-US',

    siteTagline: 'The webcam arcade you play with your face',
    defaultTitle: 'FaceArcade · the webcam arcade you play with your face',
    defaultDescription:
      'Nothing to install - just turn the camera on. Four minigames played by tilting your head, opening your mouth and winking.',

    recordDescription: ({ initials, title, score, rank, tagline }) =>
      `${initials ? `${initials} scored ` : 'Someone scored '}${score} on ${title}${
        rank ? ` (rank #${rank})` : ''
      }. ${tagline.replace(/[.!?]$/, '')}. Turn your camera on and take it on.`,

    ctaRecord: (title) => `Take on ${title}`,
    ctaDefault: 'Play now',
    note: 'It runs straight in the browser with nothing to install. The camera feed is processed on your device and never leaves it.',

    eyebrowRecord: 'A shared record',
    rankBadge: (rank) => `Rank #${rank}`,
    dateLine: (date) => `Set ${date}`,

    howHeading: (title) => `How ${title} plays`,
    controlLabel: 'Controls',
    roundLabel: 'One round',
    roundValue: (sec) => `${sec}s`,
    needLabel: 'You need',
    needValue: 'A webcam, or the front camera on your phone',

    eyebrowInvite: 'Webcam arcade',
    inviteTagline: 'A minigame arcade you play with a webcam and your face',
    gamesUnit: 'games',
    inviteHint: 'Tilt your head, open your mouth and wink to play',

    stripHeading: 'Games in the arcade',
  },
}
