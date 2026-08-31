import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  X,
  Plus,
  RotateCcw,
  Trash2,
  Clock,
  Check,
  Eye,
  FileCode,
  Info,
  Columns,
} from 'lucide-react';
import { DocumentItem, ThemeConfig, DocumentSnapshot, DiffLine, DiffDisplayItem } from '../types';
import { VirtualList } from './VirtualList';
import { useFocusTrap } from '../utils/useFocusTrap';
import { DiffModal } from './DiffModal';
import { computeLineDiff } from '../utils/diffEngine';
import { getContrastingTextColor } from '../utils/colorUtils';

const SNAPSHOTS_STORAGE_KEY = 'lumina_markdown_snapshots_v1';

// Fold helper with 5 lines context before/after
const getFoldedDiffItems = (
  fullDiff: DiffLine[],
  expandedFolds: Record<string, boolean>,
  contextLines = 5
): DiffDisplayItem[] => {
  const total = fullDiff.length;
  if (total === 0) return [];

  const hasChanges = fullDiff.some((d) => d.type !== 'unchanged');
  if (!hasChanges) {
    if (total <= 15) {
      return fullDiff.map((data, index) => ({ type: 'line', data, index }));
    }
    const foldId = `fold-0-${total - 1}`;
    if (expandedFolds[foldId]) {
      return fullDiff.map((data, index) => ({ type: 'line', data, index }));
    }
    return [
      ...fullDiff.slice(0, 3).map((data, index) => ({ type: 'line' as const, data, index })),
      { type: 'fold' as const, count: total - 6, startIdx: 3, endIdx: total - 4, id: foldId },
      ...fullDiff.slice(total - 3).map((data, index) => ({ type: 'line' as const, data, index: total - 3 + index })),
    ];
  }

  const visible = new Array<boolean>(total).fill(false);

  for (let i = 0; i < total; i++) {
    if (fullDiff[i].type !== 'unchanged') {
      const start = Math.max(0, i - contextLines);
      const end = Math.min(total - 1, i + contextLines);
      for (let k = start; k <= end; k++) {
        visible[k] = true;
      }
    }
  }

  const items: DiffDisplayItem[] = [];
  let i = 0;

  while (i < total) {
    if (visible[i]) {
      items.push({ type: 'line', data: fullDiff[i], index: i });
      i++;
    } else {
      const foldStart = i;
      while (i < total && !visible[i]) {
        i++;
      }
      const foldEnd = i - 1;
      const count = foldEnd - foldStart + 1;
      const foldId = `fold-${foldStart}-${foldEnd}`;

      if (expandedFolds[foldId] || count <= 2) {
        for (let k = foldStart; k <= foldEnd; k++) {
          items.push({ type: 'line', data: fullDiff[k], index: k });
        }
      } else {
        items.push({
          type: 'fold',
          count,
          startIdx: foldStart,
          endIdx: foldEnd,
          id: foldId,
        });
      }
    }
  }

  return items;
};

export interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoc: DocumentItem;
  onRestoreContent: (newContent: string) => void;
  theme: ThemeConfig;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  currentDoc,
  onRestoreContent,
  theme,
}) => {
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showDiffView, setShowDiffView] = useState(true);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [expandedFolds, setExpandedFolds] = useState<Record<string, boolean>>({});
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const drawerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  // Sync / Persist Snapshots to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
    } catch {}
  }, [snapshots]);

  // Reset expanded folds when selecting a different snapshot
  useEffect(() => {
    setExpandedFolds({});
  }, [selectedSnapshotId]);

  // Auto-Snapshot trigger: create an auto snapshot if no snapshot exists for current doc or last snapshot is older than 3 mins
  useEffect(() => {
    if (!currentDoc || !currentDoc.content) return;

    const docSnapshots = snapshots.filter((s) => s.docId === currentDoc.id);
    const lastSnapshot = docSnapshots[0]; // newest first
    const now = Date.now();

    if (!lastSnapshot || (now - lastSnapshot.timestamp > 180000 && lastSnapshot.content !== currentDoc.content)) {
      const words = currentDoc.content.trim().split(/\s+/).filter(Boolean).length;
      const autoSnap: DocumentSnapshot = {
        id: 'snap-' + Date.now(),
        docId: currentDoc.id,
        timestamp: now,
        title: currentDoc.title,
        content: currentDoc.content,
        type: 'auto',
        label: 'Auto-Save Revision',
        wordCount: words,
      };

      setSnapshots((prev) => {
        const filtered = prev.filter((s) => s.docId !== currentDoc.id || s.type === 'manual');
        const autoDocs = prev.filter((s) => s.docId === currentDoc.id && s.type === 'auto');
        const trimmedAuto = autoDocs.slice(0, 15);
        return [autoSnap, ...filtered, ...trimmedAuto];
      });
    }
  }, [currentDoc.id, currentDoc.content, currentDoc.title]);

  // Filter snapshots for active document
  const currentDocSnapshots = useMemo(() => {
    return snapshots
      .filter((s) => s.docId === currentDoc.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [snapshots, currentDoc.id]);

  const selectedSnapshot = useMemo(() => {
    return currentDocSnapshots.find((s) => s.id === selectedSnapshotId) || currentDocSnapshots[0];
  }, [currentDocSnapshots, selectedSnapshotId]);

  // Create Manual Snapshot
  const handleCreateManualSnapshot = () => {
    const label = newLabelInput.trim() || `Manual Checkpoint ${currentDocSnapshots.filter((s) => s.type === 'manual').length + 1}`;
    const words = currentDoc.content.trim().split(/\s+/).filter(Boolean).length;

    const newSnap: DocumentSnapshot = {
      id: 'snap-' + Date.now(),
      docId: currentDoc.id,
      timestamp: Date.now(),
      title: currentDoc.title,
      content: currentDoc.content,
      type: 'manual',
      label,
      wordCount: words,
    };

    setSnapshots((prev) => [newSnap, ...prev]);
    setSelectedSnapshotId(newSnap.id);
    setNewLabelInput('');
    setIsCreating(false);
  };

  // Delete Snapshot
  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    if (selectedSnapshotId === id) {
      setSelectedSnapshotId(null);
    }
  };

  // Restore Revision
  const handleRestore = () => {
    if (!selectedSnapshot) return;

    // First create a safety snapshot of current state before overwrite
    const currentWords = currentDoc.content.trim().split(/\s+/).filter(Boolean).length;
    const safetySnap: DocumentSnapshot = {
      id: 'snap-' + Date.now(),
      docId: currentDoc.id,
      timestamp: Date.now(),
      title: currentDoc.title,
      content: currentDoc.content,
      type: 'manual',
      label: 'Pre-Restore Safety Backup',
      wordCount: currentWords,
    };

    setSnapshots((prev) => [safetySnap, ...prev]);
    onRestoreContent(selectedSnapshot.content);
    setRestoreSuccess(true);
    setTimeout(() => setRestoreSuccess(false), 2500);
  };

  // Compute LCS Line Diff
  const lineDiff = useMemo(() => {
    return selectedSnapshot
      ? computeLineDiff(currentDoc.content, selectedSnapshot.content)
      : [];
  }, [selectedSnapshot, currentDoc.content]);

  const foldedDiffItems = useMemo(() => {
    return getFoldedDiffItems(lineDiff, expandedFolds, 5);
  }, [lineDiff, expandedFolds]);

  const autoSnapshotsCount = currentDocSnapshots.filter((s) => s.type === 'auto').length;

  if (!isOpen) return null;

  const accentTextColor = getContrastingTextColor(theme.accent);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <style>{`
        .custom-vhd-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-vhd-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-vhd-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme.category === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)'};
          border-radius: 4px;
        }
        .custom-vhd-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme.category === 'dark' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.4)'};
        }
      `}</style>
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={drawerRef}
        className="relative w-full max-w-xl sm:max-w-2xl h-full border-l shadow-2xl flex flex-col z-10 select-none animate-in slide-in-from-right duration-200"
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
          color: theme.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Version History & Snapshots"
      >
        {/* Header Bar */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
              <History className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-tight">Version History & Snapshots</h2>
              <p className="text-xs opacity-60 truncate max-w-[280px] sm:max-w-sm mt-0.5">
                {currentDoc.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ borderColor: theme.border }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar: Create Manual Snapshot */}
        <div
          className="px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        >
          {isCreating ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateManualSnapshot();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                placeholder="Checkpoint label (e.g. Before Rewrite)..."
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border outline-none shadow-xs"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.accent,
                  color: theme.text,
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateManualSnapshot}
                className="px-3.5 py-1.5 text-xs font-bold rounded-md shadow-xs cursor-pointer shrink-0 transition-opacity hover:opacity-90"
                style={{ backgroundColor: theme.accent, color: accentTextColor }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-2.5 py-1.5 text-xs font-semibold opacity-80 hover:opacity-100 cursor-pointer shrink-0"
                style={{ color: theme.text }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Auto-Saves Counter & Info Tooltip */}
              <div
                className="relative group flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-help select-none shrink-0"
                style={{ backgroundColor: theme.bgElevated, borderColor: theme.border }}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-medium text-[11px]">
                  Auto-saves: <span className="font-bold">{autoSnapshotsCount}/15</span>
                </span>
                <Info className="w-3.5 h-3.5 text-stone-400 hover:text-stone-200 shrink-0" />

                {/* Tooltip on Hover */}
                <div
                  className="absolute left-0 top-full mt-1.5 w-72 p-3 rounded-lg shadow-xl border text-[11px] leading-relaxed z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{
                    backgroundColor: theme.bgElevated,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <p className="font-semibold mb-1 text-amber-500 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Auto-Save Limits & Retention
                  </p>
                  <p className="opacity-90">
                    There is a maximum limit of <strong>15 auto-saved snapshots</strong> per note. Exceeding 15 auto-saves automatically purges the oldest auto-saved version.
                  </p>
                  <p className="mt-1.5 opacity-90 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Manual Restore Points created by you are kept permanently and are never purged.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold shadow-xs transition-opacity hover:opacity-90 cursor-pointer shrink-0"
                style={{ backgroundColor: theme.accent, color: accentTextColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Restore Point</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body: Left Timeline / Right Diff Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Snapshots Sidebar with Virtualization */}
          <div
            className="w-1/2 border-r h-full overflow-hidden shrink-0 flex flex-col"
            style={{ borderColor: theme.border }}
          >
            {currentDocSnapshots.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs opacity-60 space-y-2">
                <Clock className="w-6 h-6 mx-auto opacity-40" />
                <p>No snapshots recorded yet.</p>
                <p className="text-[11px]">Revisions will automatically save as you write!</p>
              </div>
            ) : (
              <VirtualList<DocumentSnapshot>
                items={currentDocSnapshots}
                itemHeight={96}
                overscan={4}
                className="p-3 custom-vhd-scrollbar"
                renderItem={(snap) => {
                  const isSelected = selectedSnapshot?.id === snap.id;
                  const isCurrent = snap.content === currentDoc.content;

                  return (
                    <div className="pb-2 h-full">
                      <div
                        onClick={() => setSelectedSnapshotId(snap.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all h-full flex flex-col justify-between ${
                          isSelected ? 'shadow-xs' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          borderColor: isSelected ? theme.accent : theme.border,
                          backgroundColor: isSelected ? theme.bgElevated : theme.bg,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider border ${
                              snap.type === 'manual'
                                ? 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                                : 'border-stone-400/40 opacity-70'
                            }`}
                          >
                            {snap.type === 'manual' ? 'CHECKPOINT' : 'AUTO-SAVE'}
                          </span>

                          <div className="flex items-center gap-1">
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Current
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                              className="p-1 rounded opacity-40 hover:opacity-100 hover:text-red-500 cursor-pointer transition-opacity"
                              title="Delete snapshot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="font-semibold text-xs truncate">
                          {snap.label || snap.title}
                        </div>

                        <div className="flex items-center justify-between text-[11px] opacity-60">
                          <span>{new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{snap.wordCount} words</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>

          {/* Diff & Preview Inspector Right Workspace */}
          <div 
            className="w-1/2 flex flex-col h-full border-l"
            style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
          >
            {selectedSnapshot ? (
              <>
                {/* Inspector Toolbar */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b text-xs shrink-0"
                  style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
                >
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <Eye className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{selectedSnapshot.label || 'Selected Revision'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDiffView(!showDiffView)}
                    className="px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer shrink-0 transition-colors hover:border-amber-500 shadow-2xs"
                    style={{ borderColor: theme.border, backgroundColor: theme.bgElevated, color: theme.text }}
                  >
                    {showDiffView ? 'Show Full Raw Text' : 'Show Line Diff (Context 5)'}
                  </button>
                </div>

                {/* Diff Viewer Area */}
                <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed select-text custom-vhd-scrollbar">
                  {showDiffView ? (
                    <div className="space-y-0.5">
                      {foldedDiffItems.length === 0 ? (
                        <div className="py-8 text-center text-xs opacity-60">
                          No differences found — revision content is identical.
                        </div>
                      ) : (
                        foldedDiffItems.map((item, i) => {
                          if (item.type === 'fold') {
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                  setExpandedFolds((prev) => ({ ...prev, [item.id]: true }))
                                }
                                className="w-full text-center py-1.5 px-3 my-1.5 rounded-md border border-dashed text-[11px] font-mono font-medium select-none transition-all cursor-pointer hover:border-amber-500 hover:text-amber-500 shadow-2xs"
                                style={{
                                  borderColor: theme.border,
                                  backgroundColor: theme.bgElevated,
                                  color: theme.text,
                                }}
                                title="Click to expand unchanged lines"
                              >
                                <span>@@ ... {item.count} unchanged lines folded ... @@</span>
                              </button>
                            );
                          }

                          const d = item.data;
                          const isDark = theme.category === 'dark';

                          let lineStyle = '';
                          if (d.type === 'added') {
                            lineStyle = isDark
                              ? 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500'
                              : 'bg-[#e6f4ea] text-[#065f46] border-l-2 border-[#10b981]';
                          } else if (d.type === 'removed') {
                            lineStyle = isDark
                              ? 'bg-rose-950/40 text-rose-200 border-l-2 border-rose-500 line-through opacity-85'
                              : 'bg-[#fce8e6] text-[#9f1239] border-l-2 border-[#f43f5e] line-through opacity-85';
                          } else {
                            lineStyle = 'opacity-85 hover:opacity-100';
                          }

                          return (
                            <div
                              key={i}
                              className={`px-2 py-0.5 rounded-2xs flex items-start gap-1 whitespace-pre-wrap break-words ${lineStyle}`}
                            >
                              <span className="w-7 text-right pr-1 shrink-0 select-none opacity-40 text-[10px] font-mono">
                                {d.oldLineNum || ' '}
                              </span>
                              <span className="w-7 text-right pr-1 shrink-0 select-none opacity-40 text-[10px] font-mono">
                                {d.newLineNum || ' '}
                              </span>
                              <span className="w-3 shrink-0 select-none font-bold text-[11px]">
                                {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}
                              </span>
                              <span className="flex-1 whitespace-pre-wrap break-words">
                                {d.line || ' '}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words opacity-90 p-1">
                      {selectedSnapshot.content}
                    </pre>
                  )}
                </div>

                {/* Restore & Compare Footer Action */}
                <div
                  className="p-3 border-t shrink-0 flex flex-col gap-2"
                  style={{ borderColor: theme.border, backgroundColor: theme.bg }}
                >
                  {restoreSuccess ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                      <span>Revision restored successfully!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={handleRestore}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer truncate"
                        style={{ backgroundColor: theme.accent, color: accentTextColor }}
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Restore This Version</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDiffModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold text-xs border hover:bg-stone-500/10 transition-colors cursor-pointer shrink-0 shadow-2xs"
                        style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.bgElevated }}
                        title="Open Side-by-Side Comparison Modal"
                      >
                        <Columns className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Compare</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs opacity-50 space-y-2">
                <FileCode className="w-8 h-8 opacity-40" />
                <p>Select a revision from the timeline to preview diffs and restore.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side Fullscreen Diff Modal */}
      {selectedSnapshot && (
        <DiffModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          currentDoc={currentDoc}
          snapshot={selectedSnapshot}
          onRestore={(content) => {
            onRestoreContent(content);
            setRestoreSuccess(true);
            setTimeout(() => setRestoreSuccess(false), 2500);
          }}
          theme={theme}
        />
      )}
    </div>
  );
};
