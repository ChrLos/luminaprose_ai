export interface SectionAnchor {
  editorTop: number;
  previewTop: number;
}

interface CachedAnchorsData {
  markdown: string;
  editorHeight: number;
  previewHeight: number;
  anchors: SectionAnchor[];
  timestamp: number;
}

let cachedAnchors: CachedAnchorsData | null = null;

/**
 * Explicitly invalidates the scroll sync geometry cache (e.g. after image loads, mermaid renders, or layout resize).
 */
export function invalidateSyncScrollCache(): void {
  cachedAnchors = null;
}

/**
 * Builds section-based sync anchors pairing Editor line tops with Preview DOM element tops.
 * Uses cached geometry unless markdown or element scroll heights change.
 */
export function buildSectionAnchors(
  editorEl: HTMLTextAreaElement,
  previewEl: HTMLDivElement,
  markdown: string
): SectionAnchor[] {
  const editorHeight = editorEl.scrollHeight;
  const previewHeight = previewEl.scrollHeight;
  const now = Date.now();

  if (
    cachedAnchors &&
    cachedAnchors.markdown === markdown &&
    cachedAnchors.editorHeight === editorHeight &&
    cachedAnchors.previewHeight === previewHeight &&
    now - cachedAnchors.timestamp < 2000
  ) {
    return cachedAnchors.anchors;
  }

  const editorMax = Math.max(0, editorEl.scrollHeight - editorEl.clientHeight);
  const previewMax = Math.max(0, previewEl.scrollHeight - previewEl.clientHeight);

  const lines = markdown ? markdown.split('\n') : [''];
  const totalLines = Math.max(1, lines.length);
  const editorScrollable = editorEl.scrollHeight;

  const headingLineIndices: number[] = [];
  let inCodeBlock = false;

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock) {
      if (trimmed.startsWith('#') || trimmed.startsWith('---')) {
        headingLineIndices.push(index);
      }
    }
  }

  const previewElements = Array.from(
    previewEl.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, hr')
  );

  const count = Math.min(headingLineIndices.length, previewElements.length);
  const previewRect = previewEl.getBoundingClientRect();
  const previewScrollTop = previewEl.scrollTop;

  const rawAnchors: SectionAnchor[] = [
    { editorTop: 0, previewTop: 0 }
  ];

  for (let i = 0; i < count; i++) {
    const lineIndex = headingLineIndices[i];
    const el = previewElements[i];

    const editorTop = (lineIndex / totalLines) * editorScrollable;
    const elRect = el.getBoundingClientRect();
    const previewTop = elRect.top - previewRect.top + previewScrollTop;

    rawAnchors.push({ editorTop, previewTop });
  }

  rawAnchors.push({ editorTop: editorMax, previewTop: previewMax });

  // Filter monotonic sequence so editorTop and previewTop are non-decreasing
  const anchors: SectionAnchor[] = [rawAnchors[0]];
  for (let i = 1; i < rawAnchors.length; i++) {
    const prev = anchors[anchors.length - 1];
    const curr = rawAnchors[i];

    if (curr.editorTop >= prev.editorTop && curr.previewTop >= prev.previewTop) {
      anchors.push(curr);
    }
  }

  const last = anchors[anchors.length - 1];
  if (last.editorTop < editorMax || last.previewTop < previewMax) {
    anchors.push({ editorTop: editorMax, previewTop: previewMax });
  }

  cachedAnchors = {
    markdown,
    editorHeight,
    previewHeight,
    anchors,
    timestamp: now,
  };

  return anchors;
}

/**
 * Binary searches anchors for lower and upper bounding intervals.
 */
function findAnchorInterval(
  anchors: SectionAnchor[],
  target: number,
  key: 'editorTop' | 'previewTop'
): [SectionAnchor, SectionAnchor] {
  let low = 0;
  let high = anchors.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (anchors[mid][key] <= target) {
      if (mid === anchors.length - 1 || anchors[mid + 1][key] > target) {
        return [anchors[mid], anchors[Math.min(anchors.length - 1, mid + 1)]];
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return [anchors[0], anchors[anchors.length - 1]];
}

let syncToPreviewRaf: number | null = null;
let syncToEditorRaf: number | null = null;

/**
 * Synchronizes Editor scroll position -> Preview scroll position.
 */
export function syncEditorToPreview(
  editorEl: HTMLTextAreaElement,
  previewEl: HTMLDivElement,
  markdown: string
): void {
  const editorMax = editorEl.scrollHeight - editorEl.clientHeight;
  const previewMax = previewEl.scrollHeight - previewEl.clientHeight;

  if (editorMax <= 0 || previewMax <= 0) return;

  const currentTop = editorEl.scrollTop;

  if (currentTop <= 0) {
    if (Math.abs(previewEl.scrollTop - 0) >= 1) {
      previewEl.scrollTop = 0;
    }
    return;
  }

  if (currentTop >= editorMax - 2) {
    if (Math.abs(previewEl.scrollTop - previewMax) >= 1) {
      previewEl.scrollTop = previewMax;
    }
    return;
  }

  const anchors = buildSectionAnchors(editorEl, previewEl, markdown);
  if (anchors.length === 0) return;

  const [lower, upper] = findAnchorInterval(anchors, currentTop, 'editorTop');

  const editorDistance = upper.editorTop - lower.editorTop;
  const progress = editorDistance > 0 ? (currentTop - lower.editorTop) / editorDistance : 0;
  const targetPreviewTop = Math.max(0, Math.min(previewMax, lower.previewTop + progress * (upper.previewTop - lower.previewTop)));

  if (Math.abs(previewEl.scrollTop - targetPreviewTop) >= 1) {
    if (syncToPreviewRaf !== null) {
      cancelAnimationFrame(syncToPreviewRaf);
    }
    syncToPreviewRaf = requestAnimationFrame(() => {
      previewEl.scrollTop = targetPreviewTop;
      syncToPreviewRaf = null;
    });
  }
}

/**
 * Synchronizes Preview scroll position -> Editor scroll position.
 */
export function syncPreviewToEditor(
  previewEl: HTMLDivElement,
  editorEl: HTMLTextAreaElement,
  markdown: string
): void {
  const previewMax = previewEl.scrollHeight - previewEl.clientHeight;
  const editorMax = editorEl.scrollHeight - editorEl.clientHeight;

  if (previewMax <= 0 || editorMax <= 0) return;

  const currentTop = previewEl.scrollTop;

  if (currentTop <= 0) {
    if (Math.abs(editorEl.scrollTop - 0) >= 1) {
      editorEl.scrollTop = 0;
    }
    return;
  }

  if (currentTop >= previewMax - 2) {
    if (Math.abs(editorEl.scrollTop - editorMax) >= 1) {
      editorEl.scrollTop = editorMax;
    }
    return;
  }

  const anchors = buildSectionAnchors(editorEl, previewEl, markdown);
  if (anchors.length === 0) return;

  const [lower, upper] = findAnchorInterval(anchors, currentTop, 'previewTop');

  const previewDistance = upper.previewTop - lower.previewTop;
  const progress = previewDistance > 0 ? (currentTop - lower.previewTop) / previewDistance : 0;
  const targetEditorTop = Math.max(0, Math.min(editorMax, lower.editorTop + progress * (upper.editorTop - lower.editorTop)));

  if (Math.abs(editorEl.scrollTop - targetEditorTop) >= 1) {
    if (syncToEditorRaf !== null) {
      cancelAnimationFrame(syncToEditorRaf);
    }
    syncToEditorRaf = requestAnimationFrame(() => {
      editorEl.scrollTop = targetEditorTop;
      syncToEditorRaf = null;
    });
  }
}
