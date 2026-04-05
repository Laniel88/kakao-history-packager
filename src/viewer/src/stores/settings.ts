import { writable } from 'svelte/store';

export interface UserSettings {
  otherName: string;
  otherProfilePhoto: string | null; // base64 data URI
}

const STORAGE_KEY = 'kakao-viewer-settings';

function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { otherName: '', otherProfilePhoto: null };
}

function saveSettings(settings: UserSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const settings = writable<UserSettings>(loadSettings());

settings.subscribe(value => {
  saveSettings(value);
});
