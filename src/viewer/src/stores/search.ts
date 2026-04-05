import { writable, get } from 'svelte/store';
import type { ChatItem } from './chat';

export const searchQuery = writable('');
export const searchResultIndex = writable(-1); // index into items array
export const searchResultCount = writable(0);
export const isSearchExhausted = writable(false);

// Track all found results so far (indices into items array, from newest to oldest)
let foundResults: number[] = [];
let currentResultPosition = -1; // position within foundResults
let lastSearchedIndex = -1; // last index we searched up to (going backwards)

export function resetSearch() {
  foundResults = [];
  currentResultPosition = -1;
  lastSearchedIndex = -1;
  searchResultIndex.set(-1);
  searchResultCount.set(0);
  isSearchExhausted.set(false);
}

export function startSearch(items: ChatItem[], query: string) {
  resetSearch();
  if (!query.trim()) return;

  searchQuery.set(query);
  lastSearchedIndex = items.length; // Start from the end (most recent)
  findNext(items, query);
}

export function findNext(items: ChatItem[], query: string) {
  if (!query.trim()) return;

  const q = query.toLowerCase();

  // First check if we have more already-found results to navigate to
  if (currentResultPosition < foundResults.length - 1) {
    currentResultPosition++;
    searchResultIndex.set(foundResults[currentResultPosition]);
    return;
  }

  // Search backwards from lastSearchedIndex
  for (let i = lastSearchedIndex - 1; i >= 0; i--) {
    const item = items[i];
    if (item.type !== 'message') continue;

    const text = item.text.toLowerCase();
    if (text.includes(q)) {
      foundResults.push(i);
      currentResultPosition = foundResults.length - 1;
      lastSearchedIndex = i;
      searchResultIndex.set(i);
      searchResultCount.set(foundResults.length);
      return;
    }
  }

  // No more results found
  lastSearchedIndex = 0;
  isSearchExhausted.set(true);
}

export function findPrev(items: ChatItem[], query: string) {
  if (currentResultPosition > 0) {
    currentResultPosition--;
    searchResultIndex.set(foundResults[currentResultPosition]);
  }
}
