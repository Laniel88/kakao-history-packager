<script lang="ts">
  import type { Message } from '../stores/chat';
  import { settings } from '../stores/settings';
  import { searchQuery, searchResultIndex } from '../stores/search';
  import { openMediaViewer, assetUrlMap } from '../lib/tauri';

  let {
    message,
    showProfile = false,
    showTail = false,
    showTime = true,
  }: {
    message: Message;
    showProfile?: boolean;
    showTail?: boolean;
    showTime?: boolean;
  } = $props();

  const profilePhoto = $derived($settings.otherProfilePhoto);

  const isActiveResult = $derived($searchResultIndex === message.id);

  function formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h < 12 ? '오전' : '오후';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${ampm} ${h12}:${m.toString().padStart(2, '0')}`;
  }

  function highlightText(text: string, query: string): Array<{ text: string; highlight: boolean }> {
    if (!query) return [{ text, highlight: false }];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts: Array<{ text: string; highlight: boolean }> = [];
    let lastIndex = 0;

    let idx = lowerText.indexOf(lowerQuery);
    while (idx !== -1) {
      if (idx > lastIndex) {
        parts.push({ text: text.slice(lastIndex, idx), highlight: false });
      }
      parts.push({ text: text.slice(idx, idx + query.length), highlight: true });
      lastIndex = idx + query.length;
      idx = lowerText.indexOf(lowerQuery, lastIndex);
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }
    return parts.length > 0 ? parts : [{ text, highlight: false }];
  }

  const textParts = $derived(
    message.contentType === 'text' && $searchQuery
      ? highlightText(message.text, $searchQuery)
      : null
  );

  const timeStr = $derived(formatTime(message.timestamp));
  const isMine = $derived(message.isMyMessage);
</script>

{#snippet bubbleContent()}
  {#if message.contentType === 'photo'}
    {#if message.mediaFilename}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <img class="chat-image" src={$assetUrlMap.get(message.mediaFilename!) ?? ''} alt="사진" loading="lazy" onclick={() => openMediaViewer(message.mediaFilename!)} onkeydown={() => {}} />
    {:else}
      <div class="image-placeholder">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#ccc">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <span>사진</span>
      </div>
    {/if}
  {:else if message.contentType === 'video'}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="video-thumbnail" onclick={() => message.mediaFilename && openMediaViewer(message.mediaFilename)} onkeydown={() => {}}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>
  {:else if message.contentType === 'emoticon'}
    <span class="emoticon-text">이모티콘</span>
  {:else}
    <span class="message-text">{#if textParts}{#each textParts as part}{#if part.highlight}<mark class="highlight">{part.text}</mark>{:else}{part.text}{/if}{/each}{:else}{message.text}{/if}</span>
  {/if}
{/snippet}

<div class="message-row" class:mine={isMine} class:other={!isMine}>
  {#if !isMine}
    <div class="avatar-area">
      {#if showProfile}
        <div class="avatar">
          {#if profilePhoto}
            <img src={profilePhoto} alt={message.sender} />
          {:else}
            <div class="avatar-placeholder">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#aaa">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <div class="content-area">
      {#if showProfile}
        <span class="sender-name">{message.sender}</span>
      {/if}
      <div class="bubble-row">
        <div class="bubble other-bubble" class:has-tail={showTail}>
          {@render bubbleContent()}
        </div>
        {#if showTime}
          <span class="time">{timeStr}</span>
        {/if}
      </div>
    </div>
  {:else}
    <div class="content-area mine-content">
      <div class="bubble-row mine-row">
        {#if showTime}
          <span class="time">{timeStr}</span>
        {/if}
        <div class="bubble mine-bubble" class:has-tail={showTail}>
          {@render bubbleContent()}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .message-row {
    display: flex;
    padding: 0 16px;
    gap: 0;
  }

  .message-row.mine {
    justify-content: flex-end;
  }

  .avatar-area {
    width: 42px;
    min-width: 42px;
    padding-top: 2px;
    margin-right: 6px;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 14px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    background: var(--profile-bg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .content-area {
    display: flex;
    flex-direction: column;
    max-width: calc(100% - 100px);
  }

  .mine-content {
    align-items: flex-end;
  }

  .sender-name {
    font-size: 11px;
    color: var(--sender-name);
    margin-bottom: 4px;
    padding-left: 2px;
  }

  .bubble-row {
    display: flex;
    align-items: flex-end;
    gap: 5px;
  }

  .mine-row {
    flex-direction: row;
  }

  .bubble {
    padding: 7px 10px;
    border-radius: 6px;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;
    max-width: min(calc(100vw - 130px), 1500px);
    position: relative;
  }

  .other-bubble {
    background: var(--bubble-other);
    color: var(--bubble-other-text);
  }

  .other-bubble.has-tail::before {
    content: '';
    position: absolute;
    top: 6px;
    left: -6px;
    width: 0;
    height: 0;
    border-top: 6px solid var(--bubble-other);
    border-left: 6px solid transparent;
  }

  .mine-bubble {
    background: var(--bubble-mine);
    color: var(--bubble-mine-text);
  }

  .mine-bubble.has-tail::before {
    content: '';
    position: absolute;
    top: 6px;
    right: -6px;
    width: 0;
    height: 0;
    border-top: 6px solid var(--bubble-mine);
    border-right: 6px solid transparent;
  }

  .time {
    font-size: 10px;
    color: var(--time-text);
    white-space: nowrap;
    flex-shrink: 0;
    padding-bottom: 1px;
  }

  .message-text {
    font-size: 13px;
    user-select: text;
    -webkit-user-select: text;
  }

  .emoticon-text {
    font-size: 13px;
    color: #999;
    font-style: italic;
  }

  .chat-image {
    max-width: 280px;
    max-height: 360px;
    border-radius: 12px;
    display: block;
    object-fit: cover;
    cursor: pointer;
  }

  .image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 140px;
    height: 100px;
    background: #f0f0f0;
    border-radius: 8px;
    gap: 4px;
  }

  .image-placeholder span {
    font-size: 11px;
    color: #aaa;
  }

  .video-thumbnail {
    width: 200px;
    height: 150px;
    background: #333;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Images/videos render without bubble background or tail */
  .bubble:has(.chat-image),
  .bubble:has(.video-thumbnail) {
    padding: 0;
    background: transparent;
    border-radius: 0;
  }

  .bubble:has(.chat-image)::before,
  .bubble:has(.video-thumbnail)::before {
    display: none;
  }

  .bubble:has(.image-placeholder) {
    padding: 4px;
  }

  .highlight {
    background: var(--highlight-bg);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }
</style>
