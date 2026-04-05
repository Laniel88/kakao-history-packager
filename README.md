# kakao-history-packager

> **This is an unofficial project and is not affiliated with, endorsed by, or associated with Kakao Corp.**

카카오톡 대화 내보내기를 PC 카카오톡과 동일한 경험의 **독립 실행 macOS 앱 (.app)**으로 빌드하는 패키저입니다.

## 특징

- PC 카카오톡과 동일한 채팅 UI
- 이미지/동영상 타임스탬프 기반 자동 매칭
- 검색 기능 (Cmd+F)
- 톡서랍 (사진/동영상, 파일, 링크 — 별도 윈도우)
- 미디어 뷰어 (별도 윈도우, 좌우 네비게이션)
- 프로필 설정 (이름, 사진 — `~/.kakao-chat-viewer/`에 저장)
- 원본 에셋 무손실 보존

## 요구사항

- **Node.js** >= 22
- **pnpm**
- **Rust** >= 1.85 (Tauri 빌드용)
- **macOS** (현재 macOS만 지원)

## 설치

```bash
git clone https://github.com/your-username/kakao-history-packager.git
cd kakao-history-packager
pnpm install
cd src/viewer && pnpm install && cd ../..
```

## 사용법

### 빌드

카카오톡에서 대화를 내보낸 폴더를 인자로 전달합니다:

```bash
npx tsx src/cli/index.ts ./path/to/Kakaotalk_Chat_상대방이름_YYYYMMDD_HHMMSS
```

빌드가 완료되면 현재 디렉토리에 `상대방이름 Kakao History.app` 파일이 생성됩니다.

### CLI 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `--output, -o <경로>` | 출력 디렉토리 | 현재 디렉토리 |
| `--name, -n <이름>` | 앱 이름 | `{상대방} Kakao History` |
| `--icon, -i <경로>` | 앱 아이콘 PNG (자동 crop-to-fill) | 기본 아이콘 |

```bash
# 커스텀 이름 + 아이콘
npx tsx src/cli/index.ts ./내보내기폴더 --name "우리의 대화" --icon ./custom-icon.png
```

### 개발 서버

```bash
# 샘플 데이터 생성 (sample/ 폴더에 테스트 데이터 필요)
npx tsx src/cli/generate-sample-data.ts

# Vite 개발 서버 실행
cd src/viewer && pnpm dev
```

## 카카오톡 대화 내보내기 형식

카카오톡에서 내보낸 폴더는 다음과 같은 구조입니다:

```
Kakaotalk_Chat_상대방이름_YYYYMMDD_HHMMSS/
├── Talk_YYYY.M.DD HH:mm-1.txt    # 대화 텍스트
├── YYYYMMDD_HHmmss_1.jpg          # 이미지 (타임스탬프 기반)
├── YYYYMMDD_HHmmss_1.mp4          # 동영상
└── ...
```

- **1:1 대화만 지원**합니다 (그룹 채팅 미지원).
- 이미지/동영상은 파일명의 타임스탬프로 대화 내 위치에 자동 매칭됩니다.

## 기술 스택

| 역할 | 기술 |
|---|---|
| CLI | Node.js + TypeScript |
| 뷰어 | Svelte 5 + Vite |
| 앱 빌드 | Tauri 2 |

## 라이선스

[MIT](LICENSE)
