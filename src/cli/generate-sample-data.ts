import fs from 'node:fs';
import path from 'node:path';
import { validateInputFolder } from './validator.js';
import { parseTxt, resolveMyName, markMyMessages } from './parser.js';
import { matchMediaToMessages, buildAssetManifest } from './media-matcher.js';
import type { ChatData, ChatItem, ChunkMetadata, ItemTypeHint } from './types.js';

const sampleDir = path.resolve('sample');
const validation = validateInputFolder(sampleDir);
if (!validation.valid || !validation.txtFile) {
  console.error(validation.error);
  process.exit(1);
}

const txtContent = fs.readFileSync(path.join(sampleDir, validation.txtFile), 'utf-8');
const parseResult = parseTxt(txtContent);

const chatName = '김철수';
const myName = resolveMyName(parseResult.metadata.participants, chatName);
markMyMessages(parseResult.items, myName);
matchMediaToMessages(parseResult.items, validation.assetFiles);

const items = parseResult.items;
const assetManifest = buildAssetManifest(validation.assetFiles);

function getTypeHint(item: ChatItem): ItemTypeHint {
  if (item.type === 'date-separator') return 'd';
  switch (item.contentType) {
    case 'photo': return 'p';
    case 'video': return 'v';
    case 'emoticon': return 'e';
    default: return 't';
  }
}

// Generate legacy format for dev mode (single file fallback)
const chatData: ChatData = {
  metadata: {
    chatName,
    exportDate: parseResult.metadata.exportDate,
    participants: parseResult.metadata.participants,
    myName,
    totalMessages: items.filter(i => i.type === 'message').length,
  },
  items,
  assetManifest,
};

const dataDir = path.resolve('src/viewer/public/data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'chat-data.json'), JSON.stringify(chatData, null, 2), 'utf-8');
console.log(`Written to ${dataDir}/chat-data.json`);

// Copy assets
const assetsDir = path.resolve('src/viewer/public/assets');
fs.mkdirSync(assetsDir, { recursive: true });
for (const file of validation.assetFiles) {
  fs.copyFileSync(path.join(sampleDir, file), path.join(assetsDir, file));
}
console.log(`Copied ${validation.assetFiles.length} assets`);
