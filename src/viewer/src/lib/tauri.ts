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
