import React, { useMemo, useRef } from 'react';
import { ThemeConfig } from '../types';

export interface MatchPosition {
  start: number;
  end: number;
  line: number;
  totalLines: number;
}

interface SearchMinimapRulerProps {
  matches: { start: number; end: number }[];
  currentMatchIndex: number;
  totalLength: number;
  text: string;
  onSelectMatch: (index: number) => void;
  theme: ThemeConfig;
}

/**
 * High-performance Visual Scrollbar Minimap Ruler.
 * Uses adaptive bucketing to render smooth visual density bars even with 10,000+ matches
 * without freezing the main thread or creating excessive DOM nodes.
 */
export const SearchMinimapRuler: React.FC<SearchMinimapRulerProps> = ({
  matches,
  currentMatchIndex,
  totalLength,
  onSelectMatch,
  theme,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  // Cluster and bucket markers if matches exceed 150 to keep DOM lean and 60fps fast
  const markerBars = useMemo(() => {
    if (!matches || matches.length === 0 || totalLength <= 0) return [];

    if (matches.length <= 120) {
      return matches.map((m, idx) => ({
        index: idx,
        topPercent: Math.max(0.5, Math.min(99.5, (m.start / totalLength) * 100)),
        isCurrent: idx === currentMatchIndex,
      }));
    }

    // Cluster into vertical percentage buckets
    const BUCKET_COUNT = 80;
    const buckets = new Map<number, { firstIdx: number; hasCurrent: boolean }>();

    for (let i = 0; i < matches.length; i++) {
      const pos = matches[i].start;
      const bucketIdx = Math.floor((pos / totalLength) * BUCKET_COUNT);
      const isCurr = i === currentMatchIndex;

      if (!buckets.has(bucketIdx)) {
        buckets.set(bucketIdx, { firstIdx: i, hasCurrent: isCurr });
      } else if (isCurr) {
        buckets.get(bucketIdx)!.hasCurrent = true;
        buckets.get(bucketIdx)!.firstIdx = i;
      }
    }

    const rendered: { index: number; topPercent: number; isCurrent: boolean }[] = [];
    buckets.forEach((val, bucketIdx) => {
      const topPercent = Math.max(0.5, Math.min(99.5, ((bucketIdx + 0.5) / BUCKET_COUNT) * 100));
      rendered.push({
        index: val.firstIdx,
        topPercent,
        isCurrent: val.hasCurrent,
      });
    });

    return rendered;
  }, [matches, currentMatchIndex, totalLength]);

  if (!matches || matches.length === 0 || totalLength <= 0) return null;

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    if (rect.height <= 0) return;

    const clickRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const targetCharPos = clickRatio * totalLength;

    // Binary search / fast find nearest match to clicked ratio
    let closestIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < matches.length; i++) {
      const diff = Math.abs(matches[i].start - targetCharPos);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      } else if (matches[i].start > targetCharPos && diff > minDiff) {
        // Since matches are ordered by position, we can break early once distance increases
        break;
      }
    }

    onSelectMatch(closestIdx);
  };

  return (
    <div
      ref={rulerRef}
      onClick={handleRulerClick}
      className="absolute top-0 right-0 bottom-0 w-3.5 z-30 pointer-events-auto cursor-pointer select-none border-l transition-colors"
      style={{
        backgroundColor: theme.category === 'dark' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.04)',
        borderColor: theme.border,
      }}
      title={`Search occurrence density: ${matches.length} matches. Click anywhere on ruler to jump.`}
    >
      {markerBars.map((m) => (
        <div
          key={m.index}
          onClick={(e) => {
            e.stopPropagation();
            onSelectMatch(m.index);
          }}
          className={`absolute left-0.5 right-0.5 rounded-xs transition-all ${
            m.isCurrent
              ? 'h-2 bg-amber-500 z-10 shadow-xs ring-1 ring-white/80'
              : 'h-1 bg-amber-500/70 hover:bg-amber-400 hover:h-1.5'
          }`}
          style={{
            top: `calc(${m.topPercent}% - ${m.isCurrent ? 4 : 2}px)`,
            backgroundColor: m.isCurrent ? theme.accent : undefined,
          }}
        />
      ))}
    </div>
  );
};

