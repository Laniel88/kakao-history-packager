import type { ChatItem, AssetEntry } from './types.js';
import { categorizeAssetFile } from './validator.js';

// Filename pattern: YYYYMMDD_HHmmss_N.ext
const TIMESTAMP_FILENAME_RE = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_(\d+)\..+$/;

function parseFilenameTimestamp(filename: string): { minuteKey: string; fullKey: string; seq: number } | null {
  const match = filename.match(TIMESTAMP_FILENAME_RE);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, seq] = match;
  return {
    minuteKey: `${year}${month}${day}_${hour}${minute}`,
    fullKey: `${year}${month}${day}_${hour}${minute}${second}`,
    seq: parseInt(seq),
  };
}

function messageToMinuteKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear().toString();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hour = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
}

export function matchMediaToMessages(items: ChatItem[], assetFiles: string[]): void {
  // Build a lookup of asset files by minute-level key
  const imagesByMinute = new Map<string, string[]>();
  const videosByMinute = new Map<string, string[]>();

  for (const file of assetFiles) {
    const parsed = parseFilenameTimestamp(file);
    if (!parsed) continue;

    const category = categorizeAssetFile(file);
    if (category === 'image') {
      const list = imagesByMinute.get(parsed.minuteKey) || [];
      list.push(file);
      imagesByMinute.set(parsed.minuteKey, list);
    } else if (category === 'video') {
      const list = videosByMinute.get(parsed.minuteKey) || [];
      list.push(file);
      videosByMinute.set(parsed.minuteKey, list);
    }
  }

  // Sort files within each minute group by full filename (chronological)
  for (const [key, files] of imagesByMinute) {
    imagesByMinute.set(key, files.sort());
  }
  for (const [key, files] of videosByMinute) {
    videosByMinute.set(key, files.sort());
  }

  // Track consumption index per minute key
  const imageConsumed = new Map<string, number>();
  const videoConsumed = new Map<string, number>();

  for (const item of items) {
    if (item.type !== 'message') continue;
    if (item.contentType !== 'photo' && item.contentType !== 'video') continue;

    const minuteKey = messageToMinuteKey(item.timestamp);

    if (item.contentType === 'photo') {
      const available = imagesByMinute.get(minuteKey);
      if (available && available.length > 0) {
        const idx = imageConsumed.get(minuteKey) || 0;
        if (idx < available.length) {
          item.mediaFilename = available[idx];
          imageConsumed.set(minuteKey, idx + 1);
        }
      }
    } else if (item.contentType === 'video') {
      const available = videosByMinute.get(minuteKey);
      if (available && available.length > 0) {
        const idx = videoConsumed.get(minuteKey) || 0;
        if (idx < available.length) {
          item.mediaFilename = available[idx];
          videoConsumed.set(minuteKey, idx + 1);
        }
      }
    }
  }
}

export function buildAssetManifest(assetFiles: string[]): AssetEntry[] {
  return assetFiles.map(filename => {
    const parsed = parseFilenameTimestamp(filename);
    return {
      filename,
      type: categorizeAssetFile(filename),
      timestamp: parsed ? (() => {
        const match = filename.match(TIMESTAMP_FILENAME_RE)!;
        const [, y, mo, d, h, mi, s] = match;
        return new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(mi), parseInt(s)).getTime();
      })() : null,
    };
  });
}
