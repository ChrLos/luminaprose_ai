import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  DocumentItem, 
  ViewLayout, 
  DEFAULT_TYPOGRAPHY_SETTINGS, 
  APP_STORAGE_KEYS, 
  CURRENT_APP_VERSION 
} from './types';
import { useDocumentManager } from './hooks/useDocumentManager';
import { useProseSettings } from './hooks/useProseSettings';
import { useModalState } from './hooks/useModalState';
import { syncEditorToPreview, syncPreviewToEditor } from './utils/syncScrollEngine';
import { ambientAudio } from './utils/ambientAudio';
import { TopBar } from './components/TopBar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { TypographyDrawer } from './components/TypographyDrawer';
import { ExportModal } from './components/ExportModal';
import { DocumentManagerModal } from './components/DocumentManagerModal';
import { AmbientSoundModal } from './components/AmbientSoundModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { PresentationView } from './components/PresentationView';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { VersionHistoryDrawer } from './components/VersionHistoryDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ChangelogModal } from './components/ChangelogModal';

interface HistorySnapshot {
  content: string;
  selStart?: number;
  selEnd?: number;
  timestamp: number;
}

export default function App() {
  // 1. Unified Document Management Hook
  const {
    documents,
    activeDocuments,
    activeDoc,
    activeDocId,
    setActiveDocId,
    updateActiveContent,
    createDocument,
    deleteDocument,
    restoreDocument,
    permanentDeleteDocument,
    emptyTrash,
    renameDocument,
    importDocuments,
    rescanStorage,
  } = useDocumentManager();

  // 2. Unified Prose Settings & Themes Hook
  const {
    themeId,
    setThemeId,
    currentTheme: theme,
    settings,
    setSettings,
    updateSetting,
    resetSettings,
  } = useProseSettings();

  // 3. Centralized Modal State Hook
  const {
    isExportOpen,
    setIsExportOpen,
    isAmbientSoundOpen,
    setIsAmbientSoundOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isChangelogOpen,
    setIsChangelogOpen,
    isDocManagerOpen,
    setIsDocManagerOpen,
    isTypographyDrawerOpen,
    setIsTypographyDrawerOpen,
    isHistoryDrawerOpen,
    setIsHistoryDrawerOpen,
  } = useModalState();

  // 4. View Layout & Sound Preferences
  const [viewLayout, setViewLayout] = useState<ViewLayout>(() => {
    try {
      const saved = localStorage.getItem('lumina_markdown_view_layout');
      if (saved === 'split' || saved === 'reader' || saved === 'editor' || saved === 'slides') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'split';
  });

  const [playTypewriterSound, setPlayTypewriterSound] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEYS.TYPEWRITER_SOUND);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Persistent changelog trigger on new version release
  useEffect(() => {
    try {
      const seen = localStorage.getItem(APP_STORAGE_KEYS.CHANGELOG_VIEWED);
      if (seen !== CURRENT_APP_VERSION) {
        localStorage.setItem(APP_STORAGE_KEYS.CHANGELOG_VIEWED, CURRENT_APP_VERSION);
        setIsChangelogOpen(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [setIsChangelogOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('lumina_markdown_view_layout', viewLayout);
    } catch {}
  }, [viewLayout]);

  useEffect(() => {
    try {
      localStorage.setItem(APP_STORAGE_KEYS.TYPEWRITER_SOUND, String(playTypewriterSound));
    } catch {}
  }, [playTypewriterSound]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-category', theme.category);
  }, [theme.category]);

  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);

  // Sync scroll lock toggle, active scroll source driver, and cached anchors
  const [syncScroll, setSyncScroll] = useState(true);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLTextAreaElement>(null);
  const activeScrollerRef = useRef<'editor' | 'preview' | null>(null);
  const activeScrollerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleInteraction = useCallback((scroller: 'editor' | 'preview') => {
    activeScrollerRef.current = scroller;
    if (activeScrollerTimerRef.current) clearTimeout(activeScrollerTimerRef.current);
    activeScrollerTimerRef.current = setTimeout(() => {
      activeScrollerRef.current = null;
    }, 150);
  }, []);

  // Persistent Undo / Redo History Stack across views and toolbar clicks
  const docHistoryRef = useRef<Record<string, { past: HistorySnapshot[]; future: HistorySnapshot[] }>>({});
  const [, setHistoryVersion] = useState(0);

  // Record history snapshot helper
  const handleRecordHistory = useCallback((beforeContent: string, selStart?: number, selEnd?: number) => {
    if (!docHistoryRef.current[activeDocId]) {
      docHistoryRef.current[activeDocId] = { past: [], future: [] };
    }
    const hist = docHistoryRef.current[activeDocId];
    const lastEntry = hist.past[hist.past.length - 1];
    
    // Avoid saving identical content or undefined content
    if (beforeContent !== undefined && (!lastEntry || lastEntry.content !== beforeContent)) {
      hist.past.push({
        content: beforeContent,
        selStart,
        selEnd,
        timestamp: Date.now(),
      });
      if (hist.past.length > 150) {
        hist.past.shift();
      }
      hist.future = [];
      setHistoryVersion((v) => v + 1);
    }
  }, [activeDocId]);

  // Undo handler
  const handleUndo = useCallback(() => {
    const hist = docHistoryRef.current[activeDocId];
    if (!hist || hist.past.length === 0) return;

    let previousSnapshot = hist.past.pop();
    while (previousSnapshot && previousSnapshot.content === activeDoc.content && hist.past.length > 0) {
      previousSnapshot = hist.past.pop();
    }

    if (!previousSnapshot || previousSnapshot.content === activeDoc.content) {
      setHistoryVersion((v) => v + 1);
      return;
    }

    hist.future.push({
      content: activeDoc.content,
      timestamp: Date.now(),
    });

    updateActiveContent(previousSnapshot.content);
    setHistoryVersion((v) => v + 1);
  }, [activeDocId, activeDoc.content, updateActiveContent]);

  // Redo handler
  const handleRedo = useCallback(() => {
    const hist = docHistoryRef.current[activeDocId];
    if (!hist || hist.future.length === 0) return;

    let nextSnapshot = hist.future.pop();
    while (nextSnapshot && nextSnapshot.content === activeDoc.content && hist.future.length > 0) {
      nextSnapshot = hist.future.pop();
    }

    if (!nextSnapshot || nextSnapshot.content === activeDoc.content) {
      setHistoryVersion((v) => v + 1);
      return;
    }

    hist.past.push({
      content: activeDoc.content,
      timestamp: Date.now(),
    });

    updateActiveContent(nextSnapshot.content);
    setHistoryVersion((v) => v + 1);
  }, [activeDocId, activeDoc.content, updateActiveContent]);

  const canUndo = (docHistoryRef.current[activeDocId]?.past.length || 0) > 0;
  const canRedo = (docHistoryRef.current[activeDocId]?.future.length || 0) > 0;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Command Palette: Ctrl+P / Cmd+P
        if (!e.shiftKey && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          setIsCommandPaletteOpen((prev) => !prev);
          return;
        }

        // Global Undo/Redo: Prevent when inside active input, textarea, or open dialog
        const activeEl = document.activeElement as HTMLElement | null;
        const activeTag = activeEl?.tagName.toLowerCase();
        const isInsideInput = activeTag === 'textarea' || activeTag === 'input' || activeTag === 'select' || Boolean(activeEl?.isContentEditable);
        const isInsideDialog = Boolean(activeEl?.closest('[role="dialog"], [aria-modal="true"]'));
        const isAnyModalOpen =
          isCommandPaletteOpen ||
          isDocManagerOpen ||
          isExportOpen ||
          isAmbientSoundOpen ||
          isShortcutsOpen ||
          isHistoryDrawerOpen ||
          isTypographyDrawerOpen;

        if (isInsideInput || isInsideDialog || isAnyModalOpen) {
          return;
        }

        // Global Undo: Ctrl+Z / Cmd+Z
        if (!e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault();
          handleUndo();
          return;
        }

        // Global Redo: Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y
        if (((e.key === 'z' || e.key === 'Z') && e.shiftKey) || (!e.shiftKey && (e.key === 'y' || e.key === 'Y'))) {
          e.preventDefault();
          handleRedo();
          return;
        }

        // View Modes
        if (!e.shiftKey) {
          if (e.key === '1') {
            e.preventDefault();
            setViewLayout('split');
          } else if (e.key === '2') {
            e.preventDefault();
            setViewLayout('reader');
          } else if (e.key === '3') {
            e.preventDefault();
            setViewLayout('editor');
          } else if (e.key === '/') {
            e.preventDefault();
            setIsShortcutsOpen(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo, 
    handleRedo, 
    setIsCommandPaletteOpen, 
    setIsShortcutsOpen, 
    isCommandPaletteOpen, 
    isDocManagerOpen, 
    isExportOpen, 
    isAmbientSoundOpen, 
    isShortcutsOpen, 
    isHistoryDrawerOpen, 
    isTypographyDrawerOpen
  ]);

  // Load Preset Sample
  const handleLoadSample = useCallback((sample: DocumentItem) => {
    const existing = documents.find((d) => d.id === sample.id);
    if (existing) {
      setActiveDocId(sample.id);
    } else {
      const sampleCopy: DocumentItem = {
        ...sample,
        id: 'sample-' + Date.now(),
        updatedAt: Date.now(),
      };
      importDocuments([sampleCopy]);
    }
  }, [documents, setActiveDocId, importDocuments]);

  // Editor scroll sync to preview (Section Anchor Sync)
  const handleEditorScrollSync = useCallback((_scrollTop: number, _scrollHeight: number, _clientHeight: number) => {
    if (!syncScroll || !previewScrollRef.current || !editorScrollRef.current) return;
    
    // Ignore scroll event if preview is the active scrolling source
    if (activeScrollerRef.current === 'preview') return;
    activeScrollerRef.current = 'editor';
    if (activeScrollerTimerRef.current) clearTimeout(activeScrollerTimerRef.current);

    syncEditorToPreview(editorScrollRef.current, previewScrollRef.current, activeDoc.content);

    activeScrollerTimerRef.current = setTimeout(() => {
      activeScrollerRef.current = null;
    }, 120);
  }, [syncScroll, activeDoc.content]);

  // Preview scroll sync to editor (Section Anchor Sync)
  const handlePreviewScrollSync = useCallback((_scrollTop: number, _scrollHeight: number, _clientHeight: number) => {
    if (!syncScroll || !editorScrollRef.current || !previewScrollRef.current) return;
    
    // Ignore scroll event if editor is the active scrolling source
    if (activeScrollerRef.current === 'editor') return;
    activeScrollerRef.current = 'preview';
    if (activeScrollerTimerRef.current) clearTimeout(activeScrollerTimerRef.current);

    syncPreviewToEditor(previewScrollRef.current, editorScrollRef.current, activeDoc.content);

    activeScrollerTimerRef.current = setTimeout(() => {
      activeScrollerRef.current = null;
    }, 120);
  }, [syncScroll, activeDoc.content]);

  // Handle ambient status refresh
  const handleAudioStateChange = () => {
    setAmbientPlaying(ambientAudio.getStatus().isPlaying);
  };

  // Template snippet inserter
  const handleInsertTemplate = (snippet: string) => {
    handleRecordHistory(activeDoc.content);
    updateActiveContent(activeDoc.content + snippet);
  };

  return (
    <div 
      className="flex flex-col h-screen w-screen overflow-hidden select-text transition-colors"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Top Header Bar */}
      <TopBar
        currentView={viewLayout}
        onViewChange={setViewLayout}
        documentTitle={activeDoc.title}
        onRenameDocument={(title) => renameDocument(activeDoc.id, title)}
        theme={theme}
        onOpenTypography={() => setIsTypographyDrawerOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDocManager={() => setIsDocManagerOpen(true)}
        onOpenAmbient={() => setIsAmbientSoundOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        isAmbientPlaying={ambientPlaying}
        syncScroll={syncScroll}
        onToggleSyncScroll={() => setSyncScroll((prev) => !prev)}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Split View */}
        {viewLayout === 'split' && (
          <div className="flex flex-col md:flex-row w-full h-full overflow-hidden">
            <div 
              className="w-full md:w-1/2 h-1/2 md:h-full min-w-0 border-b md:border-b-0 md:border-r" 
              style={{ borderColor: theme.border }}
            >
              <Editor
                currentDocId={activeDoc.id}
                value={activeDoc.content}
                onChange={updateActiveContent}
                theme={theme}
                settings={settings}
                playTypewriterSound={playTypewriterSound}
                scrollRef={editorScrollRef}
                onScrollSync={handleEditorScrollSync}
                onInteraction={handleInteraction}
                onScrollDirectionChange={(v) => setIsNavVisible(v)}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onRecordHistory={handleRecordHistory}
              />
            </div>
            <div className="w-full md:w-1/2 h-1/2 md:h-full min-w-0">
              <Preview
                currentDocId={activeDoc.id}
                markdown={activeDoc.content}
                onUpdateMarkdown={updateActiveContent}
                theme={theme}
                settings={settings}
                onUpdateSettings={(partial) => {
                  Object.entries(partial).forEach(([k, v]) => {
                    updateSetting(k as keyof typeof settings, v as never);
                  });
                }}
                onOpenTypography={() => setIsTypographyDrawerOpen(true)}
                scrollRef={previewScrollRef}
                onScrollSync={handlePreviewScrollSync}
                onInteraction={handleInteraction}
                onScrollDirectionChange={(v) => setIsNavVisible(v)}
              />
            </div>
          </div>
        )}

        {/* Pure Reader Mode */}
        {viewLayout === 'reader' && (
          <div className="w-full h-full">
            <Preview
              currentDocId={activeDoc.id}
              markdown={activeDoc.content}
              onUpdateMarkdown={updateActiveContent}
              theme={theme}
              settings={settings}
              onUpdateSettings={(partial) => {
                Object.entries(partial).forEach(([k, v]) => {
                  updateSetting(k as keyof typeof settings, v as never);
                });
              }}
              onOpenTypography={() => setIsTypographyDrawerOpen(true)}
              onScrollDirectionChange={(v) => setIsNavVisible(v)}
            />
          </div>
        )}

        {/* Distraction-Free Editor Mode */}
        {viewLayout === 'editor' && (
          <div className="w-full h-full max-w-4xl mx-auto border-x" style={{ borderColor: theme.border }}>
            <Editor
              currentDocId={activeDoc.id}
              value={activeDoc.content}
              onChange={updateActiveContent}
              theme={theme}
              settings={settings}
              playTypewriterSound={playTypewriterSound}
              onScrollDirectionChange={(v) => setIsNavVisible(v)}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onRecordHistory={handleRecordHistory}
            />
          </div>
        )}

        {/* Presentation Slide View */}
        {viewLayout === 'slides' && (
          <PresentationView
            markdown={activeDoc.content}
            theme={theme}
            settings={settings}
            onClose={() => setViewLayout('split')}
          />
        )}
      </main>

      {/* Floating Bottom Navigation Pill & Slide-Up Menu Sheet */}
      <MobileBottomNav
        currentView={viewLayout}
        onViewChange={setViewLayout}
        isVisible={isNavVisible}
        theme={theme}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAmbient={() => setIsAmbientSoundOpen(true)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        onOpenTypography={() => setIsTypographyDrawerOpen(true)}
        onOpenDocManager={() => setIsDocManagerOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isAmbientPlaying={ambientPlaying}
      />

      {/* Slide-out Typography & Theme Studio Drawer */}
      {isTypographyDrawerOpen && (
        <TypographyDrawer
          isOpen={isTypographyDrawerOpen}
          onClose={() => setIsTypographyDrawerOpen(false)}
          settings={settings}
          onUpdateSettings={(partial) => {
            Object.entries(partial).forEach(([k, v]) => {
              updateSetting(k as keyof typeof settings, v as never);
            });
          }}
          currentThemeId={themeId}
          onSelectTheme={setThemeId}
          onResetDefaults={resetSettings}
        />
      )}

      {/* Export & Publish Modal */}
      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          markdown={activeDoc.content}
          documentTitle={activeDoc.title}
          theme={theme}
          settings={settings}
        />
      )}

      {/* Document Library & Manager Modal */}
      {isDocManagerOpen && (
        <DocumentManagerModal
          isOpen={isDocManagerOpen}
          onClose={() => setIsDocManagerOpen(false)}
          documents={documents}
          currentDocId={activeDoc.id}
          onSelectDoc={setActiveDocId}
          onCreateDoc={() => createDocument()}
          onDeleteDoc={deleteDocument}
          onRestoreDoc={restoreDocument}
          onPermanentDeleteDoc={permanentDeleteDocument}
          onEmptyTrash={emptyTrash}
          onRenameDoc={renameDocument}
          onImportDoc={(title, content) => createDocument(title, content)}
          onLoadSample={handleLoadSample}
          onRescanStorage={rescanStorage}
          theme={theme}
        />
      )}

      {/* Ambient Audio Modal */}
      {isAmbientSoundOpen && (
        <AmbientSoundModal
          isOpen={isAmbientSoundOpen}
          onClose={() => setIsAmbientSoundOpen(false)}
          theme={theme}
          playTypewriterSound={playTypewriterSound}
          onToggleTypewriterSound={setPlayTypewriterSound}
          onAudioStateChange={handleAudioStateChange}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          theme={theme}
        />
      )}

      {/* Global Spotlight Command Palette (Cmd+K) */}
      {isCommandPaletteOpen && (
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          documents={activeDocuments}
          currentDocId={activeDoc.id}
          onSelectDoc={setActiveDocId}
          onCreateDoc={() => createDocument()}
          onViewChange={setViewLayout}
          onSelectTheme={setThemeId}
          currentThemeId={themeId}
          theme={theme}
          onOpenTypography={() => setIsTypographyDrawerOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenDocManager={() => setIsDocManagerOpen(true)}
          onOpenHistory={() => setIsHistoryDrawerOpen(true)}
          onOpenAmbient={() => setIsAmbientSoundOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onOpenChangelog={() => setIsChangelogOpen(true)}
          onInsertTemplate={handleInsertTemplate}
          settings={settings}
          onUpdateSettings={(partial) => {
            Object.entries(partial).forEach(([k, v]) => {
              updateSetting(k as keyof typeof settings, v as never);
            });
          }}
          syncScroll={syncScroll}
          onToggleSyncScroll={() => setSyncScroll((prev) => !prev)}
        />
      )}

      {/* Version History & Snapshots Drawer */}
      {isHistoryDrawerOpen && (
        <VersionHistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          currentDoc={activeDoc}
          onRestoreContent={updateActiveContent}
          theme={theme}
        />
      )}

      {/* First-Time Version Changelog Modal */}
      {isChangelogOpen && (
        <ChangelogModal
          isOpen={isChangelogOpen}
          onClose={() => setIsChangelogOpen(false)}
          theme={theme}
          version={CURRENT_APP_VERSION}
        />
      )}
    </div>
  );
}
