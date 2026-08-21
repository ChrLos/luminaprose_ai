import React, { useEffect, useRef } from 'react';
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Replace, 
  CaseSensitive, 
  WholeWord, 
  ChevronRight,
  Sparkles,
  MapPin
} from 'lucide-react';
import { ThemeConfig } from '../types';

interface FindReplaceBarProps {
  isOpen: boolean;
  showReplace: boolean;
  onToggleShowReplace: () => void;
  onClose: () => void;
  theme: ThemeConfig;
  findQuery: string;
  onFindQueryChange: (q: string) => void;
  replaceQuery: string;
  onReplaceQueryChange: (r: string) => void;
  matchCase: boolean;
  onToggleMatchCase: () => void;
  matchWholeWord: boolean;
  onToggleWholeWord: () => void;
  currentMatchIndex: number;
  totalMatches: number;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  matches?: { start: number; end: number }[];
  totalLength?: number;
  onSelectMatch?: (index: number) => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  showReplace,
  onToggleShowReplace,
  onClose,
  theme,
  findQuery,
  onFindQueryChange,
  replaceQuery,
  onReplaceQueryChange,
  matchCase,
  onToggleMatchCase,
  matchWholeWord,
  onToggleWholeWord,
  currentMatchIndex,
  totalMatches,
  onFindNext,
  onFindPrev,
  onReplaceCurrent,
  onReplaceAll,
  matches = [],
  totalLength = 0,
  onSelectMatch,
}) => {
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus find input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDownFind = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFindPrev();
      } else {
        onFindNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleKeyDownReplace = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        onReplaceAll();
      } else {
        onReplaceCurrent();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      className="absolute top-2 right-4 z-40 p-2.5 rounded-xl border shadow-2xl flex flex-col gap-2 transition-all select-none animate-in fade-in slide-in-from-top-2 duration-150 max-w-md w-[calc(100%-2rem)] sm:w-96 text-xs"
      style={{
        backgroundColor: theme.bgElevated,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      {/* Row 1: Find Input & Controls */}
      <div className="flex items-center gap-1.5">
        {/* Toggle Replace Expand */}
        <button
          type="button"
          onClick={onToggleShowReplace}
          className={`p-1.5 rounded-md hover:bg-stone-500/10 transition-transform cursor-pointer ${
            showReplace ? 'rotate-90 text-amber-600 dark:text-amber-400' : 'opacity-70'
          }`}
          title={showReplace ? 'Hide Replace' : 'Show Replace'}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Find Input Field */}
        <div 
          className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border focus-within:ring-1 focus-within:ring-amber-500"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.bgSecondary,
          }}
        >
          <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find in document..."
            value={findQuery}
            onChange={(e) => onFindQueryChange(e.target.value)}
            onKeyDown={handleKeyDownFind}
            className="flex-1 bg-transparent border-none outline-hidden text-xs min-w-0"
            style={{ color: theme.text }}
          />

          {/* Matches Counter */}
          {findQuery ? (
            <span className="text-[10px] font-mono opacity-75 shrink-0 px-1">
              {totalMatches > 0 ? `${currentMatchIndex} of ${totalMatches}` : '0 results'}
            </span>
          ) : null}
        </div>

        {/* Match Case Option */}
        <button
          type="button"
          onClick={onToggleMatchCase}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            matchCase ? 'bg-amber-500/20 border-amber-500 text-amber-600 font-bold' : 'opacity-70 hover:opacity-100'
          }`}
          style={{ borderColor: matchCase ? theme.accent : theme.border }}
          title="Match Case (Aa)"
        >
          <CaseSensitive className="w-3.5 h-3.5" />
        </button>

        {/* Match Whole Word Option */}
        <button
          type="button"
          onClick={onToggleWholeWord}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            matchWholeWord ? 'bg-amber-500/20 border-amber-500 text-amber-600 font-bold' : 'opacity-70 hover:opacity-100'
          }`}
          style={{ borderColor: matchWholeWord ? theme.accent : theme.border }}
          title="Match Whole Word"
        >
          <WholeWord className="w-3.5 h-3.5" />
        </button>

        {/* Prev / Next Navigation */}
        <button
          type="button"
          onClick={onFindPrev}
          disabled={totalMatches === 0}
          className="p-1.5 rounded-md border hover:bg-stone-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ borderColor: theme.border }}
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onFindNext}
          disabled={totalMatches === 0}
          className="p-1.5 rounded-md border hover:bg-stone-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ borderColor: theme.border }}
          title="Next Match (Enter)"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Close Bar */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer opacity-75 hover:opacity-100"
          title="Close (Escape)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Occurrence Density Bar Indicator */}
      {findQuery && totalMatches > 0 && totalLength > 0 && (
        <div 
          className="px-2 py-1 rounded-md border flex items-center justify-between gap-2 text-[10px] select-none"
          style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
        >
          <div className="flex items-center gap-1.5 opacity-70">
            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Document Map:</span>
          </div>

          <div 
            className="flex-1 h-2 rounded-full relative overflow-hidden border cursor-pointer"
            style={{ backgroundColor: theme.bg, borderColor: theme.border }}
            onClick={(e) => {
              if (!onSelectMatch || matches.length === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const targetChar = ratio * totalLength;
              let closest = 0;
              let minDiff = Infinity;
              matches.forEach((m, i) => {
                const diff = Math.abs(m.start - targetChar);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = i;
                }
              });
              onSelectMatch(closest);
            }}
            title="Click to jump to match position"
          >
            {matches.map((m, i) => {
              const posPercent = (m.start / totalLength) * 100;
              const isCurrent = i === currentMatchIndex - 1;
              return (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 ${
                    isCurrent ? 'w-2 bg-amber-500 z-10 ring-1 ring-amber-300' : 'w-1 bg-amber-500/60'
                  }`}
                  style={{ left: `${posPercent}%` }}
                />
              );
            })}
          </div>

          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
            {totalMatches} {totalMatches === 1 ? 'match' : 'matches'}
          </span>
        </div>
      )}

      {/* Row 2: Replace Input & Action Buttons (if expanded) */}
      {showReplace && (
        <div className="flex items-center gap-1.5 pt-1 border-t animate-in fade-in duration-100" style={{ borderColor: theme.border }}>
          {/* Spacer aligning with row 1 Chevron */}
          <div className="w-6.5 shrink-0" />

          {/* Replace Input */}
          <div 
            className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border focus-within:ring-1 focus-within:ring-amber-500"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgSecondary,
            }}
          >
            <Replace className="w-3.5 h-3.5 opacity-50 shrink-0" />
            <input
              ref={replaceInputRef}
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => onReplaceQueryChange(e.target.value)}
              onKeyDown={handleKeyDownReplace}
              className="flex-1 bg-transparent border-none outline-hidden text-xs min-w-0"
              style={{ color: theme.text }}
            />
          </div>

          {/* Replace Single */}
          <button
            type="button"
            onClick={onReplaceCurrent}
            disabled={totalMatches === 0}
            className="px-2.5 py-1.5 rounded-lg border font-medium text-[11px] hover:bg-stone-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap"
            style={{ borderColor: theme.border }}
            title="Replace current match"
          >
            Replace
          </button>

          {/* Replace All */}
          <button
            type="button"
            onClick={onReplaceAll}
            disabled={totalMatches === 0}
            className="px-2.5 py-1.5 rounded-lg font-medium text-[11px] text-white shadow-2xs hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-opacity whitespace-nowrap"
            style={{ backgroundColor: theme.accent }}
            title="Replace all occurrences (Ctrl+Alt+Enter)"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};
