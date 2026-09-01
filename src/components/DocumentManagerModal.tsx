import React, { useRef, useState, useMemo } from 'react';
import { 
  X, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  Sparkles, 
  Clock, 
  Edit3, 
  Check,
  AlertCircle,
  RotateCcw,
  Trash,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { DocumentItem, ThemeConfig } from '../types';
import { SAMPLE_DOCUMENTS } from '../utils/samples';
import { useFocusTrap } from '../utils/useFocusTrap';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  currentDocId: string;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (id: string) => void; // Soft-delete to Recycle Bin
  onRestoreDoc?: (id: string) => void; // Restore from Recycle Bin
  onPermanentDeleteDoc?: (id: string) => void; // Permanent deletion
  onEmptyTrash?: () => void; // Empty Recycle Bin
  onRenameDoc: (id: string, newTitle: string) => void;
  onImportDoc: (title: string, content: string) => void;
  onLoadSample: (sample: DocumentItem) => void;
  onRescanStorage?: () => number | void;
  theme: ThemeConfig;
}

export const DocumentManagerModal: React.FC<DocumentManagerModalProps> = ({
  isOpen,
  onClose,
  documents,
  currentDocId,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onRestoreDoc,
  onPermanentDeleteDoc,
  onEmptyTrash,
  onRenameDoc,
  onImportDoc,
  onLoadSample,
  onRescanStorage,
  theme,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmPermanentDeleteId, setConfirmPermanentDeleteId] = useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Separate active documents from Recycle Bin trashed documents
  const activeDocs = useMemo(() => {
    return documents.filter((d) => !d.isDeleted);
  }, [documents]);

  const trashDocs = useMemo(() => {
    return documents.filter((d) => Boolean(d.isDeleted));
  }, [documents]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleStartRename = (doc: DocumentItem) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setConfirmDeleteId(null);
    setErrorMessage(null);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameDoc(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value immediately
    e.target.value = '';

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please choose a file under 10MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (typeof content !== 'string') {
          throw new Error('File content could not be read as text.');
        }

        const title = file.name.replace(/\.(md|markdown|txt)$/i, '') || 'Imported Note';
        onImportDoc(title, content);
        onClose();
      } catch (err: any) {
        setErrorMessage(`Failed to parse file "${file.name}": ${err.message || 'Unknown error'}`);
      }
    };

    reader.onerror = () => {
      setErrorMessage(`Could not read file "${file.name}". Please ensure the file is a readable Markdown or Text file.`);
    };

    try {
      reader.readAsText(file);
    } catch (err: any) {
      setErrorMessage(`Error opening file: ${err.message || 'File reading failed.'}`);
    }
  };

  // Helper to calculate days remaining until auto-purge (14-day limit)
  const getDaysRemaining = (deletedAt?: number) => {
    if (!deletedAt) return 14;
    const elapsed = Date.now() - deletedAt;
    const remainingMs = FOURTEEN_DAYS_MS - elapsed;
    if (remainingMs <= 0) return 0;
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose} 
      />

      <div 
        ref={modalRef}
        className="relative max-w-xl w-full rounded-2xl shadow-2xl border p-6 z-10 space-y-5 max-h-[88vh] flex flex-col"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Documents & Library"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" style={{ color: theme.accent }} />
            <h2 className="font-semibold text-base" style={{ color: theme.text }}>Documents & Library</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-500/10 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Active Notes vs Recycle Bin */}
        <div className="flex items-center justify-between border-b pb-2 shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
              style={{
                backgroundColor: activeTab === 'active' ? theme.bgElevated : 'transparent',
                borderColor: activeTab === 'active' ? theme.accent : 'transparent',
                color: activeTab === 'active' ? theme.accent : theme.textMuted,
              }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Active Documents</span>
              <span 
                className="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
                style={{ 
                  backgroundColor: theme.bgSecondary,
                  color: theme.text
                }}
              >
                {activeDocs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trash')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
              style={{
                backgroundColor: activeTab === 'trash' ? (theme.category === 'dark' ? '#3B1214' : '#FEE2E2') : 'transparent',
                borderColor: activeTab === 'trash' ? '#EF4444' : 'transparent',
                color: activeTab === 'trash' ? '#B91C1C' : theme.textMuted,
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Recycle Bin</span>
              {trashDocs.length > 0 && (
                <span 
                  className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold"
                  style={{
                    backgroundColor: theme.category === 'dark' ? '#7F1D1D' : '#FECACA',
                    color: theme.category === 'dark' ? '#FCA5A5' : '#991B1B'
                  }}
                >
                  {trashDocs.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'trash' && trashDocs.length > 0 && (
            <div>
              {confirmEmptyTrash ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold" style={{ color: '#B91C1C' }}>Empty all?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onEmptyTrash?.();
                      setConfirmEmptyTrash(false);
                      showToast('Recycle Bin emptied.');
                    }}
                    className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] cursor-pointer shadow-xs"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmEmptyTrash(false)}
                    className="p-1 hover:bg-stone-500/10 rounded cursor-pointer"
                    style={{ color: theme.textMuted }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmEmptyTrash(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                  style={{ color: '#DC2626' }}
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>Empty Bin</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback / Toast Banner */}
        {toastMessage && (
          <div 
            className="p-3 rounded-xl border text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-150 shadow-xs"
            style={{
              backgroundColor: theme.category === 'dark' ? '#2A2012' : '#FEF3C7',
              borderColor: theme.category === 'dark' ? '#78350F' : '#FDE68A',
              color: theme.category === 'dark' ? '#FDE68A' : '#78350F',
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />
              <span className="font-medium">{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
              style={{ color: theme.category === 'dark' ? '#FDE68A' : '#78350F' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Popup Banner */}
        {errorMessage && (
          <div 
            className="p-3.5 rounded-xl border text-xs flex items-start justify-between gap-2 shrink-0 animate-in fade-in duration-200 shadow-xs"
            style={{
              backgroundColor: theme.category === 'dark' ? '#2D1214' : '#FEE2E2',
              borderColor: theme.category === 'dark' ? '#7F1D1D' : '#FCA5A5',
              color: theme.category === 'dark' ? '#FCA5A5' : '#991B1B',
            }}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-0.5 rounded hover:bg-black/10 cursor-pointer shrink-0"
              title="Dismiss"
              style={{ color: theme.category === 'dark' ? '#FCA5A5' : '#991B1B' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: ACTIVE DOCUMENTS */}
        {activeTab === 'active' && (
          <>
            {/* Actions Row */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onCreateDoc();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer shadow-xs border"
                style={{ 
                  backgroundColor: theme.accent,
                  color: '#FFFFFF',
                  borderColor: theme.accent,
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Document</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border hover:bg-stone-500/10 cursor-pointer transition-colors"
                style={{ 
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.bgSecondary,
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import (.md / .txt)</span>
              </button>

              {onRescanStorage && (
                <button
                  type="button"
                  onClick={() => {
                    const recovered = onRescanStorage();
                    if (typeof recovered === 'number' && recovered > 0) {
                      showToast(`Storage scanned: Recovered ${recovered} unmigrated document(s).`);
                    } else {
                      showToast(`Storage scan complete. All documents are up to date.`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-stone-500/10 cursor-pointer transition-colors"
                  style={{ 
                    borderColor: theme.border,
                    color: theme.textMuted,
                    backgroundColor: theme.bgSecondary,
                  }}
                  title="Scan browser storage for any unmigrated notes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Scan Storage</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Active Document List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>
                Active Documents ({activeDocs.length})
              </div>

              {activeDocs.length === 0 ? (
                <div className="p-8 text-center border rounded-xl text-xs" style={{ borderColor: theme.border, color: theme.textMuted }}>
                  No active documents. Click "New Document" to create one.
                </div>
              ) : (
                activeDocs.map((doc) => {
                  const isCurrent = doc.id === currentDocId;
                  const isEditing = editingId === doc.id;
                  const isConfirmingDelete = confirmDeleteId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-2 group ${
                        isCurrent ? 'ring-1.5 ring-amber-500/80 shadow-xs' : 'hover:bg-stone-500/5'
                      }`}
                      style={{
                        borderColor: isCurrent ? theme.accent : theme.border,
                        backgroundColor: isCurrent ? theme.bgElevated : theme.bgSecondary,
                        color: theme.text,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText 
                            className="w-4 h-4 shrink-0" 
                            style={{ color: isCurrent ? theme.accent : theme.textMuted }} 
                          />
                          
                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1 max-w-xs">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(doc.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                autoFocus
                                className="px-2 py-1 text-xs font-medium rounded border outline-none w-full"
                                style={{
                                  borderColor: theme.accent,
                                  backgroundColor: theme.bg,
                                  color: theme.text,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(doc.id)}
                                className="p-1 rounded cursor-pointer"
                                style={{ 
                                  backgroundColor: theme.accent,
                                  color: '#FFFFFF'
                                }}
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded hover:bg-stone-500/10 cursor-pointer"
                                style={{ color: theme.textMuted }}
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                onSelectDoc(doc.id);
                                onClose();
                              }}
                              className="cursor-pointer min-w-0 flex-1"
                            >
                              <div className="text-sm font-semibold truncate hover:underline" style={{ color: theme.text }}>
                                {doc.title}
                              </div>
                              <div className="text-[11px] flex items-center gap-2" style={{ color: theme.textMuted }}>
                                <Clock className="w-3 h-3" />
                                <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{doc.content.split(/\s+/).filter(Boolean).length} words</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {!isEditing && !isConfirmingDelete && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartRename(doc)}
                              className="p-1.5 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
                              style={{ color: theme.textMuted }}
                              title="Rename document"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(doc.id)}
                              className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-600 transition-colors cursor-pointer"
                              style={{ color: theme.textMuted }}
                              title="Move to Recycle Bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline Soft-Delete Confirmation Prompt */}
                      {isConfirmingDelete && (
                        <div 
                          className="p-3 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-150 shadow-xs"
                          style={{
                            backgroundColor: theme.category === 'dark' ? '#2D1214' : '#FEE2E2',
                            borderColor: theme.category === 'dark' ? '#7F1D1D' : '#FCA5A5',
                          }}
                        >
                          <span 
                            className="text-xs font-semibold"
                            style={{ color: theme.category === 'dark' ? '#FCA5A5' : '#991B1B' }}
                          >
                            Move "{doc.title}" to Recycle Bin?
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteDoc(doc.id);
                                setConfirmDeleteId(null);
                                showToast(`Moved "${doc.title}" to Recycle Bin (14-day recovery).`);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                            >
                              Move to Bin
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-stone-500/10 transition-colors cursor-pointer border"
                              style={{ 
                                borderColor: theme.border,
                                color: theme.text,
                                backgroundColor: theme.bg
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sample Templates */}
            <div className="border-t pt-4 shrink-0 space-y-2" style={{ borderColor: theme.border }}>
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.textMuted }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                <span>Curated Sample Notes</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_DOCUMENTS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      onLoadSample(sample);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg border text-left hover:border-amber-500 transition-all cursor-pointer truncate"
                    style={{ 
                      borderColor: theme.border, 
                      backgroundColor: theme.bgSecondary,
                      color: theme.text
                    }}
                  >
                    <div className="text-xs font-semibold truncate">{sample.title}</div>
                    <div className="text-[10px]" style={{ color: theme.textMuted }}>Load preset note</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: RECYCLE BIN */}
        {activeTab === 'trash' && (
          <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
            {/* 14-Day Limit Banner */}
            <div 
              className="p-3.5 rounded-xl border flex items-start gap-3 text-xs shrink-0"
              style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.bgSecondary,
                color: theme.text,
              }}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: theme.accent }} />
              <div className="space-y-1">
                <div className="font-semibold text-xs" style={{ color: theme.text }}>
                  Recycle Bin Policy (14-Day Limit)
                </div>
                <p 
                  className="leading-relaxed text-[11px]"
                  style={{ color: theme.textMuted }}
                >
                  Deleted documents remain in the Recycle Bin for <strong className="font-semibold" style={{ color: theme.text }}>14 days</strong> before being permanently purged automatically. You can restore notes or delete them permanently at any time.
                </p>
              </div>
            </div>

            {/* Trashed Document List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {trashDocs.length === 0 ? (
                <div 
                  className="p-12 text-center border rounded-2xl text-xs flex flex-col items-center gap-2 my-auto" 
                  style={{ 
                    borderColor: theme.border,
                    color: theme.textMuted 
                  }}
                >
                  <Trash2 className="w-8 h-8 opacity-40" />
                  <span className="font-semibold text-sm" style={{ color: theme.text }}>Recycle Bin is Empty</span>
                  <p className="text-[11px]" style={{ color: theme.textMuted }}>Deleted documents will appear here with a 14-day recovery window.</p>
                </div>
              ) : (
                trashDocs.map((doc) => {
                  const daysLeft = getDaysRemaining(doc.deletedAt);
                  const isConfirmingPermanent = confirmPermanentDeleteId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border flex flex-col gap-2 transition-all"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.bgSecondary,
                        color: theme.text,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 flex items-start gap-3">
                          <FileText className="w-4 h-4 shrink-0 mt-1" style={{ color: theme.textMuted }} />
                          <div className="min-w-0 flex-1">
                            <div 
                              className="text-sm font-semibold truncate line-through"
                              style={{ 
                                color: theme.text,
                                textDecorationColor: theme.textMuted
                              }}
                            >
                              {doc.title}
                            </div>
                            <div 
                              className="text-[11px] flex items-center gap-2 flex-wrap mt-0.5"
                              style={{ color: theme.textMuted }}
                            >
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Deleted {doc.deletedAt ? new Date(doc.deletedAt).toLocaleDateString() : 'recently'}
                              </span>
                              <span>•</span>
                              <span>{doc.content.split(/\s+/).filter(Boolean).length} words</span>
                              <span>•</span>
                              <span 
                                className="font-semibold px-2 py-0.5 rounded text-[10px]"
                                style={{
                                  backgroundColor: daysLeft <= 2 
                                    ? (theme.category === 'dark' ? '#450A0A' : '#FEE2E2')
                                    : (theme.category === 'dark' ? '#451A03' : '#FEF3C7'),
                                  color: daysLeft <= 2
                                    ? (theme.category === 'dark' ? '#FCA5A5' : '#B91C1C')
                                    : (theme.category === 'dark' ? '#FDE68A' : '#92400E'),
                                  border: `1px solid ${daysLeft <= 2 ? '#EF444460' : '#F59E0B60'}`,
                                }}
                              >
                                {daysLeft === 0 ? 'Expires today' : `${daysLeft} days left`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons: Restore / Permanent Delete */}
                        {!isConfirmingPermanent && (
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreDoc?.(doc.id);
                                showToast(`Restored "${doc.title}".`);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:bg-emerald-500/10 cursor-pointer shadow-2xs"
                              style={{ 
                                borderColor: theme.border,
                                color: theme.text,
                                backgroundColor: theme.bg
                              }}
                              title="Restore document"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmPermanentDeleteId(doc.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/30"
                              style={{ color: '#DC2626' }}
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Permanent Deletion Confirmation Prompt */}
                      {isConfirmingPermanent && (
                        <div 
                          className="p-3 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-150 shadow-xs"
                          style={{
                            backgroundColor: theme.category === 'dark' ? '#2D1214' : '#FEE2E2',
                            borderColor: theme.category === 'dark' ? '#7F1D1D' : '#FCA5A5',
                          }}
                        >
                          <span 
                            className="text-xs font-semibold"
                            style={{ color: theme.category === 'dark' ? '#FCA5A5' : '#991B1B' }}
                          >
                            Permanently delete "{doc.title}"? This cannot be undone.
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onPermanentDeleteDoc?.(doc.id);
                                setConfirmPermanentDeleteId(null);
                                showToast(`Permanently deleted "${doc.title}".`);
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                            >
                              Delete Forever
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPermanentDeleteId(null)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-stone-500/10 transition-colors cursor-pointer border"
                              style={{ 
                                borderColor: theme.border,
                                color: theme.text,
                                backgroundColor: theme.bg
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
