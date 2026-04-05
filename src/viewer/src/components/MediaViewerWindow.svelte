<script lang="ts">
  import { metadata } from '../stores/chat';
  import type { AssetEntry } from '../stores/chat';
  import { assetUrlMap } from '../lib/tauri';

  const params = new URLSearchParams(window.location.search);
  const initialFile = params.get('file') ?? '';

  // Media list from assetManifest (no chunk loading needed)
  const mediaItems = $derived(
    ($metadata?.assetManifest ?? [])
      .filter(a => a.type === 'image' || a.type === 'video')
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
  );

  let currentIndex = $state(0);

  $effect(() => {
    if (initialFile && mediaItems.length > 0) {
      const idx = mediaItems.findIndex(m => m.filename === initialFile);
      if (idx >= 0) currentIndex = idx;
    }
  });

  const currentMedia = $derived(mediaItems[currentIndex]);

  const titleText = $derived.by(() => {
    if (!currentMedia || !currentMedia.timestamp) return '';
    const d = new Date(currentMedia.timestamp);
    const dateStr = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
    return `${$metadata?.chatName ?? ''}, ${dateStr}`;
  });

  function prev() {
    if (currentIndex > 0) currentIndex--;
  }

  function next() {
    if (currentIndex < mediaItems.length - 1) currentIndex++;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="media-viewer">
  <div class="viewer-titlebar" data-tauri-drag-region>
    <span class="title-text">{titleText}</span>
  </div>

  <div class="viewer-content">
    {#if currentMedia}
      {#if currentMedia.type === 'image'}
        <img src={$assetUrlMap.get(currentMedia.filename) ?? ''} alt="" class="viewer-image" />
      {:else}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video src={$assetUrlMap.get(currentMedia.filename) ?? ''} controls class="viewer-video"></video>
      {/if}
    {:else}
      <div class="empty">미디어를 찾을 수 없습니다</div>
    {/if}

    {#if currentIndex > 0}
      <button class="nav-btn nav-prev" onclick={prev}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    {/if}

    {#if currentIndex < mediaItems.length - 1}
      <button class="nav-btn nav-next" onclick={next}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    {/if}
  </div>

  <div class="viewer-toolbar">
    <div class="toolbar-left">
      <button class="tool-btn" disabled title="갤러리">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </button>
      <div class="toolbar-divider"></div>
      <button class="tool-btn" disabled title="축소">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="tool-btn" disabled title="확대">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button class="tool-btn" disabled title="맞춤">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
      </button>
      <button class="tool-btn" disabled title="회전">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 4v6h6"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      </button>
    </div>
    <div class="toolbar-right">
      <button class="tool-btn" disabled title="다운로드">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      <button class="tool-btn" disabled title="더보기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#888">
          <circle cx="6" cy="12" r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="18" cy="12" r="1.5"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .media-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f5f5f5;
  }

  .viewer-titlebar {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    min-height: 36px;
    padding-top: 8px;
    background: #f5f5f5;
  }

  .title-text {
    font-size: 12px;
    color: #555;
  }

  .viewer-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: 8px;
  }

  .viewer-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 2px;
  }

  .viewer-video {
    max-width: 100%;
    max-height: 100%;
    outline: none;
    border-radius: 2px;
  }

  .empty {
    color: #999;
    font-size: 14px;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .nav-btn:hover {
    background: white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  .nav-prev { left: 12px; }
  .nav-next { right: 12px; }

  .viewer-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    min-height: 44px;
    padding: 0 12px;
    border-top: 1px solid #e5e5e5;
    background: #f5f5f5;
  }

  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolbar-divider {
    width: 1px;
    height: 16px;
    background: #ddd;
    margin: 0 6px;
  }

  .tool-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: default;
  }
</style>
