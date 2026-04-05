<script lang="ts">
  import type { ChatItem, Message } from '../stores/chat';
  import DateSeparator from './DateSeparator.svelte';
  import MessageBubble from './MessageBubble.svelte';
  import VirtualScroller from './VirtualScroller.svelte';

  let { items }: { items: ChatItem[] } = $props();

  let scroller: VirtualScroller;

  // Group consecutive messages from same sender for profile display
  function shouldShowProfile(item: ChatItem, index: number): boolean {
    if (item.type !== 'message' || item.isMyMessage) return false;
    if (index === 0) return true;
    const prev = items[index - 1];
    if (prev.type !== 'message') return true;
    return prev.sender !== item.sender;
  }

  // Show time on last message before sender change or date separator
  function shouldShowTime(item: ChatItem, index: number): boolean {
    if (item.type !== 'message') return false;
    if (index === items.length - 1) return true;
    const next = items[index + 1];
    if (next.type !== 'message') return true;
    if (next.sender !== item.sender) return true;
    const d1 = new Date(item.timestamp);
    const d2 = new Date(next.timestamp);
    return d1.getHours() !== d2.getHours() || d1.getMinutes() !== d2.getMinutes();
  }

  export function scrollToItem(index: number) {
    scroller?.scrollToItem(index);
  }
</script>

<VirtualScroller bind:this={scroller} {items}>
  {#snippet children(item: ChatItem, index: number)}
    {#if item.type === 'date-separator'}
      <DateSeparator date={item.date} />
    {:else}
      <div class="message-wrapper" class:first-in-group={shouldShowProfile(item, index)} class:continuation={!shouldShowProfile(item, index) && !item.isMyMessage}>
        <MessageBubble
          message={item}
          showProfile={shouldShowProfile(item, index)}
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
</style>
