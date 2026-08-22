import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  DocumentItem, 
  ThemeId, 
  TypographySettings, 
  ViewLayout,
  TocHeading 
} from './types';
import { THEMES } from './utils/themes';
import { SAMPLE_DOCUMENTS } from './utils/samples';
import { extractHeadings } from './utils/markdownParser';
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
import { ambientAudio } from './utils/ambientAudio';

const CURRENT_APP_VERSION = 'v1.1.1';

const STORAGE_KEYS = {
  DOCS: 'lumina_markdown_documents_v1',
  CURRENT_DOC_ID: 'lumina_markdown_active_id_v1',
  SETTINGS: 'lumina_markdown_settings_v1',
  THEME: 'lumina_markdown_theme_v1',
  VIEW: 'lumina_markdown_view_v1',
  KEY_SOUND: 'lumina_markdown_key_sound_v1',
  CHANGELOG_SEEN_VERSION: 'lumina_markdown_changelog_seen_v1_1_1',
};

const DEFAULT_SETTINGS: TypographySettings = {
  fontFamily: 'Newsreader',
  headerFontFamily: 'Plus Jakarta Sans',
  fontSize: 19,
  lineHeight: '1.8',
  measureWidth: 'optimal',
  paragraphSpacing: 'normal',
  alignment: 'left',
  letterSpacing: 'normal',
  wordSpacing: 'normal',
  dropCaps: true,
  showLineNumbers: false,
  codeLigatures: true,
  smoothTypewriter: false,
  focusMode: false,
  highlightSyntax: true,
  readingGuide: false,
  bionicReading: false,
  screenWarmth: 0,
  paperTexture: false,
};

interface HistorySnapshot {
  content: string;
  selStart?: number;
  selEnd?: number;
  timestamp: number;
}

export default function App() {
  // 1. Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOCS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id && parsed[0]?.content !== undefined) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return SAMPLE_DOCUMENTS;
  });

  const [currentDocId, setCurrentDocId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DOC_ID);
      if (saved && documents.some((d) => d.id === saved)) return saved;
    } catch {
      // Fallback
    }
    return documents[0]?.id || SAMPLE_DOCUMENTS[0].id;
  });

  // Current Active Document with guarantee against undefined
  const currentDoc = useMemo(() => {
    return documents.find((d) => d.id === currentDocId) || documents[0] || SAMPLE_DOCUMENTS[0];
  }, [documents, currentDocId]);

  // Persistent Undo / Redo History Stack across views and toolbar clicks
  const docHistoryRef = useRef<Record<string, { past: HistorySnapshot[]; future: HistorySnapshot[] }>>({});
  const [, setHistoryVersion] = useState(0);

  // 2. Settings & Themes state
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeId;
      if (saved && THEMES[saved]) return saved;
    } catch {
      // Fallback
    }
    return 'linen';
  });

  const [settings, setSettings] = useState<TypographySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [viewLayout, setViewLayout] = useState<ViewLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW) as ViewLayout;
      if (saved) return saved;
    } catch {
      // Fallback
    }
    return 'split';
  });

  const [playTypewriterSound, setPlayTypewriterSound] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.KEY_SOUND);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // 3. Modals & Drawers state
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEYS.CHANGELOG_SEEN_VERSION);
      if (seen !== CURRENT_APP_VERSION) {
        localStorage.setItem(STORAGE_KEYS.CHANGELOG_SEEN_VERSION, CURRENT_APP_VERSION);
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  });
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
  const [isAmbientOpen, setIsAmbientOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);

  // Sync scroll lock toggle and active scroll source driver
  const [syncScroll, setSyncScroll] = useState(true);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLTextAreaElement>(null);
  const activeScrollSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollSourceResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Current theme config
  const theme = THEMES[themeId] || THEMES.linen;

  // Persist State Changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(documents));
    } catch {}
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_DOC_ID, currentDocId);
    } catch {}
  }, [currentDocId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, themeId);
      document.documentElement.setAttribute('data-theme-category', theme.category);
    } catch {}
  }, [themeId, theme.category]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW, viewLayout);
    } catch {}
  }, [viewLayout]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.KEY_SOUND, String(playTypewriterSound));
    } catch {}
  }, [playTypewriterSound]);

  // Record history snapshot helper
  const handleRecordHistory = useCallback((beforeContent: string, selStart?: number, selEnd?: number) => {
    if (!docHistoryRef.current[currentDocId]) {
      docHistoryRef.current[currentDocId] = { past: [], future: [] };
    }
    const hist = docHistoryRef.current[currentDocId];
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
  }, [currentDocId]);

  // Undo handler
  const handleUndo = useCallback(() => {
    const hist = docHistoryRef.current[currentDocId];
    if (!hist || hist.past.length === 0) return;

    // Pop until we find a snapshot that differs from the current document content
    let previousSnapshot = hist.past.pop();
    while (previousSnapshot && previousSnapshot.content === currentDoc.content && hist.past.length > 0) {
      previousSnapshot = hist.past.pop();
    }

    if (!previousSnapshot || previousSnapshot.content === currentDoc.content) {
      setHistoryVersion((v) => v + 1);
      return;
    }

    hist.future.push({
      content: currentDoc.content,
      timestamp: Date.now(),
    });

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === currentDocId
          ? { ...doc, content: previousSnapshot.content, updatedAt: Date.now() }
          : doc
      )
    );
    setHistoryVersion((v) => v + 1);
  }, [currentDocId, currentDoc.content]);

  // Redo handler
  const handleRedo = useCallback(() => {
    const hist = docHistoryRef.current[currentDocId];
    if (!hist || hist.future.length === 0) return;

    let nextSnapshot = hist.future.pop();
    while (nextSnapshot && nextSnapshot.content === currentDoc.content && hist.future.length > 0) {
      nextSnapshot = hist.future.pop();
    }

    if (!nextSnapshot || nextSnapshot.content === currentDoc.content) {
      setHistoryVersion((v) => v + 1);
      return;
    }

    hist.past.push({
      content: currentDoc.content,
      timestamp: Date.now(),
    });

    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === currentDocId
          ? { ...doc, content: nextSnapshot.content, updatedAt: Date.now() }
          : doc
      )
    );
    setHistoryVersion((v) => v + 1);
  }, [currentDocId, currentDoc.content]);

  const canUndo = (docHistoryRef.current[currentDocId]?.past.length || 0) > 0;
  const canRedo = (docHistoryRef.current[currentDocId]?.future.length || 0) > 0;

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

        // Global Undo/Redo: Prevent when in input, textarea, modal dialog, or any open overlay
        const activeEl = document.activeElement as HTMLElement | null;
        const activeTag = activeEl?.tagName.toLowerCase();
        const isInsideInput = activeTag === 'textarea' || activeTag === 'input' || activeTag === 'select' || Boolean(activeEl?.isContentEditable);
        const isInsideDialog = Boolean(activeEl?.closest('[role="dialog"], [aria-modal="true"]'));
        const isAnyModalOpen =
          isCommandPaletteOpen ||
          isDocManagerOpen ||
          isExportOpen ||
          isAmbientOpen ||
          isShortcutsOpen ||
          isHistoryOpen ||
          isTypographyOpen;

        if (isInsideInput || isInsideDialog || isAnyModalOpen) {
          // Allow native browser undo/redo inside inputs/modals without mutating parent doc history
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
  }, [handleUndo, handleRedo]);

  // Update Markdown content in current document
  const handleUpdateContent = useCallback((newContent: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === currentDocId
          ? { ...doc, content: newContent, updatedAt: Date.now() }
          : doc
      )
    );
  }, [currentDocId]);

  // Create new blank document
  const handleCreateDocument = useCallback(() => {
    const newDoc: DocumentItem = {
      id: 'doc-' + Date.now(),
      title: 'Untitled Note ' + (documents.length + 1),
      content: '# Untitled Note\n\nStart writing your thoughts...',
      updatedAt: Date.now(),
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setCurrentDocId(newDoc.id);
  }, [documents.length]);

  // Delete Document
  const handleDeleteDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      if (prev.length <= 1) {
        const newDoc: DocumentItem = {
          id: 'doc-' + Date.now(),
          title: 'Untitled Note 1',
          content: '# Untitled Note\n\nStart writing your thoughts...',
          updatedAt: Date.now(),
        };
        setCurrentDocId(newDoc.id);
        return [newDoc];
      }
      const remaining = prev.filter((d) => d.id !== id);
      if (currentDocId === id && remaining.length > 0) {
        setCurrentDocId(remaining[0].id);
      }
      return remaining;
    });
  }, [currentDocId]);

  // Rename Document
  const handleRenameDocument = useCallback((id: string, newTitle: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, title: newTitle } : doc))
    );
  }, []);

  // Import Document from File
  const handleImportDocument = useCallback((title: string, content: string) => {
    const newDoc: DocumentItem = {
      id: 'doc-' + Date.now(),
      title,
      content,
      updatedAt: Date.now(),
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setCurrentDocId(newDoc.id);
  }, []);

  // Load Preset Sample
  const handleLoadSample = useCallback((sample: DocumentItem) => {
    setDocuments((prev) => {
      const existing = prev.find((d) => d.id === sample.id);
      if (existing) {
        setCurrentDocId(sample.id);
        return prev;
      } else {
        const sampleCopy: DocumentItem = {
          ...sample,
          id: 'sample-' + Date.now(),
          updatedAt: Date.now(),
        };
        setCurrentDocId(sampleCopy.id);
        return [sampleCopy, ...prev];
      }
    });
  }, []);

  // Settings update helper
  const handleUpdateSettings = useCallback((newSettings: Partial<TypographySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Extract Headings for Section-Aware Scroll Sync
  const docHeadings = useMemo(() => extractHeadings(currentDoc.content), [currentDoc.content]);

  // Section Anchor Construction for Split View Sync
  const buildSyncAnchors = useCallback((
    markdown: string,
    headings: TocHeading[],
    editorEl: HTMLTextAreaElement,
    previewEl: HTMLDivElement
  ) => {
    const editorMaxScroll = editorEl.scrollHeight - editorEl.clientHeight;
    const previewMaxScroll = previewEl.scrollHeight - previewEl.clientHeight;

    if (editorMaxScroll <= 0 || previewMaxScroll <= 0) {
      return [
        { e: 0, p: 0 },
        { e: Math.max(0, editorMaxScroll), p: Math.max(0, previewMaxScroll) },
      ];
    }

    const rawLines = markdown.split('\n');
    const totalLines = Math.max(1, rawLines.length);

    const rawAnchors: { e: number; p: number }[] = [{ e: 0, p: 0 }];

    // 1. Map headings accurately using exact DOM bounding box offsets
    if (headings.length > 0) {
      const previewContainerRect = previewEl.getBoundingClientRect();
      const previewPaddingTop = parseFloat(window.getComputedStyle(previewEl).paddingTop) || 0;

      for (const h of headings) {
        if (h.lineIndex !== undefined) {
          const targetEl = document.getElementById(h.id);
          if (targetEl) {
            const elRect = targetEl.getBoundingClientRect();
            // Exact scroll position in Preview to place heading at top of content area
            const pOffset = elRect.top - previewContainerRect.top + previewEl.scrollTop - previewPaddingTop;
            // Exact scroll position in Editor textarea to place line at top of content area
            const eOffset = (h.lineIndex / totalLines) * editorEl.scrollHeight;

            const clampedE = Math.max(0, Math.min(editorMaxScroll, eOffset));
            const clampedP = Math.max(0, Math.min(previewMaxScroll, pOffset));

            rawAnchors.push({ e: clampedE, p: clampedP });
          }
        }
      }
    }

    rawAnchors.push({ e: editorMaxScroll, p: previewMaxScroll });

    // Sort by editor scroll offset e
    rawAnchors.sort((a, b) => a.e - b.e);

    // Clean and deduplicate anchors to guarantee strict monotonicity
    const cleanAnchors: { e: number; p: number }[] = [rawAnchors[0]];

    for (let i = 1; i < rawAnchors.length; i++) {
      const prev = cleanAnchors[cleanAnchors.length - 1];
      const curr = rawAnchors[i];

      if (curr.e > prev.e + 0.5 && curr.p >= prev.p) {
        cleanAnchors.push({ e: curr.e, p: curr.p });
      }
    }

    const last = cleanAnchors[cleanAnchors.length - 1];
    if (last.e < editorMaxScroll || last.p < previewMaxScroll) {
      cleanAnchors.push({ e: editorMaxScroll, p: previewMaxScroll });
    }

    return cleanAnchors;
  }, []);

  const mapEditorToPreview = useCallback((editorScrollTop: number, anchors: { e: number; p: number }[]) => {
    if (anchors.length === 0) return 0;
    if (editorScrollTop <= anchors[0].e) return anchors[0].p;

    const last = anchors[anchors.length - 1];
    if (editorScrollTop >= last.e) return last.p;

    for (let i = 0; i < anchors.length - 1; i++) {
      const a1 = anchors[i];
      const a2 = anchors[i + 1];

      if (editorScrollTop >= a1.e && editorScrollTop <= a2.e) {
        const eRange = a2.e - a1.e;
        if (eRange <= 0) return a1.p;

        const progress = (editorScrollTop - a1.e) / eRange;
        return a1.p + progress * (a2.p - a1.p);
      }
    }

    return last.p;
  }, []);

  const mapPreviewToEditor = useCallback((previewScrollTop: number, anchors: { e: number; p: number }[]) => {
    if (anchors.length === 0) return 0;
    if (previewScrollTop <= anchors[0].p) return anchors[0].e;

    const last = anchors[anchors.length - 1];
    if (previewScrollTop >= last.p) return last.e;

    for (let i = 0; i < anchors.length - 1; i++) {
      const a1 = anchors[i];
      const a2 = anchors[i + 1];

      if (previewScrollTop >= a1.p && previewScrollTop <= a2.p) {
        const pRange = a2.p - a1.p;
        if (pRange <= 0) return a1.e;

        const progress = (previewScrollTop - a1.p) / pRange;
        return a1.e + progress * (a2.e - a1.e);
      }
    }

    return last.e;
  }, []);

  // Editor scroll sync to preview (Section-Aware Synchronous Sync)
  const handleEditorScrollSync = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (!syncScroll || !previewScrollRef.current || !editorScrollRef.current) return;
    
    // If Preview is currently the active scroll driver, ignore Editor's scroll echo
    if (activeScrollSourceRef.current === 'preview') return;

    // Mark Editor as active scroll driver
    activeScrollSourceRef.current = 'editor';
    if (scrollSourceResetTimeoutRef.current) {
      clearTimeout(scrollSourceResetTimeoutRef.current);
    }

    const maxScroll = scrollHeight - clientHeight;
    const targetMaxScroll = previewScrollRef.current.scrollHeight - previewScrollRef.current.clientHeight;

    if (targetMaxScroll <= 0) return;

    let targetScrollTop = 0;
    if (maxScroll <= 0 || scrollTop <= 0) {
      targetScrollTop = 0;
    } else if (scrollTop >= maxScroll - 2) {
      targetScrollTop = targetMaxScroll;
    } else {
      const anchors = buildSyncAnchors(
        currentDoc.content,
        docHeadings,
        editorScrollRef.current,
        previewScrollRef.current
      );
      targetScrollTop = mapEditorToPreview(scrollTop, anchors);
    }

    if (Math.abs(previewScrollRef.current.scrollTop - targetScrollTop) > 0.5) {
      previewScrollRef.current.scrollTop = targetScrollTop;
    }

    scrollSourceResetTimeoutRef.current = setTimeout(() => {
      activeScrollSourceRef.current = null;
    }, 150);
  };

  // Preview scroll sync to editor (Section-Aware Synchronous Sync)
  const handlePreviewScrollSync = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (!syncScroll || !editorScrollRef.current || !previewScrollRef.current) return;
    
    // If Editor is currently the active scroll driver, ignore Preview's scroll echo
    if (activeScrollSourceRef.current === 'editor') return;

    // Mark Preview as active scroll driver
    activeScrollSourceRef.current = 'preview';
    if (scrollSourceResetTimeoutRef.current) {
      clearTimeout(scrollSourceResetTimeoutRef.current);
    }

    const maxScroll = scrollHeight - clientHeight;
    const targetMaxScroll = editorScrollRef.current.scrollHeight - editorScrollRef.current.clientHeight;

    if (targetMaxScroll <= 0) return;

    let targetScrollTop = 0;
    if (maxScroll <= 0 || scrollTop <= 0) {
      targetScrollTop = 0;
    } else if (scrollTop >= maxScroll - 2) {
      targetScrollTop = targetMaxScroll;
    } else {
      const anchors = buildSyncAnchors(
        currentDoc.content,
        docHeadings,
        editorScrollRef.current,
        previewScrollRef.current
      );
      targetScrollTop = mapPreviewToEditor(scrollTop, anchors);
    }

    if (Math.abs(editorScrollRef.current.scrollTop - targetScrollTop) > 0.5) {
      editorScrollRef.current.scrollTop = targetScrollTop;
    }

    scrollSourceResetTimeoutRef.current = setTimeout(() => {
      activeScrollSourceRef.current = null;
    }, 150);
  };

  // Handle ambient status refresh
  const handleAudioStateChange = () => {
    setAmbientPlaying(ambientAudio.getStatus().isPlaying);
  };

  // Template snippet inserter
  const handleInsertTemplate = (snippet: string) => {
    handleRecordHistory(currentDoc.content);
    handleUpdateContent(currentDoc.content + snippet);
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
        documentTitle={currentDoc.title}
        onRenameDocument={(title) => handleRenameDocument(currentDoc.id, title)}
        theme={theme}
        onOpenTypography={() => setIsTypographyOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDocManager={() => setIsDocManagerOpen(true)}
        onOpenAmbient={() => setIsAmbientOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isAmbientPlaying={ambientPlaying}
        syncScroll={syncScroll}
        onToggleSyncScroll={() => setSyncScroll((prev) => !prev)}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Split View (Top and down on mobile flex-col, side-by-side on desktop md:flex-row) */}
        {viewLayout === 'split' && (
          <div className="flex flex-col md:flex-row w-full h-full overflow-hidden">
            <div 
              className="w-full md:w-1/2 h-1/2 md:h-full min-w-0 border-b md:border-b-0 md:border-r" 
              style={{ borderColor: theme.border }}
              onPointerEnter={() => { activeScrollSourceRef.current = 'editor'; }}
              onWheel={() => { activeScrollSourceRef.current = 'editor'; }}
              onTouchStart={() => { activeScrollSourceRef.current = 'editor'; }}
            >
              <Editor
                value={currentDoc.content}
                onChange={handleUpdateContent}
                theme={theme}
                settings={settings}
                playTypewriterSound={playTypewriterSound}
                scrollRef={editorScrollRef}
                onScrollSync={handleEditorScrollSync}
                onScrollDirectionChange={(v) => setIsNavVisible(v)}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onRecordHistory={handleRecordHistory}
              />
            </div>
            <div 
              className="w-full md:w-1/2 h-1/2 md:h-full min-w-0"
              onPointerEnter={() => { activeScrollSourceRef.current = 'preview'; }}
              onWheel={() => { activeScrollSourceRef.current = 'preview'; }}
              onTouchStart={() => { activeScrollSourceRef.current = 'preview'; }}
            >
              <Preview
                markdown={currentDoc.content}
                onUpdateMarkdown={handleUpdateContent}
                theme={theme}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onOpenTypography={() => setIsTypographyOpen(true)}
                scrollRef={previewScrollRef}
                onScrollSync={handlePreviewScrollSync}
                onScrollDirectionChange={(v) => setIsNavVisible(v)}
              />
            </div>
          </div>
        )}

        {/* Pure Reader Mode */}
        {viewLayout === 'reader' && (
          <div className="w-full h-full">
            <Preview
              markdown={currentDoc.content}
              onUpdateMarkdown={handleUpdateContent}
              theme={theme}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenTypography={() => setIsTypographyOpen(true)}
              onScrollDirectionChange={(v) => setIsNavVisible(v)}
            />
          </div>
        )}

        {/* Distraction-Free Editor Mode */}
        {viewLayout === 'editor' && (
          <div className="w-full h-full max-w-4xl mx-auto border-x" style={{ borderColor: theme.border }}>
            <Editor
              value={currentDoc.content}
              onChange={handleUpdateContent}
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
            markdown={currentDoc.content}
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
        onOpenAmbient={() => setIsAmbientOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenTypography={() => setIsTypographyOpen(true)}
        onOpenDocManager={() => setIsDocManagerOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isAmbientPlaying={ambientPlaying}
      />

      {/* Slide-out Typography & Theme Studio Drawer */}
      <TypographyDrawer
        isOpen={isTypographyOpen}
        onClose={() => setIsTypographyOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        currentThemeId={themeId}
        onSelectTheme={setThemeId}
        onResetDefaults={() => setSettings(DEFAULT_SETTINGS)}
      />

      {/* Export & Publish Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        markdown={currentDoc.content}
        documentTitle={currentDoc.title}
        theme={theme}
        settings={settings}
      />

      {/* Document Library & Manager Modal */}
      <DocumentManagerModal
        isOpen={isDocManagerOpen}
        onClose={() => setIsDocManagerOpen(false)}
        documents={documents}
        currentDocId={currentDoc.id}
        onSelectDoc={setCurrentDocId}
        onCreateDoc={handleCreateDocument}
        onDeleteDoc={handleDeleteDocument}
        onRenameDoc={handleRenameDocument}
        onImportDoc={handleImportDocument}
        onLoadSample={handleLoadSample}
        theme={theme}
      />

      {/* Ambient Audio Modal */}
      <AmbientSoundModal
        isOpen={isAmbientOpen}
        onClose={() => setIsAmbientOpen(false)}
        theme={theme}
        playTypewriterSound={playTypewriterSound}
        onToggleTypewriterSound={setPlayTypewriterSound}
        onAudioStateChange={handleAudioStateChange}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        theme={theme}
      />

      {/* Global Spotlight Command Palette (Cmd+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        documents={documents}
        currentDocId={currentDoc.id}
        onSelectDoc={setCurrentDocId}
        onCreateDoc={handleCreateDocument}
        onViewChange={setViewLayout}
        onSelectTheme={setThemeId}
        currentThemeId={themeId}
        theme={theme}
        onOpenTypography={() => setIsTypographyOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDocManager={() => setIsDocManagerOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAmbient={() => setIsAmbientOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        onInsertTemplate={handleInsertTemplate}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        syncScroll={syncScroll}
        onToggleSyncScroll={() => setSyncScroll((prev) => !prev)}
      />

      {/* Version History & Snapshots Drawer */}
      <VersionHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentDoc={currentDoc}
        onRestoreContent={handleUpdateContent}
        theme={theme}
      />

      {/* First-Time Version Changelog Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
        theme={theme}
        version={CURRENT_APP_VERSION}
      />
    </div>
  );
}
