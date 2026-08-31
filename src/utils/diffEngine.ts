import { DiffLine, AlignedDiffRow, DiffDisplayItem } from '../types';

/**
 * Standard Myers Diff Algorithm (O(ND) time & memory) with common prefix and suffix pruning.
 */
function myersDiff(a: string[], b: string[], prefixOffset: number): DiffLine[] {
  const n = a.length;
  const m = b.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) {
    return b.map((line, idx) => ({
      type: 'added',
      line,
      newLineNum: prefixOffset + idx + 1,
    }));
  }
  if (m === 0) {
    return a.map((line, idx) => ({
      type: 'removed',
      line,
      oldLineNum: prefixOffset + idx + 1,
    }));
  }

  const max = n + m;
  const vSize = 2 * max + 1;
  const v = new Int32Array(vSize);
  const trace: Int32Array[] = [];

  // Diagonals range from -max to max. Offset by max so index >= 0.
  const offset = max;
  v[offset + 1] = 0;

  let foundD = -1;
  for (let d = 0; d <= max; d++) {
    const vCopy = new Int32Array(v);
    trace.push(vCopy);

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) {
        x = v[offset + k + 1];
      } else {
        x = v[offset + k - 1] + 1;
      }

      let y = x - k;

      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }

      v[offset + k] = x;

      if (x >= n && y >= m) {
        foundD = d;
        break;
      }
    }

    if (foundD !== -1) break;
  }

  // Backtrack through trace to generate the edit script
  const script: { type: 'unchanged' | 'added' | 'removed'; aIdx?: number; bIdx?: number }[] = [];
  let x = n;
  let y = m;

  for (let d = foundD; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    let prevK: number;

    if (k === -d || (k !== d && vPrev[offset + k - 1] < vPrev[offset + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = vPrev[offset + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      x--;
      y--;
      script.unshift({ type: 'unchanged', aIdx: x, bIdx: y });
    }

    if (x === prevX) {
      y--;
      script.unshift({ type: 'added', bIdx: y });
    } else {
      x--;
      script.unshift({ type: 'removed', aIdx: x });
    }
  }

  while (x > 0 && y > 0) {
    x--;
    y--;
    script.unshift({ type: 'unchanged', aIdx: x, bIdx: y });
  }

  let oldLineCounter = prefixOffset + 1;
  let newLineCounter = prefixOffset + 1;
  const result: DiffLine[] = [];

  for (const item of script) {
    if (item.type === 'unchanged') {
      result.push({
        type: 'unchanged',
        line: a[item.aIdx!],
        oldLineNum: oldLineCounter++,
        newLineNum: newLineCounter++,
      });
    } else if (item.type === 'added') {
      result.push({
        type: 'added',
        line: b[item.bIdx!],
        newLineNum: newLineCounter++,
      });
    } else {
      result.push({
        type: 'removed',
        line: a[item.aIdx!],
        oldLineNum: oldLineCounter++,
      });
    }
  }

  return result;
}

/**
 * High-performance Myers Line Diff Algorithm with common prefix and suffix pruning.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const N = oldLines.length;
  const M = newLines.length;

  let prefix = 0;
  while (prefix < N && prefix < M && oldLines[prefix] === newLines[prefix]) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < N - prefix &&
    suffix < M - prefix &&
    oldLines[N - 1 - suffix] === newLines[M - 1 - suffix]
  ) {
    suffix++;
  }

  const trimmedOld = oldLines.slice(prefix, N - suffix);
  const trimmedNew = newLines.slice(prefix, M - suffix);

  const middleDiff = myersDiff(trimmedOld, trimmedNew, prefix);

  const result: DiffLine[] = [];

  for (let p = 0; p < prefix; p++) {
    result.push({
      type: 'unchanged',
      line: oldLines[p],
      oldLineNum: p + 1,
      newLineNum: p + 1,
    });
  }

  result.push(...middleDiff);

  const suffixOldStart = N - suffix;
  const suffixNewStart = M - suffix;
  for (let s = 0; s < suffix; s++) {
    result.push({
      type: 'unchanged',
      line: oldLines[suffixOldStart + s],
      oldLineNum: suffixOldStart + s + 1,
      newLineNum: suffixNewStart + s + 1,
    });
  }

  return result;
}

/**
 * Computes aligned side-by-side diff rows for dual-pane comparison
 */
export function computeAlignedDiff(currentText: string, snapshotText: string): {
  rows: AlignedDiffRow[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
} {
  const diff = computeLineDiff(currentText, snapshotText);
  const rows: AlignedDiffRow[] = [];

  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  let i = 0;
  while (i < diff.length) {
    const item = diff[i];

    if (item.type === 'unchanged') {
      unchangedCount++;
      rows.push({
        oldLineNum: item.oldLineNum,
        oldContent: item.line,
        oldType: 'unchanged',
        newLineNum: item.newLineNum,
        newContent: item.line,
        newType: 'unchanged',
      });
      i++;
    } else if (item.type === 'removed') {
      const removedBlock: DiffLine[] = [];
      while (i < diff.length && diff[i].type === 'removed') {
        removedBlock.push(diff[i]);
        removedCount++;
        i++;
      }

      const addedBlock: DiffLine[] = [];
      while (i < diff.length && diff[i].type === 'added') {
        addedBlock.push(diff[i]);
        addedCount++;
        i++;
      }

      const maxLen = Math.max(removedBlock.length, addedBlock.length);
      for (let k = 0; k < maxLen; k++) {
        const rem = removedBlock[k];
        const add = addedBlock[k];

        rows.push({
          oldLineNum: rem?.oldLineNum,
          oldContent: rem?.line,
          oldType: rem ? 'removed' : 'empty',
          newLineNum: add?.newLineNum,
          newContent: add?.line,
          newType: add ? 'added' : 'empty',
        });
      }
    } else if (item.type === 'added') {
      addedCount++;
      rows.push({
        oldLineNum: undefined,
        oldContent: undefined,
        oldType: 'empty',
        newLineNum: item.newLineNum,
        newContent: item.line,
        newType: 'added',
      });
      i++;
    }
  }

  return { rows, addedCount, removedCount, unchangedCount };
}

/**
 * Folds large runs of unchanged lines to show compact, readable diffs with expand toggles
 */
export function buildFoldedDiffItems(
  diffLines: DiffLine[],
  expandedFolds: Set<string>,
  contextRadius: number = 3
): DiffDisplayItem[] {
  const items: DiffDisplayItem[] = [];
  const total = diffLines.length;
  let i = 0;

  while (i < total) {
    if (diffLines[i].type !== 'unchanged') {
      items.push({ type: 'line', data: diffLines[i], index: i });
      i++;
      continue;
    }

    // Found an unchanged run
    const runStart = i;
    while (i < total && diffLines[i].type === 'unchanged') {
      i++;
    }
    const runEnd = i;
    const runLength = runEnd - runStart;

    const isStartOfFile = runStart === 0;
    const isEndOfFile = runEnd === total;

    const keepBefore = isStartOfFile ? 0 : contextRadius;
    const keepAfter = isEndOfFile ? 0 : contextRadius;

    if (runLength > keepBefore + keepAfter + 4) {
      // Keep before
      for (let k = 0; k < keepBefore; k++) {
        items.push({ type: 'line', data: diffLines[runStart + k], index: runStart + k });
      }

      const foldStart = runStart + keepBefore;
      const foldEnd = runEnd - keepAfter;
      const foldCount = foldEnd - foldStart;
      const foldId = `fold-${foldStart}-${foldEnd}`;

      if (expandedFolds.has(foldId)) {
        for (let k = foldStart; k < foldEnd; k++) {
          items.push({ type: 'line', data: diffLines[k], index: k });
        }
      } else {
        items.push({
          type: 'fold',
          count: foldCount,
          startIdx: foldStart,
          endIdx: foldEnd,
          id: foldId,
        });
      }

      // Keep after
      for (let k = 0; k < keepAfter; k++) {
        const idx = foldEnd + k;
        items.push({ type: 'line', data: diffLines[idx], index: idx });
      }
    } else {
      // Small run, just display all
      for (let k = runStart; k < runEnd; k++) {
        items.push({ type: 'line', data: diffLines[k], index: k });
      }
    }
  }

  return items;
}
