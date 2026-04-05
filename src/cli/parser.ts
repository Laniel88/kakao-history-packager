import type { ChatItem, Message, DateSeparator, ChatMetadata, MessageContentType } from './types.js';

// 2025년 1월 1일 수요일
const DATE_LINE_RE = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (.+요일)$/;

// 2025. 1. 1. 오전 12:23, 홍길동 : 할아버지 새해 복 많이 받으세요
const MESSAGE_LINE_RE = /^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (오전|오후) (\d{1,2}):(\d{2}), (.+?) : ([\s\S]*)$/;

// 저장한 날짜 : 2026. 4. 5. 오후 12:37
const EXPORT_DATE_RE = /^저장한 날짜 : (.+)$/;

function parseKoreanTime(year: number, month: number, day: number, ampm: string, hour: number, minute: number): number {
  let h = hour;
  if (ampm === '오전') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return new Date(year, month - 1, day, h, minute).getTime();
}

function determineContentType(content: string): MessageContentType {
  const trimmed = content.trim();
  if (trimmed === '사진') return 'photo';
  if (trimmed === '동영상') return 'video';
  if (trimmed === '이모티콘') return 'emoticon';
  return 'text';
}

export interface ParseResult {
  items: ChatItem[];
  metadata: {
    exportDate: string;
    participants: string[];
  };
}

export function parseTxt(txtContent: string): ParseResult {
  const lines = txtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const items: ChatItem[] = [];
  const participants = new Set<string>();
  let currentId = 0;
  let lastMessage: Message | null = null;
  let exportDate = '';

  // Parse header
  // Line 0: filename (e.g. "Talk_2026.2.18 18:28-1.txt")
  // Line 1: "저장한 날짜 : 2026. 4. 5. 오후 12:37"
  // Lines 2+: empty lines before content
  let startLine = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const exportMatch = lines[i].match(EXPORT_DATE_RE);
    if (exportMatch) {
      exportDate = exportMatch[1].trim();
      startLine = i + 1;
      break;
    }
  }

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];

    // Date separator line
    const dateMatch = line.match(DATE_LINE_RE);
    if (dateMatch) {
      const [, yearStr, monthStr, dayStr, dayOfWeek] = dateMatch;
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);
      const timestamp = new Date(year, month - 1, day).getTime();

      const separator: DateSeparator = {
        type: 'date-separator',
        id: currentId++,
        date: line.trim(),
        timestamp,
      };
      items.push(separator);
      lastMessage = null;
      continue;
    }

    // Message line
    const msgMatch = line.match(MESSAGE_LINE_RE);
    if (msgMatch) {
      const [, yearStr, monthStr, dayStr, ampm, hourStr, minuteStr, sender, content] = msgMatch;
      const timestamp = parseKoreanTime(
        parseInt(yearStr), parseInt(monthStr), parseInt(dayStr),
        ampm, parseInt(hourStr), parseInt(minuteStr)
      );
      const contentType = determineContentType(content);

      participants.add(sender);

      const message: Message = {
        type: 'message',
        id: currentId++,
        timestamp,
        sender,
        contentType,
        text: contentType === 'text' ? content : '',
        mediaFilename: null, // filled by media-matcher
        isMyMessage: false,  // filled after parsing
      };
      items.push(message);
      lastMessage = message;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      lastMessage = null;
      continue;
    }

    // Continuation line (multi-line message)
    if (lastMessage) {
      lastMessage.text += '\n' + line;
      continue;
    }
  }

  return {
    items,
    metadata: {
      exportDate,
      participants: Array.from(participants),
    },
  };
}

export function resolveMyName(participants: string[], chatName: string): string {
  // chatName is the other person's name (from folder name)
  // Find participant matching chatName -> that's the other person
  // The remaining one is "me"
  const otherPerson = participants.find(p => chatName.includes(p) || p.includes(chatName));
  if (otherPerson) {
    const me = participants.find(p => p !== otherPerson);
    return me || participants[0];
  }
  // Fallback: second participant is "me" (first mentioned is usually the other person)
  return participants.length > 1 ? participants[1] : participants[0];
}

export function markMyMessages(items: ChatItem[], myName: string): void {
  for (const item of items) {
    if (item.type === 'message') {
      item.isMyMessage = item.sender === myName;
    }
  }
}
