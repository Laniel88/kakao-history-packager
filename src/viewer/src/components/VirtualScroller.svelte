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
    onVisibleRangeChange,
  }: {
    items: (ChatItem | null)[];
    overscan?: number;
    children: Snippet<[ChatItem | null, number]>;
    onVisibleRangeChange?: (start: number, end: number) => void;
  } = $props();

  let container: HTMLDivElement;

  // Height cache: item id -> measured height
  const heightCache = new Map<number, number>();

  // Prefix-sum array: prefixHeights[i] = sum of heights[0..i-1]
  // prefixHeights[0] = 0, prefixHeights[n] = total height
  let prefixHeights = new Float64Array(1);

  function estimateHeight(item: ChatItem | null): number {
    if (!item) return 44; // placeholder height
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

  function buildPrefixSums() {
    const n = items.length;
    prefixHeights = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) {
      prefixHeights[i + 1] = prefixHeights[i] + estimateHeight(items[i]);
    }
  }

  function rebuildPrefixFrom(index: number) {
    for (let i = index; i < items.length; i++) {
      prefixHeights[i + 1] = prefixHeights[i] + estimateHeight(items[i]);
    }
  }

  // O(log n) binary search for first visible item
  function findStartIndex(scrollTop: number): number {
    let lo = 0;
    let hi = items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefixHeights[mid + 1] <= scrollTop) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  // State
  let visibleStart = $state(0);
  let visibleEnd = $state(0);
  let topSpacerHeight = $state(0);
  let bottomSpacerHeight = $state(0);

  function updateVisibleRange() {
    if (!container || items.length === 0) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    // Binary search for first visible item — O(log n)
    const startIdx = findStartIndex(scrollTop);

    // Find last visible item — O(visible count), typically ~15-30
    let endIdx = startIdx;
    const bottomEdge = scrollTop + viewportHeight;
    while (endIdx < items.length && prefixHeights[endIdx] < bottomEdge) {
      endIdx++;
    }

    // Apply overscan
    const newStart = Math.max(0, startIdx - overscan);
    const newEnd = Math.min(items.length, endIdx + overscan);

    visibleStart = newStart;
    visibleEnd = newEnd;
    topSpacerHeight = prefixHeights[newStart];                                        // O(1)
    bottomSpacerHeight = prefixHeights[items.length] - prefixHeights[newEnd];         // O(1)

    onVisibleRangeChange?.(newStart, newEnd);
  }

  function measureRenderedItems() {
    if (!container) return;
    const rendered = container.querySelectorAll('[data-item-id]');
    let minChangedIndex = items.length;

    rendered.forEach((el) => {
      const id = parseInt(el.getAttribute('data-item-id')!);
      const height = (el as HTMLElement).offsetHeight;
      const cached = heightCache.get(id);
      if (cached === undefined || Math.abs(cached - height) > 1) {
        heightCache.set(id, height);
        // Find the index for this id to know where to rebuild from
        const idx = items.findIndex(item => item.id === id);
        if (idx >= 0 && idx < minChangedIndex) {
          minChangedIndex = idx;
        }
      }
    });

    if (minChangedIndex < items.length) {
      rebuildPrefixFrom(minChangedIndex);
      topSpacerHeight = prefixHeights[visibleStart];
      bottomSpacerHeight = prefixHeights[items.length] - prefixHeights[visibleEnd];
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
    const targetY = prefixHeights[index];
    const viewportHeight = container.clientHeight;
    const itemHeight = prefixHeights[index + 1] - prefixHeights[index];
    container.scrollTop = Math.max(0, targetY - viewportHeight / 2 + itemHeight / 2);
    requestAnimationFrame(() => {
      updateVisibleRange();
      requestAnimationFrame(measureRenderedItems);
    });
  }

  $effect(() => {
    if (items.length > 0) {
      buildPrefixSums();
      updateVisibleRange();
    }
  });

  onMount(async () => {
    if (items.length > 0) {
      buildPrefixSums();
      updateVisibleRange();
    }
    await tick();

    measureRenderedItems();
    updateVisibleRange();

    await tick();
    if (container) {
      container.scrollTop = container.scrollHeight;
      updateVisibleRange();
      requestAnimationFrame(measureRenderedItems);
    }

    const ro = new ResizeObserver(() => updateVisibleRange());
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
  {#each visibleItems as { item, index } (item?.id ?? `placeholder-${index}`)}
    <div data-item-id={item?.id ?? -1}>
      {@render children(item, index)}
    </div>
  {/each}
  <div class="spacer" style="height:{bottomSpacerHeight}px"></div>
  <div class="bottom-padding"></div>
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

  .bottom-padding {
    height: 16px;
  }
</style>
