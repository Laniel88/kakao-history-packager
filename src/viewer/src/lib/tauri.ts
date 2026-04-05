import { writable } from 'svelte/store';

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

// Asset URL map: filename -> webview-accessible URL
export const assetUrlMap = writable<Map<string, string>>(new Map());

export async function resolveAssetUrls(filenames: string[]) {
  const map = new Map<string, string>();

  if (isTauri) {
    // Use custom res:// protocol registered in Rust
    for (const f of filenames) {
      map.set(f, `res://localhost/assets/${f}`);
    }
  } else {
    for (const f of filenames) {
      map.set(f, `assets/${f}`);
    }
  }

  assetUrlMap.set(map);
}

export async function loadResourceJson<T>(path: string): Promise<T> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    const json = await invoke<string>('read_resource', { path });
    return JSON.parse(json);
  }
  const response = await fetch(path);
  return response.json();
}

export async function openMediaViewer(filename: string) {
  try {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const existing = await WebviewWindow.getByLabel('media-viewer');
    if (existing) await existing.close();
    new WebviewWindow('media-viewer', {
      url: `index.html?view=media&file=${encodeURIComponent(filename)}`,
      title: '',
      width: 600,
      height: 700,
      minWidth: 400,
      minHeight: 400,
      decorations: true,
      titleBarStyle: 'Overlay',
    });
  } catch {
    window.open(`?view=media&file=${encodeURIComponent(filename)}`, '_blank', 'width=600,height=700');
  }
}
