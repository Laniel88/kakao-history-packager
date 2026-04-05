import { writable } from 'svelte/store';

export interface Message {
  type: 'message';
  id: number;
  timestamp: number;
  sender: string;
  contentType: 'text' | 'photo' | 'video' | 'emoticon';
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

export const chatData = writable<ChatData | null>(null);
export const isLoading = writable(true);

export async function loadChatData() {
  try {
    const response = await fetch('./chat-data.json');
    const data: ChatData = await response.json();
    chatData.set(data);
  } catch (e) {
    console.error('Failed to load chat data:', e);
  } finally {
    isLoading.set(false);
  }
}
