import React, { useState, useRef, useEffect } from 'react';
import { 
  Columns2, 
  BookOpen, 
  PenLine, 
  SlidersHorizontal, 
  Download, 
  FolderOpen, 
  Headphones, 
  Keyboard, 
  Presentation,
  Edit3,
  Check,
  X,
  Search,
  History,
  Link2,
  Unlink2
} from 'lucide-react';
import { ViewLayout, ThemeConfig } from '../types';

interface TopBarProps {
  currentView: ViewLayout;
  onViewChange: (view: ViewLayout) => void;
  documentTitle: string;
  onRenameDocument?: (newTitle: string) => void;
  theme: ThemeConfig;
  onOpenTypography: () => void;
  onOpenExport: () => void;
  onOpenDocManager: () => void;
  onOpenAmbient: () => void;
  onOpenShortcuts: () => void;
  onOpenCommandPalette: () => void;
  onOpenHistory: () => void;
  isAmbientPlaying: boolean;
  syncScroll?: boolean;
  onToggleSyncScroll?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onViewChange,
  documentTitle,
  onRenameDocument,
  theme,
  onOpenTypography,
  onOpenExport,
  onOpenDocManager,
  onOpenAmbient,
  onOpenShortcuts,
  onOpenCommandPalette,
  onOpenHistory,
  isAmbientPlaying,
  syncScroll = true,
  onToggleSyncScroll,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(documentTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitleValue(documentTitle);
  }, [documentTitle]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = () => {
    if (editTitleValue.trim() && onRenameDocument) {
      onRenameDocument(editTitleValue.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header 
      className="no-print h-14 border-b flex items-center justify-between px-4 sm:px-6 select-none transition-colors shrink-0 z-30"
      style={{
        backgroundColor: theme.bgSecondary,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      {/* Zone 1: Brand Title (One single line, strictly compliant with top bar contract) */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <span 
          className="font-serif italic font-bold text-lg sm:text-xl tracking-tight cursor-pointer whitespace-nowrap"
          onClick={onOpenDocManager}
          title="Lumina Prose Markdown Studio (Open Library)"
        >
          Lumina Prose
        </span>

        {/* Document Title pill / Inline Rename */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1">
            <input
              ref={titleInputRef}
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="px-2 py-0.5 text-xs font-semibold rounded-md border outline-none shadow-xs max-w-[130px] sm:max-w-[200px]"
              style={{
                backgroundColor: theme.category === 'dark' ? '#1c1917' : '#ffffff',
                color: theme.category === 'dark' ? '#f5f5f4' : '#1c1917',
                borderColor: theme.accent,
              }}
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              className="p-1 rounded text-white cursor-pointer shadow-xs"
              style={{ backgroundColor: theme.accent }}
              title="Save Name"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsEditingTitle(false)}
              className="p-1 rounded hover:bg-stone-500/10 cursor-pointer opacity-70 hover:opacity-100"
              style={{ color: theme.textMuted }}
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors group"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
              color: theme.text,
            }}
          >
            <button
              type="button"
              onClick={onOpenDocManager}
              className="flex items-center gap-1.5 truncate max-w-[120px] sm:max-w-[160px] lg:max-w-[200px] cursor-pointer hover:opacity-80"
              title={`Switch Document: ${documentTitle}`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="truncate">{documentTitle}</span>
            </button>

            {onRenameDocument && (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="p-0.5 rounded hover:bg-stone-500/15 opacity-50 group-hover:opacity-100 cursor-pointer transition-opacity ml-0.5"
                title="Rename this document"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Zone 2: Navigation Links (Hidden on mobile as they exist in bottom pill) */}
      <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <div 
          className="flex items-center p-0.5 rounded-lg border"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.bg,
          }}
        >
          <button
            type="button"
            onClick={() => onViewChange('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'split' 
                ? 'shadow-xs font-semibold' 
                : 'opacity-70 hover:opacity-100'
            }`}
            style={
              currentView === 'split'
                ? { backgroundColor: theme.bgElevated, color: theme.text }
                : { color: theme.textMuted }
            }
            title="Split Editor & Preview (Ctrl+1)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('reader')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'reader' 
                ? 'shadow-xs font-semibold' 
                : 'opacity-70 hover:opacity-100'
            }`}
            style={
              currentView === 'reader'
                ? { backgroundColor: theme.bgElevated, color: theme.text }
                : { color: theme.textMuted }
            }
            title="Distraction-Free Reader Mode (Ctrl+2)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reader</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('editor')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'editor' 
                ? 'shadow-xs font-semibold' 
                : 'opacity-70 hover:opacity-100'
            }`}
            style={
              currentView === 'editor'
                ? { backgroundColor: theme.bgElevated, color: theme.text }
                : { color: theme.textMuted }
            }
            title="Focus Markdown Editor (Ctrl+3)"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Write</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('slides')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'slides' 
                ? 'shadow-xs font-semibold' 
                : 'opacity-70 hover:opacity-100'
            }`}
            style={
              currentView === 'slides'
                ? { backgroundColor: theme.bgElevated, color: theme.text }
                : { color: theme.textMuted }
            }
            title="Presentation Slides (Split by ---)"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Slides</span>
          </button>
        </div>

        {/* Bi-Directional Synchronous Scroll Lock Toggle Button (Split Mode) */}
        {currentView === 'split' && onToggleSyncScroll && (
          <button
            type="button"
            onClick={onToggleSyncScroll}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              syncScroll ? 'shadow-xs font-semibold' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: syncScroll ? theme.accent : theme.border,
              backgroundColor: syncScroll ? theme.bgElevated : theme.bg,
              color: syncScroll ? theme.accent : theme.textMuted,
            }}
            title={
              syncScroll
                ? 'Bi-Directional Synchronous Scroll: LOCKED (Editor and Preview scroll percentage are synced)'
                : 'Bi-Directional Synchronous Scroll: UNLOCKED (Editor and Preview scroll independently)'
            }
          >
            {syncScroll ? (
              <Link2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Unlink2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden md:inline">{syncScroll ? 'Scroll Sync' : 'Scroll Unlinked'}</span>
          </button>
        )}

        {/* Ambient Synthesizer Button */}
        <button
          type="button"
          onClick={onOpenAmbient}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
            isAmbientPlaying ? 'ring-1 ring-amber-500 font-semibold' : 'opacity-80 hover:opacity-100'
          }`}
          style={{
            borderColor: isAmbientPlaying ? theme.accent : theme.border,
            backgroundColor: isAmbientPlaying ? theme.bgElevated : 'transparent',
            color: isAmbientPlaying ? theme.accent : theme.text,
          }}
          title="Ambient Sound Generator (Rain, White Noise, Forest, Alpha Binaural)"
        >
          <Headphones className={`w-3.5 h-3.5 ${isAmbientPlaying ? 'animate-pulse' : ''}`} />
          <span className="hidden lg:inline">{isAmbientPlaying ? 'Sound On' : 'Ambient'}</span>
        </button>

        {/* Version History Button */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium opacity-80 hover:opacity-100 transition-all whitespace-nowrap cursor-pointer"
          style={{
            borderColor: theme.border,
            color: theme.text,
            backgroundColor: theme.bg,
          }}
          title="Version History & Revisions"
        >
          <History className="w-3.5 h-3.5 text-amber-500" />
          <span>History</span>
        </button>

        {/* Keyboard Shortcuts Button */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="hidden xl:flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium opacity-80 hover:opacity-100 transition-all whitespace-nowrap cursor-pointer"
          style={{
            borderColor: theme.border,
            color: theme.textMuted,
          }}
          title="Keyboard Shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* Zone 3: Primary Action Controls (Hidden on mobile as they exist in bottom pill / sheet) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        {/* Global Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer opacity-90 hover:opacity-100"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.bgElevated,
            color: theme.text,
          }}
          title="Global Command Palette (Ctrl+K / Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 opacity-70" />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded border opacity-70" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>⌘K</kbd>
        </button>

        {/* Typography Studio Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenTypography}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.bgElevated,
            color: theme.text,
          }}
          title="Customize Atmosphere & Typography"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">Atmosphere</span>
        </button>

        {/* Export / Print / Publish Trigger */}
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity shadow-xs hover:opacity-90 whitespace-nowrap cursor-pointer"
          style={{
            backgroundColor: theme.accent,
          }}
          title="Export Document (PDF, HTML, Rich Text, Markdown) [Ctrl+P]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
