import fs from 'node:fs';
import path from 'node:path';
import { validateInputFolder } from './validator.js';
import { parseTxt, resolveMyName, markMyMessages } from './parser.js';
import { matchMediaToMessages, buildAssetManifest } from './media-matcher.js';
import type { ChatData } from './types.js';

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

const chatData: ChatData = {
  metadata: {
    chatName,
    exportDate: parseResult.metadata.exportDate,
    participants: parseResult.metadata.participants,
    myName,
    totalMessages: parseResult.items.filter(i => i.type === 'message').length,
  },
  items: parseResult.items,
  assetManifest: buildAssetManifest(validation.assetFiles),
};

// Write JSON for viewer development
const outPath = path.resolve('src/viewer/public/chat-data.json');
fs.writeFileSync(outPath, JSON.stringify(chatData, null, 2), 'utf-8');
console.log(`Written to ${outPath}`);

// Copy assets to viewer public
const assetsDir = path.resolve('src/viewer/public/assets');
fs.mkdirSync(assetsDir, { recursive: true });
for (const file of validation.assetFiles) {
  fs.copyFileSync(path.join(sampleDir, file), path.join(assetsDir, file));
}
console.log(`Copied ${validation.assetFiles.length} assets`);
