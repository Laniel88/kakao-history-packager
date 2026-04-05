import { writable } from 'svelte/store';

// Asset URL map: filename -> webview-accessible URL
export const assetUrlMap = writable<Map<string, string>>(new Map());

export async function resolveAssetUrls(filenames: string[]) {
  const map = new Map<string, string>();
  // In Tauri, use res:// protocol; in dev, use relative paths
  const prefix = (window as any).__TAURI_INTERNALS__ ? 'res://localhost/assets/' : 'assets/';
  for (const f of filenames) {
    map.set(f, prefix + f);
  }
  assetUrlMap.set(map);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function loadResourceJson<T>(path: string): Promise<T> {
  // Try Tauri invoke first (with timeout to handle IPC not ready), fall back to fetch
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const json = await withTimeout(invoke<string>('read_resource', { path }), 3000);
    return JSON.parse(json);
  } catch {
    const response = await fetch(path);
    return response.json();
  }
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
    });
  } catch {
    window.open(`?view=media&file=${encodeURIComponent(filename)}`, '_blank', 'width=600,height=700');
  }
}
