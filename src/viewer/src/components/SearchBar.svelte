<script lang="ts">
  import { onMount } from 'svelte';
  import type { ChatItem } from '../stores/chat';
  import { isSearchOpen } from '../stores/ui';
  import {
    searchQuery, searchResultIndex, searchResultCount,
    isSearchExhausted, resetSearch, startSearch, findNext, findPrev
  } from '../stores/search';

  let { items, onNavigate }: { items: ChatItem[]; onNavigate: (index: number) => void } = $props();

  let inputEl: HTMLInputElement;
  let query = $state('');
  let showToast = $state(false);
  let toastTimeout: ReturnType<typeof setTimeout>;

  function handleInput() {
    if (query.trim()) {
      startSearch(items, query);
    } else {
      resetSearch();
    }
  }

  function handleFindNext() {
    findNext(items, query);
    if ($isSearchExhausted && $searchResultCount === 0) {
      showToastMessage();
    } else if ($isSearchExhausted) {
      showToastMessage();
    }
  }

  function handleFindPrev() {
    findPrev(items, query);
  }

  function close() {
    isSearchOpen.set(false);
    resetSearch();
    query = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFindNext();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function showToastMessage() {
    showToast = true;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      showToast = false;
    }, 2000);
  }

  // Navigate to result when it changes
  $effect(() => {
    const idx = $searchResultIndex;
    if (idx >= 0) {
      onNavigate(idx);
    }
  });

  // Focus input when opened
  $effect(() => {
    if ($isSearchOpen && inputEl) {
      setTimeout(() => inputEl?.focus(), 50);
    }
  });
</script>

{#if $isSearchOpen}
  <div class="search-bar">
    <div class="search-input-wrapper">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="#999">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        placeholder="대화내용 검색"
        class="search-input"
      />
    </div>
    <div class="search-controls">
      <button
        class="nav-btn"
        onclick={handleFindNext}
        disabled={!query.trim()}
        title="다음 결과 (위로)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={query.trim() ? '#555' : '#ccc'}>
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
        </svg>
      </button>
      <button
        class="nav-btn"
        onclick={handleFindPrev}
        disabled={$searchResultCount <= 1}
        title="이전 결과 (아래로)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={$searchResultCount > 1 ? '#555' : '#ccc'}>
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
        </svg>
      </button>
      <button class="close-btn" onclick={close} title="닫기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#555">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  </div>
{/if}

{#if showToast}
  <div class="toast">더 이상 검색 결과가 없습니다</div>
{/if}

<style>
  .search-bar {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: var(--search-bg);
    border-bottom: 1px solid var(--search-border);
    gap: 8px;
  }

  .search-input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f5f5f5;
    border-radius: 6px;
    padding: 6px 10px;
  }

  .search-icon {
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    outline: none;
    color: var(--text-primary);
  }

  .search-input::placeholder {
    color: #bbb;
  }

  .search-controls {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .nav-btn, .close-btn {
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

  .nav-btn:hover:not(:disabled), .close-btn:hover {
    background: #f0f0f0;
  }

  .nav-btn:disabled {
    cursor: default;
  }

  .toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--toast-bg);
    color: var(--toast-text);
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 13px;
    z-index: 200;
    pointer-events: none;
    animation: fadeInOut 2s ease;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }
</style>
