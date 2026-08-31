import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Columns,
  List,
  RotateCcw,
  Check,
} from 'lucide-react';
import { DocumentItem, ThemeConfig, DocumentSnapshot } from '../types';
import { useFocusTrap } from '../utils/useFocusTrap';
import { computeAlignedDiff } from '../utils/diffEngine';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoc: DocumentItem;
  snapshot: DocumentSnapshot | null;
  onRestore: (content: string) => void;
  theme: ThemeConfig;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  currentDoc,
  snapshot,
  onRestore,
  theme,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const unifiedPaneRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);

  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  const diffData = useMemo(() => {
    if (!snapshot) return { rows: [], addedCount: 0, removedCount: 0, unchangedCount: 0 };
    return computeAlignedDiff(currentDoc.content, snapshot.content);
  }, [currentDoc.content, snapshot]);

  // Synchronized scrolling between left and right split panes
  const handleScrollLeft = () => {
    if (isSyncingScrollRef.current || !leftPaneRef.current || !rightPaneRef.current) return;
    isSyncingScrollRef.current = true;
    rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
    rightPaneRef.current.scrollLeft = leftPaneRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const handleScrollRight = () => {
    if (isSyncingScrollRef.current || !leftPaneRef.current || !rightPaneRef.current) return;
    isSyncingScrollRef.current = true;
    leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
    leftPaneRef.current.scrollLeft = rightPaneRef.current.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const handleRestoreSnapshot = () => {
    if (!snapshot) return;
    onRestore(snapshot.content);
    setRestoreSuccess(true);
    setTimeout(() => {
      setRestoreSuccess(false);
      onClose();
    }, 1200);
  };

  if (!isOpen || !snapshot) return null;

  const isDark = theme.category === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Side-by-Side Version Diff"
        className="relative w-full max-w-6xl h-[90vh] rounded-2xl border shadow-2xl flex flex-col z-10 overflow-hidden select-none animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Top Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0 gap-4"
          style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="p-2 rounded-xl border shrink-0"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
            >
              <Columns className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base leading-tight truncate">Side-by-Side Version Comparison</h2>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0"
                  style={{ borderColor: theme.accent, color: theme.accent }}
                >
                  {snapshot.type === 'manual' ? 'Checkpoint' : 'Auto-Save'}
                </span>
              </div>
              <p className="text-xs opacity-60 truncate mt-0.5">
                Current Version vs. <span className="font-semibold text-amber-600 dark:text-amber-400">{snapshot.label || snapshot.title}</span> ({new Date(snapshot.timestamp).toLocaleString()})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div
              className="hidden sm:flex items-center p-0.5 rounded-lg border text-xs"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
            >
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  viewMode === 'split' ? 'bg-amber-500 text-white font-bold shadow-2xs' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  viewMode === 'unified' ? 'bg-amber-500 text-white font-bold shadow-2xs' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Unified</span>
              </button>
            </div>

            {/* Restore Action Button */}
            {restoreSuccess ? (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                <Check className="w-4 h-4" />
                <span>Restored!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRestoreSnapshot}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: theme.accent, color: isDark ? '#000000' : '#ffffff' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Revision</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border opacity-70 hover:opacity-100 transition-opacity cursor-pointer ml-1"
              style={{ borderColor: theme.border }}
              title="Close (Escape)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Statistics Sub-header */}
        <div
          className="px-6 py-2.5 border-b flex items-center justify-between text-xs shrink-0 select-none"
          style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
        >
          <div className="flex items-center gap-3">
            <span className="font-medium opacity-75">Summary:</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
              +{diffData.addedCount} additions
            </span>
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono font-semibold">
              -{diffData.removedCount} deletions
            </span>
            <span className="opacity-50 font-mono">
              {diffData.unchangedCount} matching lines
            </span>
          </div>

          <div className="text-[11px] opacity-60 font-sans hidden sm:block">
            Left: Current document • Right: Historical revision
          </div>
        </div>

        {/* Diff Comparison Content Body */}
        {viewMode === 'split' ? (
          <div className="flex-1 flex overflow-hidden font-mono text-[12px] leading-relaxed">
            {/* Left Pane: Current Version */}
            <div
              ref={leftPaneRef}
              onScroll={handleScrollLeft}
              className="w-1/2 h-full overflow-auto border-r select-text"
              style={{ borderColor: theme.border, backgroundColor: theme.bg }}
            >
              <div
                className="sticky top-0 z-10 px-4 py-2 border-b font-sans text-xs font-semibold uppercase tracking-wider flex items-center justify-between opacity-80"
                style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
              >
                <span>Current Version</span>
                <span className="font-mono text-[10px] lowercase font-normal opacity-60">
                  {currentDoc.content.split('\n').length} lines
                </span>
              </div>

              <div className="py-2">
                {diffData.rows.map((row, idx) => {
                  let rowStyle = 'hover:bg-stone-500/5';
                  if (row.oldType === 'removed') {
                    rowStyle = isDark
                      ? 'bg-rose-950/40 text-rose-200 border-l-2 border-rose-500'
                      : 'bg-[#fce8e6] text-[#9f1239] border-l-2 border-[#f43f5e]';
                  } else if (row.oldType === 'empty') {
                    rowStyle = isDark ? 'bg-stone-900/30 opacity-20 select-none' : 'bg-stone-200/40 opacity-30 select-none';
                  }

                  return (
                    <div
                      key={`left-${idx}`}
                      className={`flex items-start px-3 py-0.5 min-h-[22px] transition-colors ${rowStyle}`}
                    >
                      <span className="w-10 text-right pr-2 shrink-0 select-none opacity-40 text-[11px]">
                        {row.oldLineNum !== undefined ? row.oldLineNum : ''}
                      </span>
                      <span className="w-4 text-center shrink-0 select-none font-bold text-[11px] opacity-70">
                        {row.oldType === 'removed' ? '-' : ''}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-words pl-1 font-mono">
                        {row.oldContent !== undefined ? row.oldContent : ' '}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Selected Historical Snapshot */}
            <div
              ref={rightPaneRef}
              onScroll={handleScrollRight}
              className="w-1/2 h-full overflow-auto select-text"
              style={{ backgroundColor: theme.bg }}
            >
              <div
                className="sticky top-0 z-10 px-4 py-2 border-b font-sans text-xs font-semibold uppercase tracking-wider flex items-center justify-between opacity-80"
                style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
              >
                <div className="flex items-center gap-2">
                  <span>Revision: {snapshot.label || snapshot.title}</span>
                </div>
                <span className="font-mono text-[10px] lowercase font-normal opacity-60">
                  {snapshot.content.split('\n').length} lines
                </span>
              </div>

              <div className="py-2">
                {diffData.rows.map((row, idx) => {
                  let rowStyle = 'hover:bg-stone-500/5';
                  if (row.newType === 'added') {
                    rowStyle = isDark
                      ? 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500'
                      : 'bg-[#e6f4ea] text-[#065f46] border-l-2 border-[#10b981]';
                  } else if (row.newType === 'empty') {
                    rowStyle = isDark ? 'bg-stone-900/30 opacity-20 select-none' : 'bg-stone-200/40 opacity-30 select-none';
                  }

                  return (
                    <div
                      key={`right-${idx}`}
                      className={`flex items-start px-3 py-0.5 min-h-[22px] transition-colors ${rowStyle}`}
                    >
                      <span className="w-10 text-right pr-2 shrink-0 select-none opacity-40 text-[11px]">
                        {row.newLineNum !== undefined ? row.newLineNum : ''}
                      </span>
                      <span className="w-4 text-center shrink-0 select-none font-bold text-[11px] opacity-70">
                        {row.newType === 'added' ? '+' : ''}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-words pl-1 font-mono">
                        {row.newContent !== undefined ? row.newContent : ' '}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Unified Diff View */
          <div
            ref={unifiedPaneRef}
            className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed select-text"
            style={{ backgroundColor: theme.bg }}
          >
            <div className="space-y-0.5 max-w-5xl mx-auto">
              {diffData.rows.map((row, idx) => {
                if (row.oldType === 'removed') {
                  return (
                    <div
                      key={`u-rem-${idx}`}
                      className={`px-3 py-0.5 rounded-2xs flex items-start gap-2 whitespace-pre-wrap break-words ${
                        isDark
                          ? 'bg-rose-950/40 text-rose-200 border-l-2 border-rose-500'
                          : 'bg-[#fce8e6] text-[#9f1239] border-l-2 border-[#f43f5e]'
                      }`}
                    >
                      <span className="w-8 text-right pr-1 shrink-0 select-none opacity-40 text-[10px]">
                        {row.oldLineNum}
                      </span>
                      <span className="w-8 text-right pr-1 shrink-0 select-none opacity-40 text-[10px]">
                        {' '}
                      </span>
                      <span className="w-3 shrink-0 select-none font-bold text-[11px] text-rose-500">
                        -
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-words">{row.oldContent}</span>
                    </div>
                  );
                }

                if (row.newType === 'added') {
                  return (
                    <div
                      key={`u-add-${idx}`}
                      className={`px-3 py-0.5 rounded-2xs flex items-start gap-2 whitespace-pre-wrap break-words ${
                        isDark
                          ? 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500'
                          : 'bg-[#e6f4ea] text-[#065f46] border-l-2 border-[#10b981]'
                      }`}
                    >
                      <span className="w-8 text-right pr-1 shrink-0 select-none opacity-40 text-[10px]">
                        {' '}
                      </span>
                      <span className="w-8 text-right pr-1 shrink-0 select-none opacity-40 text-[10px]">
                        {row.newLineNum}
                      </span>
                      <span className="w-3 shrink-0 select-none font-bold text-[11px] text-emerald-500">
                        +
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-words">{row.newContent}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={`u-unc-${idx}`}
                    className="px-3 py-0.5 flex items-start gap-2 whitespace-pre-wrap break-words opacity-80 hover:opacity-100"
                  >
                    <span className="w-8 text-right pr-1 shrink-0 select-none opacity-40 text-[10px]">
                      {row.oldLineNum}
                    </span>
                    <span className="w-8 text-right pr-1 shrink-0 select-none opacity-40 text-[10px]">
                      {row.newLineNum}
                    </span>
                    <span className="w-3 shrink-0 select-none text-[11px] opacity-30">
                      {' '}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-words">{row.newContent}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
