import React, { useRef, useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { DocumentItem, ThemeConfig } from '../types';
import { SAMPLE_DOCUMENTS } from '../utils/samples';

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  currentDocId: string;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onRenameDoc: (id: string, newTitle: string) => void;
  onImportDoc: (title: string, content: string) => void;
  onLoadSample: (sample: DocumentItem) => void;
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
  onRenameDoc,
  onImportDoc,
  onLoadSample,
  theme,
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    // Reset input value immediately so re-importing the same file always triggers onChange
    e.target.value = '';

    // File validation: Size limit (max 10MB)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose} 
      />

      <div 
        className="relative max-w-xl w-full rounded-2xl shadow-2xl border p-6 z-10 space-y-6 max-h-[88vh] flex flex-col"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-base">Documents & Library</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Popup Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 text-xs flex items-start justify-between gap-2 shrink-0 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-0.5 rounded hover:bg-red-500/20 cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              onCreateDoc();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer shadow-xs"
            style={{ backgroundColor: theme.accent }}
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border hover:bg-stone-500/10 cursor-pointer transition-colors"
            style={{ borderColor: theme.border }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import (.md / .txt)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>
            Your Saved Documents ({documents.length})
          </div>

          {documents.map((doc) => {
            const isCurrent = doc.id === currentDocId;
            const isEditing = editingId === doc.id;
            const isConfirmingDelete = confirmDeleteId === doc.id;

            return (
              <div
                key={doc.id}
                className={`p-3 rounded-xl border transition-all flex flex-col gap-2 group ${
                  isCurrent ? 'ring-1.5 ring-amber-500 shadow-xs' : 'hover:bg-stone-500/5'
                }`}
                style={{
                  borderColor: isCurrent ? theme.accent : theme.border,
                  backgroundColor: isCurrent ? theme.bgElevated : 'transparent',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-amber-600 dark:text-amber-400' : 'opacity-40'}`} />
                    
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
                          className="px-2 py-0.5 text-xs font-medium rounded border outline-none w-full"
                          style={{
                            borderColor: theme.accent,
                            backgroundColor: theme.bg,
                            color: theme.text,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(doc.id)}
                          className="p-1 rounded text-white cursor-pointer"
                          style={{ backgroundColor: theme.accent }}
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
                        <div className="text-sm font-semibold truncate hover:underline">
                          {doc.title}
                        </div>
                        <div className="text-[11px] flex items-center gap-2 opacity-60">
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
                        className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                        style={{ color: theme.textMuted }}
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Delete Confirmation Prompt */}
                {isConfirmingDelete && (
                  <div className="p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      Delete "{doc.title}"?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteDoc(doc.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium hover:bg-stone-500/10 transition-colors cursor-pointer"
                        style={{ color: theme.text }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sample Templates */}
        <div className="border-t pt-4 shrink-0 space-y-2" style={{ borderColor: theme.border }}>
          <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: theme.textMuted }}>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
                style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
              >
                <div className="text-xs font-semibold truncate">{sample.title}</div>
                <div className="text-[10px] opacity-70">Load preset note</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
