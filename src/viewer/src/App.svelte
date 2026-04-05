<script lang="ts">
  import { onMount } from 'svelte';
  import { chatData, isLoading, loadChatData } from './stores/chat';
  import Header from './components/Header.svelte';
  import ChatView from './components/ChatView.svelte';
  import InputArea from './components/InputArea.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import MediaPopup from './components/MediaPopup.svelte';
  import DrawerWindow from './components/DrawerWindow.svelte';
  import SettingsModal from './components/SettingsModal.svelte';

  const viewParam = new URLSearchParams(window.location.search).get('view');
  let chatView: ChatView;

  onMount(() => {
    loadChatData();
  });

  function handleSearchNavigate(index: number) {
    chatView?.scrollToItem(index);
  }
</script>

{#if viewParam === 'drawer'}
  <!-- Drawer standalone window -->
  <div class="drawer-standalone">
    {#if $isLoading}
      <div class="loading">로딩 중...</div>
    {:else if $chatData}
      <DrawerWindow />
    {/if}
  </div>
{:else}
  <!-- Main chat window -->
  <div class="app-container">
    {#if $isLoading}
      <div class="loading">로딩 중...</div>
    {:else if $chatData}
      <Header metadata={$chatData.metadata} />
      <SearchBar items={$chatData.items} onNavigate={handleSearchNavigate} />
      <ChatView bind:this={chatView} items={$chatData.items} />
      <InputArea />
      <MediaPopup />
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

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 14px;
  }
</style>
