<script lang="ts">
  import type { ChatMetadata } from '../stores/chat';
  import { isSearchOpen, isDrawerOpen, isSettingsOpen } from '../stores/ui';
  import { settings } from '../stores/settings';

  let { metadata }: { metadata: ChatMetadata } = $props();

  let showHamburgerMenu = $state(false);

  function toggleSearch() {
    isSearchOpen.update(v => !v);
  }

  function toggleHamburger() {
    showHamburgerMenu = !showHamburgerMenu;
  }

  function openDrawer() {
    showHamburgerMenu = false;
    isDrawerOpen.set(true);
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

<header class="header">
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
      <span class="member-count">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#999">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
        2
      </span>
    </div>
  </div>
  <div class="header-right">
    <button class="header-icon" onclick={toggleSearch} title="검색">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#555">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
    </button>
    <button class="header-icon decorative" title="통화">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#555">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
      </svg>
    </button>
    <button class="header-icon decorative" title="화상통화">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#555">
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
      </svg>
    </button>
    <div class="hamburger-wrapper">
      <button class="header-icon" onclick={toggleHamburger} title="메뉴">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#555">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
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
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 58px;
    min-height: 58px;
    padding: 0 12px;
    background: var(--header-bg);
    border-bottom: 1px solid var(--header-border);
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
    align-items: center;
    gap: 6px;
  }

  .chat-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .member-count {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    color: #999;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;
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
