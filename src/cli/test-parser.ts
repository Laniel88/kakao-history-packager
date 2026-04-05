import fs from 'node:fs';
import path from 'node:path';
import { validateInputFolder } from './validator.js';
import { parseTxt, resolveMyName, markMyMessages } from './parser.js';
import { matchMediaToMessages, buildAssetManifest } from './media-matcher.js';
import type { ChatData } from './types.js';

const sampleDir = path.resolve('sample');

console.log('=== Validation ===');
const validation = validateInputFolder(sampleDir);
console.log(validation);

if (!validation.valid || !validation.txtFile) {
  console.error('Validation failed:', validation.error);
  process.exit(1);
}

console.log('\n=== Parsing ===');
const txtContent = fs.readFileSync(path.join(sampleDir, validation.txtFile), 'utf-8');
const parseResult = parseTxt(txtContent);
console.log('Export date:', parseResult.metadata.exportDate);
console.log('Participants:', parseResult.metadata.participants);
console.log('Total items:', parseResult.items.length);

// Check 1:1
if (parseResult.metadata.participants.length !== 2) {
  console.error('1:1 대화가 아닙니다. 참여자 수:', parseResult.metadata.participants.length);
  process.exit(1);
}

// Resolve "me"
const chatName = '김철수'; // Would be extracted from folder name in real CLI
const myName = resolveMyName(parseResult.metadata.participants, chatName);
console.log('My name:', myName);
markMyMessages(parseResult.items, myName);

// Match media
console.log('\n=== Media Matching ===');
matchMediaToMessages(parseResult.items, validation.assetFiles);

// Print all items
console.log('\n=== Items ===');
for (const item of parseResult.items) {
  if (item.type === 'date-separator') {
    console.log(`  --- ${item.date} ---`);
  } else {
    const side = item.isMyMessage ? '→' : '←';
    const media = item.mediaFilename ? ` [${item.mediaFilename}]` : '';
    const content = item.contentType === 'text' ? item.text.substring(0, 50) : `[${item.contentType}]`;
    console.log(`  ${side} ${item.sender} (${new Date(item.timestamp).toLocaleString('ko-KR')}): ${content}${media}`);
  }
}

// Build manifest
const manifest = buildAssetManifest(validation.assetFiles);
console.log('\n=== Asset Manifest ===');
console.log(manifest);

console.log('\n=== Summary ===');
const messages = parseResult.items.filter(i => i.type === 'message');
const photos = messages.filter(i => i.type === 'message' && i.contentType === 'photo');
const matched = photos.filter(i => i.type === 'message' && i.mediaFilename !== null);
console.log(`Messages: ${messages.length}, Photos: ${photos.length}, Matched: ${matched.length}`);
