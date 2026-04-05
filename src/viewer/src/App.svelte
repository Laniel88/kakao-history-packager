<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { metadata, items, isLoading, loadChatData } from './stores/chat';
  import { initSettings } from './stores/settings';
  import Header from './components/Header.svelte';
  import ChatView from './components/ChatView.svelte';
  import InputArea from './components/InputArea.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import DrawerWindow from './components/DrawerWindow.svelte';
  import MediaViewerWindow from './components/MediaViewerWindow.svelte';
  import SettingsModal from './components/SettingsModal.svelte';

  const viewParam = new URLSearchParams(window.location.search).get('view');
  let chatView: ChatView;

  onMount(async () => {
    await loadChatData();
    // Main chat view: pre-load initial chunks for bottom scroll
    if (!viewParam) {
      const { ensureChunksLoaded } = await import('./stores/chat');
      const meta = get(metadata);
      if (meta && meta.totalItems > 0) {
        const lastChunk = meta.chunkCount - 1;
        await ensureChunksLoaded(lastChunk * meta.chunkSize, meta.totalItems);
      }
    }
    // Settings only needed for main chat view
    if (!viewParam) {
      await initSettings();
    }
  });

  function handleSearchNavigate(index: number) {
    chatView?.scrollToItem(index);
  }
</script>

{#if viewParam === 'drawer'}
  <div class="drawer-standalone">
    {#if $isLoading}
      <div class="loading">로딩 중...</div>
    {:else if $metadata}
      <DrawerWindow />
    {/if}
  </div>
{:else if viewParam === 'media'}
  <div class="media-standalone">
    {#if $isLoading}
      <div class="loading">로딩 중...</div>
    {:else if $metadata}
      <MediaViewerWindow />
    {/if}
  </div>
{:else}
  <div class="app-container">
    {#if $isLoading}
      <div class="loading">로딩 중...</div>
    {:else if $metadata}
      <Header metadata={$metadata} />
      <SearchBar items={$items} onNavigate={handleSearchNavigate} />
      <ChatView bind:this={chatView} items={$items} />
      <InputArea />
      <SettingsModal />
    {:else}
      <div class="loading">데이터를 불러올 수 없습니다.</div>
    {/if}
  </div>
{/if}

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--chat-bg);
  }

  .drawer-standalone {
    height: 100%;
    width: 100%;
    background: #ffffff;
  }

  .media-standalone {
    height: 100%;
    width: 100%;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 14px;
  }
</style>
