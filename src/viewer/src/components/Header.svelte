<script lang="ts">
  import type { ChunkMetadata } from '../stores/chat';
  import { isSearchOpen, isSettingsOpen } from '../stores/ui';
  import { settings } from '../stores/settings';

  let { metadata }: { metadata: ChunkMetadata } = $props();

  let showHamburgerMenu = $state(false);

  function toggleSearch() {
    isSearchOpen.update(v => !v);
  }

  function toggleHamburger() {
    showHamburgerMenu = !showHamburgerMenu;
  }

  async function openDrawer() {
    showHamburgerMenu = false;
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const existing = await WebviewWindow.getByLabel('drawer');
      if (existing) {
        await existing.setFocus();
        return;
      }
      new WebviewWindow('drawer', {
        url: 'index.html?view=drawer',
        title: '서랍',
        width: 360,
        height: 600,
        minWidth: 280,
        minHeight: 400,
        decorations: true,
      });
    } catch {
      // Fallback for web dev: open in new tab
      window.open('?view=drawer', '_blank', 'width=360,height=600');
    }
  }

  function openSettings() {
    showHamburgerMenu = false;
    isSettingsOpen.set(true);
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      isSearchOpen.set(true);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      isSettingsOpen.set(true);
    }
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  });

  const displayName = $derived($settings.otherName || metadata.chatName);
  const profilePhoto = $derived($settings.otherProfilePhoto);
</script>

<header class="header" data-tauri-drag-region>
  <div class="header-titlebar" data-tauri-drag-region>
    <div class="opacity-slider">
      <input type="range" min="0" max="100" value="100" disabled />
    </div>
  </div>
  <div class="header-main" data-tauri-drag-region>
  <div class="header-left">
    <div class="profile-photo">
      {#if profilePhoto}
        <img src={profilePhoto} alt={displayName} />
      {:else}
        <div class="profile-placeholder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#aaa">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      {/if}
    </div>
    <div class="header-info">
      <span class="chat-name">{displayName}</span>
      <div class="member-count">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#999" stroke="none">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span>2</span>
      </div>
    </div>
  </div>
  <div class="header-right">
    <button class="header-icon" onclick={toggleSearch} title="검색">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round">
        <circle cx="10.5" cy="10.5" r="6.5"/>
        <line x1="15.5" y1="15.5" x2="20" y2="20"/>
      </svg>
    </button>
    <button class="header-icon decorative" title="통화">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    </button>
    <button class="header-icon decorative" title="화상통화">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="5" width="14" height="14" rx="2"/>
        <path d="M16 10l6-4v12l-6-4z"/>
      </svg>
    </button>
    <div class="hamburger-wrapper">
      <button class="header-icon" onclick={toggleHamburger} title="메뉴">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      {#if showHamburgerMenu}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="hamburger-backdrop" onclick={() => showHamburgerMenu = false} onkeydown={() => {}}></div>
        <div class="hamburger-menu">
          <button class="menu-item" onclick={openDrawer}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#555">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
            </svg>
            서랍
          </button>
          <button class="menu-item" onclick={openSettings}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#555">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            설정
          </button>
        </div>
      {/if}
    </div>
  </div>
  </div>
</header>

<style>
  .header {
    display: flex;
    flex-direction: column;
    background: var(--chat-bg);
  }

  .header-titlebar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 28px;
    min-height: 28px;
    padding: 0 12px;
  }

  .header-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 58px;
    min-height: 58px;
    padding: 0 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .profile-photo {
    width: 36px;
    height: 36px;
    border-radius: 14px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .profile-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-placeholder {
    width: 100%;
    height: 100%;
    background: var(--profile-bg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .chat-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .member-count {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    color: #777;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .opacity-slider {
    display: flex;
    align-items: center;
  }

  .opacity-slider input[type="range"] {
    -webkit-appearance: none;
    width: 56px;
    height: 2px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 2px;
    outline: none;
    cursor: default;
  }

  .opacity-slider input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 0.5px 2px rgba(0, 0, 0, 0.3);
    cursor: default;
  }

  .header-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .header-icon:hover {
    background: #f0f0f0;
  }

  .header-icon.decorative {
    cursor: default;
    opacity: 0.5;
  }

  .header-icon.decorative:hover {
    background: transparent;
  }

  .hamburger-wrapper {
    position: relative;
  }

  .hamburger-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99;
  }

  .hamburger-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    z-index: 100;
    min-width: 140px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 16px;
    border: none;
    background: transparent;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
  }

  .menu-item:hover {
    background: #f5f5f5;
  }
</style>
