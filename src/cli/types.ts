export type MessageContentType = 'text' | 'photo' | 'video' | 'emoticon';

export interface Message {
  type: 'message';
  id: number;
  timestamp: number;
  sender: string;
  contentType: MessageContentType;
  text: string;
  mediaFilename: string | null;
  isMyMessage: boolean;
}

export interface DateSeparator {
  type: 'date-separator';
  id: number;
  date: string;
  timestamp: number;
}

export type ChatItem = Message | DateSeparator;

export interface ChatMetadata {
  chatName: string;
  exportDate: string;
  participants: string[];
  myName: string;
  totalMessages: number;
}

export interface AssetEntry {
  filename: string;
  type: 'image' | 'video' | 'other';
  timestamp: number | null;
}

export interface ChatData {
  metadata: ChatMetadata;
  items: ChatItem[];
  assetManifest: AssetEntry[];
}

// d=date, t=text, p=photo, v=video, e=emoticon
export type ItemTypeHint = 'd' | 't' | 'p' | 'v' | 'e';

export interface LinkEntry {
  url: string;
  sender: string;
  timestamp: number;
}

export interface ChunkMetadata {
  chatName: string;
  exportDate: string;
  participants: string[];
  myName: string;
  totalMessages: number;
  totalItems: number;
  chunkSize: number;
  chunkCount: number;
  itemTypeHints: string; // "dttptdtt..." — 1 char per item
  assetManifest: AssetEntry[];
  links: LinkEntry[];
}
