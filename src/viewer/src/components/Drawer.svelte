<script lang="ts">
  import { isDrawerOpen, mediaPopup } from '../stores/ui';
  import { chatData } from '../stores/chat';
  import type { AssetEntry, ChatItem } from '../stores/chat';

  let activeTab: 'media' | 'files' | 'links' = $state('media');

  function close() {
    isDrawerOpen.set(false);
  }

  // Media items (images + videos) grouped by month
  const mediaItems = $derived(
    ($chatData?.assetManifest ?? [])
      .filter(a => a.type === 'image' || a.type === 'video')
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
  );

  const mediaByMonth = $derived(() => {
    const groups = new Map<string, AssetEntry[]>();
    for (const item of mediaItems) {
      if (!item.timestamp) continue;
      const d = new Date(item.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  });

  // File items (non-media)
  const fileItems = $derived(
    ($chatData?.assetManifest ?? []).filter(a => a.type === 'other')
  );

  // Links extracted from messages
  const linkItems = $derived(() => {
    const items = $chatData?.items ?? [];
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const links: { url: string; sender: string; timestamp: number }[] = [];
    for (const item of items) {
      if (item.type !== 'message' || item.contentType !== 'text') continue;
      const matches = item.text.match(urlRegex);
      if (matches) {
        for (const url of matches) {
          links.push({ url, sender: item.sender, timestamp: item.timestamp });
        }
      }
    }
    return links.reverse();
  });

  function openMedia(filename: string, type: 'image' | 'video') {
    mediaPopup.set({ src: `assets/${filename}`, type });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  $effect(() => {
    if ($isDrawerOpen && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

{#if $isDrawerOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drawer-overlay" onclick={close} onkeydown={() => {}}></div>
  <div class="drawer">
    <div class="drawer-header">
      <span class="drawer-title">{$chatData?.metadata.chatName ?? ''}</span>
      <button class="drawer-close" onclick={close}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#555">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
    </div>

    <div class="drawer-tabs">
      <button class="tab" class:active={activeTab === 'media'} onclick={() => activeTab = 'media'}>사진/동영상</button>
      <button class="tab" class:active={activeTab === 'files'} onclick={() => activeTab = 'files'}>파일</button>
      <button class="tab" class:active={activeTab === 'links'} onclick={() => activeTab = 'links'}>링크</button>
      <span class="tab-count">
        {#if activeTab === 'media'}{mediaItems.length}개
        {:else if activeTab === 'files'}{fileItems.length}개
        {:else}{linkItems().length}개
        {/if}
      </span>
    </div>

    <div class="drawer-content">
      {#if activeTab === 'media'}
        {#each mediaByMonth() as [month, items]}
          <div class="month-group">
            <div class="month-label">{month}</div>
            <div class="media-grid">
              {#each items as item}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="media-thumb"
                  onclick={() => openMedia(item.filename, item.type as 'image' | 'video')}
                  onkeydown={() => {}}
                >
                  {#if item.type === 'image'}
                    <img src="assets/{item.filename}" alt="" loading="lazy" />
                  {:else}
                    <div class="video-thumb-placeholder">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
        {#if mediaItems.length === 0}
          <div class="empty">사진/동영상이 없습니다</div>
        {/if}

      {:else if activeTab === 'files'}
        {#if fileItems.length === 0}
          <div class="empty">파일이 없습니다</div>
        {:else}
          {#each fileItems as file}
            <div class="file-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#999">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              </svg>
              <span class="file-name">{file.filename}</span>
            </div>
          {/each}
        {/if}

      {:else}
        {#if linkItems().length === 0}
          <div class="empty">링크가 없습니다</div>
        {:else}
          {#each linkItems() as link}
            <div class="link-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
              </svg>
              <div class="link-text">
                <a href={link.url} target="_blank" rel="noopener">{link.url}</a>
                <span class="link-meta">{link.sender}</span>
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 300;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 320px;
    max-width: 80vw;
    background: white;
    z-index: 301;
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #eee;
  }

  .drawer-title {
    font-size: 15px;
    font-weight: 600;
  }

  .drawer-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
  }

  .drawer-close:hover {
    background: #f0f0f0;
  }

  .drawer-tabs {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding: 0 16px;
  }

  .tab {
    padding: 10px 12px;
    border: none;
    background: transparent;
    font-size: 13px;
    color: #999;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .tab.active {
    color: #333;
    font-weight: 600;
    border-bottom-color: #333;
  }

  .tab-count {
    margin-left: auto;
    font-size: 12px;
    color: #999;
  }

  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .month-group {
    margin-bottom: 16px;
  }

  .month-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .media-thumb {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 4px;
    cursor: pointer;
    background: #f0f0f0;
  }

  .media-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-thumb-placeholder {
    width: 100%;
    height: 100%;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty {
    text-align: center;
    color: #999;
    padding: 40px 0;
    font-size: 13px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 4px;
    border-bottom: 1px solid #f5f5f5;
  }

  .file-name {
    font-size: 13px;
    word-break: break-all;
  }

  .link-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 4px;
    border-bottom: 1px solid #f5f5f5;
  }

  .link-item svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .link-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .link-text a {
    font-size: 13px;
    color: #4a90d9;
    text-decoration: none;
    word-break: break-all;
  }

  .link-text a:hover {
    text-decoration: underline;
  }

  .link-meta {
    font-size: 11px;
    color: #999;
  }
</style>
