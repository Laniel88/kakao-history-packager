import { writable } from 'svelte/store';

export const isSearchOpen = writable(false);
export const isSettingsOpen = writable(false);
export const mediaPopup = writable<{ src: string; type: 'image' | 'video' } | null>(null);
