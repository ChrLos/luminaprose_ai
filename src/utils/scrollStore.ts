interface DocScrollPosition {
  editorScrollTop: number;
  previewScrollTop: number;
  updatedAt: number;
}

const SCROLL_STORAGE_KEY = 'lumina_markdown_scroll_positions_v1';

// In-memory cache for ultra-fast synchronous lookup
let memoryScrollCache: Record<string, DocScrollPosition> | null = null;

function loadStorage(): Record<string, DocScrollPosition> {
  if (memoryScrollCache !== null) {
    return memoryScrollCache;
  }
  try {
    const raw = localStorage.getItem(SCROLL_STORAGE_KEY);
    if (raw) {
      memoryScrollCache = JSON.parse(raw);
      return memoryScrollCache || {};
    }
  } catch {
    // Ignore storage errors
  }
  memoryScrollCache = {};
  return memoryScrollCache;
}

function flushStorage() {
  if (!memoryScrollCache) return;
  try {
    // Prune entries if store exceeds 100 documents to prevent unbounded localStorage growth
    const entries = Object.entries(memoryScrollCache);
    if (entries.length > 100) {
      entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
      memoryScrollCache = Object.fromEntries(entries.slice(0, 80));
    }
    localStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(memoryScrollCache));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

let saveDebounceTimer: any = null;


/**
 * Retrieve saved scroll positions for a specific document ID.
 */
export function getDocScrollPosition(docId: string): { editorScrollTop: number; previewScrollTop: number } {
  if (!docId) return { editorScrollTop: 0, previewScrollTop: 0 };
  const store = loadStorage();
  const entry = store[docId];
  if (entry) {
    return {
      editorScrollTop: typeof entry.editorScrollTop === 'number' ? entry.editorScrollTop : 0,
      previewScrollTop: typeof entry.previewScrollTop === 'number' ? entry.previewScrollTop : 0,
    };
  }
  return { editorScrollTop: 0, previewScrollTop: 0 };
}

/**
 * Persist scroll positions for a specific document ID.
 */
export function saveDocScrollPosition(
  docId: string,
  positions: { editorScrollTop?: number; previewScrollTop?: number }
) {
  if (!docId) return;
  const store = loadStorage();
  const existing = store[docId] || { editorScrollTop: 0, previewScrollTop: 0, updatedAt: 0 };

  store[docId] = {
    editorScrollTop: positions.editorScrollTop !== undefined ? positions.editorScrollTop : existing.editorScrollTop,
    previewScrollTop: positions.previewScrollTop !== undefined ? positions.previewScrollTop : existing.previewScrollTop,
    updatedAt: Date.now(),
  };

  // Debounced write to localStorage to avoid thrashing
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    flushStorage();
  }, 300);
}
