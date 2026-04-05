import { writable, get } from 'svelte/store';
import { chatData } from './chat';

export interface UserSettings {
  otherName: string;
  otherProfilePhoto: string | null; // base64 data URI
}

const DEFAULT_SETTINGS: UserSettings = { otherName: '', otherProfilePhoto: null };

export const settings = writable<UserSettings>(DEFAULT_SETTINGS);
let initialized = false;
let unsubscribe: (() => void) | null = null;

export async function initSettings() {
  const data = get(chatData);
  const chatName = data?.metadata.chatName ?? '';

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const json = await invoke<string>('load_settings', { chatName });
    const parsed = JSON.parse(json);
    settings.set({ ...DEFAULT_SETTINGS, ...parsed });
  } catch {
    // Fallback to localStorage (web dev)
    try {
      const stored = localStorage.getItem(`settings-${chatName}`);
      if (stored) settings.set({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {}
  }

  initialized = true;

  // Auto-save on changes (prevent duplicate subscriptions)
  if (unsubscribe) unsubscribe();
  unsubscribe = settings.subscribe(value => {
    if (!initialized) return;
    saveSettings(chatName, value);
  });
}

async function saveSettings(chatName: string, value: UserSettings) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_settings', { chatName, data: JSON.stringify(value) });
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(`settings-${chatName}`, JSON.stringify(value));
    } catch {}
  }
}
