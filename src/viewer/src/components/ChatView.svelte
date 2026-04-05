<script lang="ts">
  import type { ChatItem, Message } from '../stores/chat';
  import { ensureChunksLoaded } from '../stores/chat';
  import DateSeparator from './DateSeparator.svelte';
  import MessageBubble from './MessageBubble.svelte';
  import VirtualScroller from './VirtualScroller.svelte';

  let { items }: { items: (ChatItem | null)[] } = $props();

  let scroller: VirtualScroller;

  function isMediaMessage(item: ChatItem): boolean {
    return item.type === 'message' && (item.contentType === 'photo' || item.contentType === 'video');
  }

  function shouldShowProfile(item: ChatItem, index: number): boolean {
    if (item.type !== 'message' || item.isMyMessage) return false;
    if (index === 0) return true;
    const prev = items[index - 1];
    if (!prev || prev.type !== 'message') return true;
    if (prev.sender !== item.sender) return true;
    if (isMediaMessage(item)) return true;
    return false;
  }

  function shouldShowTail(item: ChatItem, index: number): boolean {
    if (item.type !== 'message') return false;
    if (index === 0) return true;
    const prev = items[index - 1];
    if (!prev || prev.type !== 'message') return true;
    if (prev.sender !== item.sender) return true;
    if (isMediaMessage(item)) return true;
    return false;
  }

  function shouldShowTime(item: ChatItem, index: number): boolean {
    if (item.type !== 'message') return false;
    if (index === items.length - 1) return true;
    const next = items[index + 1];
    if (!next || next.type !== 'message') return true;
    if (next.sender !== item.sender) return true;
    const d1 = new Date(item.timestamp);
    const d2 = new Date(next.timestamp);
    return d1.getHours() !== d2.getHours() || d1.getMinutes() !== d2.getMinutes();
  }

  function handleVisibleRangeChange(start: number, end: number) {
    ensureChunksLoaded(start, end);
  }

  export function scrollToItem(index: number) {
    scroller?.scrollToItem(index);
  }
</script>

<VirtualScroller bind:this={scroller} {items} onVisibleRangeChange={handleVisibleRangeChange}>
  {#snippet children(item: ChatItem | null, index: number)}
    {#if item === null}
      <div class="placeholder-item"></div>
    {:else if item.type === 'date-separator'}
      <DateSeparator date={item.date} />
    {:else}
      <div class="message-wrapper" class:first-in-group={shouldShowTail(item, index)} class:continuation={!shouldShowProfile(item, index) && !item.isMyMessage}>
        <MessageBubble
          message={item}
          showProfile={shouldShowProfile(item, index)}
          showTail={shouldShowTail(item, index)}
          showTime={shouldShowTime(item, index)}
        />
      </div>
    {/if}
  {/snippet}
</VirtualScroller>

<style>
  .message-wrapper {
    padding-top: 2px;
  }

  .message-wrapper.first-in-group {
    padding-top: 10px;
  }

  .placeholder-item {
    height: 44px;
  }
</style>
