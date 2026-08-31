import React, { useState, useEffect } from 'react';
import {
  Search,
  PenLine,
  Columns2,
  BookOpen,
  Presentation,
  AlignJustify,
  X,
  Clock,
  Palette,
  Download,
  FolderOpen,
  Keyboard,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import { ViewLayout, ThemeConfig } from '../types';

interface MobileBottomNavProps {
  currentView: ViewLayout;
  onViewChange: (view: ViewLayout) => void;
  isVisible: boolean;
  theme: ThemeConfig;
  onOpenCommandPalette: () => void;
  onOpenAmbient: () => void;
  onOpenHistory: () => void;
  onOpenTypography: () => void;
  onOpenDocManager: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  isAmbientPlaying?: boolean;
  autoSnapshotsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  isVisible,
  theme,
  onOpenCommandPalette,
  onOpenAmbient,
  onOpenHistory,
  onOpenTypography,
  onOpenDocManager,
  onOpenExport,
  onOpenShortcuts,
  isAmbientPlaying = false,
  autoSnapshotsCount = 0,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    <>
      {/* Floating Bottom Nav Pill (Mobile only - hidden on desktop md:hidden) */}
      <div
        className={`md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-in-out ${
          isVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="flex items-center gap-2 sm:gap-3 px-3.5 py-2 rounded-full border shadow-2xl backdrop-blur-xl max-w-[95vw]"
          style={{
            backgroundColor: theme.bgElevated,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          {/* 1. Split View */}
          <button
            type="button"
            onClick={() => onViewChange('split')}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              currentView === 'split'
                ? 'shadow-xs scale-110'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
            style={{
              backgroundColor: currentView === 'split' ? theme.accent : 'transparent',
              color: currentView === 'split' ? '#ffffff' : theme.text,
            }}
            title="Split View"
          >
            <Columns2 className="w-4 h-4 shrink-0" />
          </button>

          {/* 2. Reader View */}
          <button
            type="button"
            onClick={() => onViewChange('reader')}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              currentView === 'reader'
                ? 'shadow-xs scale-110'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
            style={{
              backgroundColor: currentView === 'reader' ? theme.accent : 'transparent',
              color: currentView === 'reader' ? '#ffffff' : theme.text,
            }}
            title="Reader View"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
          </button>

          {/* 3. CENTER: Search / Command Palette Button */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="p-2 rounded-full transition-all opacity-70 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            style={{ color: theme.text }}
            title="Search & Command Palette (⌘P)"
          >
            <Search className="w-4 h-4 shrink-0" />
          </button>

          {/* 4. Write (Editor) View */}
          <button
            type="button"
            onClick={() => onViewChange('editor')}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              currentView === 'editor'
                ? 'shadow-xs scale-110'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
            style={{
              backgroundColor: currentView === 'editor' ? theme.accent : 'transparent',
              color: currentView === 'editor' ? '#ffffff' : theme.text,
            }}
            title="Editor View"
          >
            <PenLine className="w-4 h-4 shrink-0" />
          </button>

          {/* 5. Slides View */}
          <button
            type="button"
            onClick={() => onViewChange('slides')}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              currentView === 'slides'
                ? 'shadow-xs scale-110'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
            style={{
              backgroundColor: currentView === 'slides' ? theme.accent : 'transparent',
              color: currentView === 'slides' ? '#ffffff' : theme.text,
            }}
            title="Presentation Slides View"
          >
            <Presentation className="w-4 h-4 shrink-0" />
          </button>

          {/* 6. FAR RIGHT: 3 Straight Lines Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-full transition-all opacity-70 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            style={{ color: theme.text }}
            title="More Tools & Menu"
          >
            <AlignJustify className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Slide-Up Bottom Sheet Menu (Mobile only - hidden on desktop md:hidden) */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end overflow-x-hidden">
          {/* Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div
            className="relative z-10 w-full max-w-lg mx-auto rounded-t-2xl border-t border-x shadow-2xl p-4 sm:p-5 pb-8 overflow-x-hidden animate-in slide-in-from-bottom duration-300 ease-out"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            {/* Drag Handle Indicator */}
            <div
              className="w-12 h-1 rounded-full mx-auto mb-4 opacity-30"
              style={{ backgroundColor: theme.text }}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: theme.border }}>
              <h3 className="text-sm font-bold tracking-wide uppercase opacity-75">
                Tools & Settings
              </h3>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-full hover:opacity-100 opacity-60 transition-opacity cursor-pointer"
                title="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Items List */}
            <div 
              className="space-y-1.5 max-h-[65vh] overflow-y-auto overflow-x-hidden pt-1 pr-0.5 scrollbar-none [::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Ambient Soundscapes */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenAmbient();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Ambient Soundscapes</span>
                      {isAmbientPlaying && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          PLAYING
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-60 mt-0.5">
                      Rain, fireplace, coffee shop & focus audio
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>

              {/* Version History */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenHistory();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Version History</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {autoSnapshotsCount}/15 AUTO
                      </span>
                    </div>
                    <p className="text-xs opacity-60 mt-0.5">
                      Restore previous document revisions & restore points
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>

              {/* Customize Appearance */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenTypography();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Customize Appearance</span>
                    <p className="text-xs opacity-60 mt-0.5">
                      Themes, font sizes, line height & reading guides
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>

              {/* Document Manager */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenDocManager();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Document Manager</span>
                    <p className="text-xs opacity-60 mt-0.5">
                      Browse, organize, import & create markdown notes
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>

              {/* Export Document */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenExport();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Export Document</span>
                    <p className="text-xs opacity-60 mt-0.5">
                      Download as Markdown, HTML, PDF, or Plain Text
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>

              {/* Keyboard Shortcuts */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenShortcuts();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Keyboard Shortcuts</span>
                    <p className="text-xs opacity-60 mt-0.5">
                      Markdown formatting syntax & hotkey reference
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
