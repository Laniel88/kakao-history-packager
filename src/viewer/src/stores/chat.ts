import { writable, get } from 'svelte/store';

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

export interface AssetEntry {
  filename: string;
  type: 'image' | 'video' | 'other';
  timestamp: number | null;
}

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
  itemTypeHints: string;
  assetManifest: AssetEntry[];
  links: LinkEntry[];
}

// Legacy format (for dev mode compatibility)
export interface ChatData {
  metadata: { chatName: string; exportDate: string; participants: string[]; myName: string; totalMessages: number };
  items: ChatItem[];
  assetManifest: AssetEntry[];
}

export const metadata = writable<ChunkMetadata | null>(null);
export const items = writable<(ChatItem | null)[]>([]);
export const isLoading = writable(true);

// Chunk cache
const loadedChunks = new Map<number, ChatItem[]>();
const MAX_CACHED_CHUNKS = 15;
const chunkLoadOrder: number[] = []; // LRU tracking
let _metadata: ChunkMetadata | null = null;

async function loadChunkData(chunkIndex: number): Promise<ChatItem[]> {
  if (loadedChunks.has(chunkIndex)) return loadedChunks.get(chunkIndex)!;

  const { loadResourceJson } = await import('../lib/tauri');
  const chunkItems = await loadResourceJson<ChatItem[]>(`data/chunks/${chunkIndex}.json`);

  // LRU eviction
  if (loadedChunks.size >= MAX_CACHED_CHUNKS) {
    const evict = chunkLoadOrder.shift();
    if (evict !== undefined) loadedChunks.delete(evict);
  }

  loadedChunks.set(chunkIndex, chunkItems);
  chunkLoadOrder.push(chunkIndex);

  return chunkItems;
}

function spliceChunkIntoItems(chunkIndex: number, chunkItems: ChatItem[]) {
  const currentItems = get(items);
  const start = chunkIndex * _metadata!.chunkSize;
  for (let i = 0; i < chunkItems.length; i++) {
    currentItems[start + i] = chunkItems[i];
  }
  items.set(currentItems);
}

export async function ensureChunksLoaded(startItem: number, endItem: number) {
  if (!_metadata) return;

  const startChunk = Math.floor(startItem / _metadata.chunkSize);
  const endChunk = Math.floor(Math.min(endItem, _metadata.totalItems - 1) / _metadata.chunkSize);

  // Load visible chunks + 1 adjacent on each side for grouping logic
  const from = Math.max(0, startChunk - 1);
  const to = Math.min(_metadata.chunkCount - 1, endChunk + 1);

  const promises: Promise<void>[] = [];
  for (let i = from; i <= to; i++) {
    if (!loadedChunks.has(i)) {
      promises.push(
        loadChunkData(i).then(chunkItems => spliceChunkIntoItems(i, chunkItems))
      );
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

export async function loadChatData() {
  try {
    const { loadResourceJson, resolveAssetUrls } = await import('../lib/tauri');

    try {
      const meta = await loadResourceJson<ChunkMetadata>('data/metadata.json');
      _metadata = meta;
      metadata.set(meta);

      // Initialize sparse items array
      items.set(new Array(meta.totalItems).fill(null));

      // Resolve asset URLs (needed by all views)
      await resolveAssetUrls(meta.assetManifest.map(a => a.filename));
    } catch {
      // Fallback: legacy single-file format (dev mode)
      const data = await loadResourceJson<ChatData>('data/chat-data.json');
      _metadata = {
        ...data.metadata,
        totalItems: data.items.length,
        chunkSize: data.items.length,
        chunkCount: 1,
        itemTypeHints: data.items.map(i => i.type === 'date-separator' ? 'd' : 't').join(''),
        assetManifest: data.assetManifest,
        links: [],
      };
      metadata.set(_metadata);
      items.set(data.items);
      await resolveAssetUrls(data.assetManifest.map(a => a.filename));
    }
  } catch (e) {
    console.error('Failed to load chat data:', e);
  } finally {
    isLoading.set(false);
  }
}
