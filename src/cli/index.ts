#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validateInputFolder } from './validator.js';
import { parseTxt, resolveMyName, markMyMessages } from './parser.js';
import { matchMediaToMessages, buildAssetManifest } from './media-matcher.js';
import { buildViewer } from './builder.js';
import type { ChatData } from './types.js';

// Parse folder name to extract chat name
// Pattern: Kakaotalk_Chat_{NAME}_{DATE}_{TIME}
const FOLDER_NAME_RE = /^Kakaotalk_Chat_(.+?)_\d{8}_\d{6}$/i;

function extractChatName(folderPath: string): string {
  const folderName = path.basename(folderPath);
  const match = folderName.match(FOLDER_NAME_RE);
  if (match) return match[1];
  // Fallback: use folder name as-is
  return folderName;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
카카오톡 대화 내보내기 → 뷰어 빌드

사용법:
  kakao-history-packager <내보내기 폴더 경로>

옵션:
  --output, -o <경로>   출력 디렉토리 (기본: 현재 디렉토리)
  --web-only            .app 빌드 없이 웹 폴더만 출력
  --help, -h            도움말
`);
    process.exit(0);
  }

  const inputFolder = path.resolve(args[0]);
  const outputIdx = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
  const outputDir = outputIdx !== -1 && args[outputIdx + 1]
    ? path.resolve(args[outputIdx + 1])
    : process.cwd();

  // 1. Validate input
  console.log('🔍 입력 폴더 검증 중...');
  const validation = validateInputFolder(inputFolder);

  if (!validation.valid || !validation.txtFile) {
    console.error(`❌ ${validation.error}`);
    process.exit(1);
  }
  console.log(`  ✓ ${validation.txtFile} 발견, 에셋 ${validation.assetFiles.length}개`);

  // 2. Parse
  console.log('📄 대화 파싱 중...');
  const txtContent = fs.readFileSync(path.join(inputFolder, validation.txtFile), 'utf-8');
  const parseResult = parseTxt(txtContent);

  // Check 1:1
  if (parseResult.metadata.participants.length !== 2) {
    console.error(`❌ 1:1 대화만 지원합니다. 참여자 수: ${parseResult.metadata.participants.length}`);
    process.exit(1);
  }

  const chatName = extractChatName(inputFolder);
  const myName = resolveMyName(parseResult.metadata.participants, chatName);
  markMyMessages(parseResult.items, myName);

  console.log(`  ✓ 참여자: ${parseResult.metadata.participants.join(', ')}`);
  console.log(`  ✓ 나: ${myName}`);

  // 3. Match media
  matchMediaToMessages(parseResult.items, validation.assetFiles);
  const messages = parseResult.items.filter(i => i.type === 'message');
  const photos = messages.filter(i => i.type === 'message' && i.contentType === 'photo');
  const matched = photos.filter(i => i.type === 'message' && i.mediaFilename !== null);
  console.log(`  ✓ 메시지 ${messages.length}개, 사진 ${photos.length}개 (매칭 ${matched.length}개)`);

  // 4. Build
  const chatData: ChatData = {
    metadata: {
      chatName,
      exportDate: parseResult.metadata.exportDate,
      participants: parseResult.metadata.participants,
      myName,
      totalMessages: messages.length,
    },
    items: parseResult.items,
    assetManifest: buildAssetManifest(validation.assetFiles),
  };

  const result = await buildViewer({
    chatData,
    inputFolder,
    assetFiles: validation.assetFiles,
    outputDir,
  });

  console.log(`\n✅ 완료: ${result}`);
}

main().catch((e) => {
  console.error('❌ 오류 발생:', e.message);
  process.exit(1);
});
