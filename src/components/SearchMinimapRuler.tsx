import React, { useCallback, useRef } from 'react';
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
 * Visual Scrollbar Minimap Ruler showing document-wide search occurrence density
 * and allowing direct interactive clicking to jump to any match.
 */
export const SearchMinimapRuler: React.FC<SearchMinimapRulerProps> = ({
  matches,
  currentMatchIndex,
  totalLength,
  text,
  onSelectMatch,
  theme,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  if (matches.length === 0 || totalLength === 0) return null;

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const targetCharPos = clickRatio * totalLength;

    // Find nearest match to clicked ratio
    let closestIdx = 0;
    let minDiff = Infinity;
    matches.forEach((m, idx) => {
      const diff = Math.abs(m.start - targetCharPos);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

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
      {matches.map((m, idx) => {
        const topPercent = Math.max(0.5, Math.min(99.5, (m.start / totalLength) * 100));
        const isCurrent = idx === currentMatchIndex;

        return (
          <div
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMatch(idx);
            }}
            className={`absolute left-0.5 right-0.5 rounded-xs transition-all ${
              isCurrent
                ? 'h-2 bg-amber-500 z-10 shadow-xs ring-1 ring-white/80'
                : 'h-1 bg-amber-500/70 hover:bg-amber-400 hover:h-1.5'
            }`}
            style={{
              top: `calc(${topPercent}% - ${isCurrent ? 4 : 2}px)`,
              backgroundColor: isCurrent ? theme.accent : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
