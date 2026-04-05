<script lang="ts" module>
  import type { Snippet } from 'svelte';
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { ChatItem } from '../stores/chat';

  let {
    items,
    overscan = 20,
    children,
  }: {
    items: ChatItem[];
    overscan?: number;
    children: Snippet<[ChatItem, number]>;
  } = $props();

  let container: HTMLDivElement;

  // Height cache: item id -> measured height
  const heightCache = new Map<number, number>();
  const DEFAULT_HEIGHT = 52;

  function estimateHeight(item: ChatItem): number {
    const cached = heightCache.get(item.id);
    if (cached !== undefined) return cached;
    if (item.type === 'date-separator') return 44;
    if (item.contentType === 'photo' || item.contentType === 'video') return 240;
    if (item.contentType === 'emoticon') return 46;
    const textLen = item.text.length;
    const lineBreaks = (item.text.match(/\n/g) || []).length;
    const lines = Math.ceil(textLen / 28) + lineBreaks;
    return Math.max(42, 30 + lines * 20);
  }

  // State
  let visibleStart = $state(0);
  let visibleEnd = $state(0);
  let topSpacerHeight = $state(0);
  let bottomSpacerHeight = $state(0);
  let hasScrolledToBottom = $state(false);

  function getTotalHeight(): number {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += estimateHeight(items[i]);
    }
    return total;
  }

  function getHeightBefore(index: number): number {
    let total = 0;
    for (let i = 0; i < index; i++) {
      total += estimateHeight(items[i]);
    }
    return total;
  }

  function getHeightRange(start: number, end: number): number {
    let total = 0;
    for (let i = start; i < end; i++) {
      total += estimateHeight(items[i]);
    }
    return total;
  }

  function updateVisibleRange() {
    if (!container || items.length === 0) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    // Find first visible item
    let cumHeight = 0;
    let startIdx = 0;
    for (let i = 0; i < items.length; i++) {
      const h = estimateHeight(items[i]);
      if (cumHeight + h > scrollTop) {
        startIdx = i;
        break;
      }
      cumHeight += h;
    }

    // Find last visible item
    let endIdx = startIdx;
    let visibleHeight = cumHeight - scrollTop; // negative offset of first item
    for (let i = startIdx; i < items.length; i++) {
      endIdx = i + 1;
      visibleHeight += estimateHeight(items[i]);
      if (visibleHeight >= viewportHeight) break;
    }

    // Apply overscan
    const newStart = Math.max(0, startIdx - overscan);
    const newEnd = Math.min(items.length, endIdx + overscan);

    visibleStart = newStart;
    visibleEnd = newEnd;
    topSpacerHeight = getHeightBefore(newStart);
    bottomSpacerHeight = getHeightRange(newEnd, items.length);
  }

  function measureRenderedItems() {
    if (!container) return;
    const rendered = container.querySelectorAll('[data-item-id]');
    let changed = false;

    rendered.forEach((el) => {
      const id = parseInt(el.getAttribute('data-item-id')!);
      const height = (el as HTMLElement).offsetHeight;
      const cached = heightCache.get(id);
      if (cached === undefined || Math.abs(cached - height) > 1) {
        heightCache.set(id, height);
        changed = true;
      }
    });

    if (changed) {
      // Recalculate spacers with updated heights
      topSpacerHeight = getHeightBefore(visibleStart);
      bottomSpacerHeight = getHeightRange(visibleEnd, items.length);
    }
  }

  let rafId: number | null = null;
  function onScroll() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      updateVisibleRange();
      rafId = requestAnimationFrame(measureRenderedItems);
    });
  }

  export function scrollToBottom() {
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  export function scrollToItem(index: number) {
    if (!container || index < 0 || index >= items.length) return;
    const targetY = getHeightBefore(index);
    const viewportHeight = container.clientHeight;
    const itemHeight = estimateHeight(items[index]);
    container.scrollTop = Math.max(0, targetY - viewportHeight / 2 + itemHeight / 2);
    requestAnimationFrame(() => {
      updateVisibleRange();
      requestAnimationFrame(measureRenderedItems);
    });
  }

  $effect(() => {
    if (items.length > 0) {
      updateVisibleRange();
    }
  });

  onMount(async () => {
    updateVisibleRange();
    await tick();

    // Measure first batch
    measureRenderedItems();
    updateVisibleRange();

    // Scroll to bottom
    await tick();
    if (container) {
      container.scrollTop = container.scrollHeight;
      hasScrolledToBottom = true;
      updateVisibleRange();
      requestAnimationFrame(measureRenderedItems);
    }

    // Handle resize
    const ro = new ResizeObserver(() => {
      updateVisibleRange();
    });
    ro.observe(container);
    return () => ro.disconnect();
  });

  const visibleItems = $derived(
    items.slice(visibleStart, visibleEnd).map((item, i) => ({
      item,
      index: visibleStart + i,
    }))
  );
</script>

<div class="virtual-scroller" bind:this={container} onscroll={onScroll}>
  <div class="spacer" style="height:{topSpacerHeight}px"></div>
  {#each visibleItems as { item, index } (item.id)}
    <div data-item-id={item.id}>
      {@render children(item, index)}
    </div>
  {/each}
  <div class="spacer" style="height:{bottomSpacerHeight}px"></div>
</div>

<style>
  .virtual-scroller {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--chat-bg);
  }

  .spacer {
    pointer-events: none;
  }
</style>
