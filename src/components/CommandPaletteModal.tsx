import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  Palette,
  Layout,
  Download,
  SlidersHorizontal,
  History,
  Headphones,
  Plus,
  Table,
  AlertCircle,
  Code,
  CheckSquare,
  Sigma,
  BookOpen,
  PenLine,
  Columns2,
  Presentation,
  Check,
  ChevronRight,
  Sparkles,
  Clock,
  Link2,
  Unlink2,
} from 'lucide-react';
import { DocumentItem, ThemeConfig, ThemeId, TypographySettings, ViewLayout } from '../types';
import { THEMES } from '../utils/themes';
import { useFocusTrap } from '../utils/useFocusTrap';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  currentDocId: string;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onViewChange: (view: ViewLayout) => void;
  onSelectTheme: (themeId: ThemeId) => void;
  currentThemeId: ThemeId;
  theme: ThemeConfig;
  onOpenTypography: () => void;
  onOpenExport: () => void;
  onOpenDocManager: () => void;
  onOpenHistory: () => void;
  onOpenAmbient: () => void;
  onOpenShortcuts: () => void;
  onOpenChangelog?: () => void;
  onInsertTemplate: (snippet: string) => void;
  settings: TypographySettings;
  onUpdateSettings: (settings: Partial<TypographySettings>) => void;
  syncScroll?: boolean;
  onToggleSyncScroll?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Recent Files' | 'Documents' | 'Templates' | 'Actions' | 'View' | 'Themes';
  icon: React.ReactNode;
  shortcut?: string;
  badge?: string;
  perform: () => void;
}

const CATEGORY_ORDER: Record<string, number> = {
  'Recent Files': 1,
  'Documents': 2,
  'Templates': 3,
  'Actions': 4,
  'View': 5,
  'Themes': 6,
};

export const CommandPaletteModal: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  documents,
  currentDocId,
  onSelectDoc,
  onCreateDoc,
  onViewChange,
  onSelectTheme,
  currentThemeId,
  theme,
  onOpenTypography,
  onOpenExport,
  onOpenDocManager,
  onOpenHistory,
  onOpenAmbient,
  onOpenShortcuts,
  onOpenChangelog,
  onInsertTemplate,
  settings,
  onUpdateSettings,
  syncScroll = true,
  onToggleSyncScroll,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [docsLimit, setDocsLimit] = useState(8);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose, inputRef);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setDocsLimit(8);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build Command Items List with Recent Files, Documents, and Action items
  const commands = useMemo<CommandItem[]>(() => {
    const recentDocs = [...documents]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    return [
      // 1. --- RECENT FILES (Top 5 most recent) ---
      ...recentDocs.map((doc) => ({
        id: `recent-doc-${doc.id}`,
        title: doc.title,
        subtitle: `Updated ${new Date(doc.updatedAt).toLocaleDateString()} • ${
          doc.content.split(/\s+/).filter(Boolean).length
        } words`,
        category: 'Recent Files' as const,
        icon: <Clock className="w-4 h-4 text-amber-500" />,
        badge: doc.id === currentDocId ? 'ACTIVE' : undefined,
        perform: () => {
          onSelectDoc(doc.id);
          onClose();
        },
      })),

      // 2. --- DOCUMENTS (All Documents) ---
      {
        id: 'doc-create-new',
        title: 'Create New Blank Document',
        subtitle: 'Start writing a new note or article',
        category: 'Documents' as const,
        icon: <Plus className="w-4 h-4 text-emerald-500" />,
        perform: () => {
          onCreateDoc();
          onClose();
        },
      },
      ...documents.map((doc) => ({
        id: `doc-${doc.id}`,
        title: doc.title,
        subtitle: `Updated ${new Date(doc.updatedAt).toLocaleDateString()} • ${
          doc.content.split(/\s+/).filter(Boolean).length
        } words`,
        category: 'Documents' as const,
        icon: <FileText className="w-4 h-4 text-stone-400" />,
        badge: doc.id === currentDocId ? 'ACTIVE' : undefined,
        perform: () => {
          onSelectDoc(doc.id);
          onClose();
        },
      })),

      // 3. --- TEMPLATES ---
      {
        id: 'tmpl-table',
        title: 'Insert Markdown Table',
        subtitle: 'Insert formatted 3-column table template',
        category: 'Templates' as const,
        icon: <Table className="w-4 h-4 text-amber-500" />,
        perform: () => {
          onInsertTemplate(
            '\n\n| Feature | Status | Details |\n| :--- | :---: | :--- |\n| Core Architecture | ✅ Ready | Optimized Vite + React |\n| Typography Studio | ✅ Active | 7 Font Pairings |\n| Standalone Export | ✅ Ready | Full Vector Support |\n\n'
          );
          onClose();
        },
      },
      {
        id: 'tmpl-note',
        title: 'Insert Callout Note',
        subtitle: 'Insert [!NOTE] admonition callout box',
        category: 'Templates' as const,
        icon: <AlertCircle className="w-4 h-4 text-blue-500" />,
        perform: () => {
          onInsertTemplate('\n\n> [!NOTE] Important Notice\n> Add your detailed contextual note here.\n\n');
          onClose();
        },
      },
      {
        id: 'tmpl-tip',
        title: 'Insert Callout Tip',
        subtitle: 'Insert [!TIP] admonition box with icon',
        category: 'Templates' as const,
        icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
        perform: () => {
          onInsertTemplate('\n\n> [!TIP] Helpful Hint\n> Here is a helpful tip for your readers.\n\n');
          onClose();
        },
      },
      {
        id: 'tmpl-warning',
        title: 'Insert Callout Warning',
        subtitle: 'Insert [!WARNING] admonition alert box',
        category: 'Templates' as const,
        icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
        perform: () => {
          onInsertTemplate('\n\n> [!WARNING] Caution\n> Exercise caution when configuring these parameters.\n\n');
          onClose();
        },
      },
      {
        id: 'tmpl-math',
        title: 'Insert KaTeX Math Formula Block',
        subtitle: 'Insert LaTeX equation block $$ ... $$',
        category: 'Templates' as const,
        icon: <Sigma className="w-4 h-4 text-indigo-500" />,
        perform: () => {
          onInsertTemplate('\n\n$$\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n$$\n\n');
          onClose();
        },
      },
      {
        id: 'tmpl-tasks',
        title: 'Insert Interactive Checklist',
        subtitle: 'Insert GFM task list items',
        category: 'Templates' as const,
        icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
        perform: () => {
          onInsertTemplate('\n\n- [x] Initial outline review\n- [ ] Draft core thesis statement\n- [ ] Add mathematical derivations\n- [ ] Final proofreading\n\n');
          onClose();
        },
      },
      {
        id: 'tmpl-code',
        title: 'Insert Code Block',
        subtitle: 'Insert syntax-highlighted code block',
        category: 'Templates' as const,
        icon: <Code className="w-4 h-4 text-purple-500" />,
        perform: () => {
          onInsertTemplate('\n\n```typescript\nfunction calculateMetrics(text: string) {\n  const words = text.trim().split(/\\s+/).filter(Boolean);\n  return { wordCount: words.length };\n}\n```\n\n');
          onClose();
        },
      },
      {
        id: 'tmpl-mermaid',
        title: 'Insert Mermaid.js Diagram',
        subtitle: 'Insert flowchart, sequence, or architecture diagram (```mermaid)',
        category: 'Templates' as const,
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        perform: () => {
          onInsertTemplate('\n\n```mermaid\ngraph TD\n  A[Start Idea] --> B{Feasible?}\n  B -->|Yes| C[Design & Prototype]\n  B -->|No| D[Re-evaluate Requirements]\n  C --> E[Deliver Finished Work]\n```\n\n');
          onClose();
        },
      },

      // 4. --- ACTIONS ---
      {
        id: 'act-export',
        title: 'Export & Publish Document',
        subtitle: 'Export as standalone HTML, PDF, Markdown, or Print',
        category: 'Actions' as const,
        icon: <Download className="w-4 h-4 text-emerald-500" />,
        perform: () => {
          onOpenExport();
          onClose();
        },
      },
      {
        id: 'act-history',
        title: 'Version History & Snapshots',
        subtitle: 'View saved revisions, auto-save diffs, and restore points',
        category: 'Actions' as const,
        icon: <History className="w-4 h-4 text-amber-500" />,
        perform: () => {
          onOpenHistory();
          onClose();
        },
      },
      {
        id: 'act-typography',
        title: 'Atmosphere & Typography Studio',
        subtitle: 'Font face, font size, margins, warmth filter, paper texture',
        category: 'Actions' as const,
        icon: <SlidersHorizontal className="w-4 h-4 text-amber-600" />,
        perform: () => {
          onOpenTypography();
          onClose();
        },
      },
      {
        id: 'act-doc-manager',
        title: 'Document Library',
        subtitle: 'Browse all saved documents, import files, load samples',
        category: 'Actions' as const,
        icon: <FileText className="w-4 h-4 text-blue-500" />,
        perform: () => {
          onOpenDocManager();
          onClose();
        },
      },
      {
        id: 'act-changelog',
        title: "What's New in Lumina Prose (Release Notes)",
        subtitle: 'View features, enhancements, and performance updates in v1.2.1',
        category: 'Actions' as const,
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        perform: () => {
          if (onOpenChangelog) onOpenChangelog();
          onClose();
        },
      },
      {
        id: 'act-ambient',
        title: 'Ambient Sound Generator',
        subtitle: 'Rain, white noise, forest, alpha binaural beats',
        category: 'Actions' as const,
        icon: <Headphones className="w-4 h-4 text-indigo-500" />,
        perform: () => {
          onOpenAmbient();
          onClose();
        },
      },
      {
        id: 'act-bionic',
        title: settings.bionicReading ? 'Disable Bionic Reading' : 'Enable Bionic Reading',
        subtitle: 'Bolds initial word letters to speed up visual reading saccades',
        category: 'Actions' as const,
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        badge: settings.bionicReading ? 'ON' : 'OFF',
        perform: () => {
          onUpdateSettings({ bionicReading: !settings.bionicReading });
          onClose();
        },
      },
      {
        id: 'act-focus',
        title: settings.focusMode ? 'Disable Focus Mode' : 'Enable Focus Mode',
        subtitle: 'Softly dims non-active paragraphs in preview',
        category: 'Actions' as const,
        icon: <BookOpen className="w-4 h-4 text-emerald-500" />,
        badge: settings.focusMode ? 'ON' : 'OFF',
        perform: () => {
          onUpdateSettings({ focusMode: !settings.focusMode });
          onClose();
        },
      },

      // 5. --- VIEW ---
      ...(onToggleSyncScroll
        ? [
            {
              id: 'view-toggle-sync-scroll',
              title: syncScroll ? 'Unlock Synchronous Scrolling' : 'Lock Synchronous Scrolling',
              subtitle: 'Bi-directional scroll percentage linking between Editor & Preview',
              category: 'View' as const,
              icon: syncScroll ? (
                <Unlink2 className="w-4 h-4 text-amber-500" />
              ) : (
                <Link2 className="w-4 h-4 text-amber-500" />
              ),
              badge: syncScroll ? 'LOCKED' : 'UNLOCKED',
              perform: () => {
                onToggleSyncScroll();
                onClose();
              },
            },
          ]
        : []),
      {
        id: 'view-split',
        title: 'Switch to Split View',
        subtitle: 'Side-by-side Markdown editor and rendered preview',
        category: 'View' as const,
        icon: <Columns2 className="w-4 h-4 text-sky-500" />,
        shortcut: '⌘1',
        perform: () => {
          onViewChange('split');
          onClose();
        },
      },
      {
        id: 'view-reader',
        title: 'Switch to Reader Mode',
        subtitle: 'Distraction-free pure reading surface',
        category: 'View' as const,
        icon: <BookOpen className="w-4 h-4 text-amber-500" />,
        shortcut: '⌘2',
        perform: () => {
          onViewChange('reader');
          onClose();
        },
      },
      {
        id: 'view-editor',
        title: 'Switch to Write Mode',
        subtitle: 'Clean focused editor surface',
        category: 'View' as const,
        icon: <PenLine className="w-4 h-4 text-indigo-500" />,
        shortcut: '⌘3',
        perform: () => {
          onViewChange('editor');
          onClose();
        },
      },
      {
        id: 'view-slides',
        title: 'Switch to Presentation Slides',
        subtitle: 'Full-screen slide deck separated by --- rules',
        category: 'View' as const,
        icon: <Presentation className="w-4 h-4 text-rose-500" />,
        perform: () => {
          onViewChange('slides');
          onClose();
        },
      },

      // 6. --- THEMES ---
      ...Object.values(THEMES).map((t) => ({
        id: `theme-${t.id}`,
        title: `Theme: ${t.name}`,
        subtitle: `${t.category.toUpperCase()} atmosphere theme`,
        category: 'Themes' as const,
        icon: (
          <span
            className="w-4 h-4 rounded-full border shadow-2xs flex shrink-0"
            style={{ backgroundColor: t.bg, borderColor: t.border }}
          />
        ),
        badge: t.id === currentThemeId ? 'ACTIVE' : undefined,
        perform: () => {
          onSelectTheme(t.id);
          onClose();
        },
      })),
    ];
  }, [
    documents,
    currentDocId,
    settings.bionicReading,
    settings.focusMode,
    syncScroll,
    currentThemeId,
    onSelectDoc,
    onCreateDoc,
    onInsertTemplate,
    onOpenExport,
    onOpenHistory,
    onOpenTypography,
    onOpenDocManager,
    onOpenAmbient,
    onOpenChangelog,
    onUpdateSettings,
    onToggleSyncScroll,
    onViewChange,
    onSelectTheme,
    onClose,
  ]);

  // Filter commands by search term and sort by explicit category hierarchy
  const filteredCommands = useMemo(() => {
    return commands
      .filter((cmd) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        return (
          cmd.title.toLowerCase().includes(q) ||
          (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
          cmd.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (CATEGORY_ORDER[a.category] || 99) - (CATEGORY_ORDER[b.category] || 99));
  }, [commands, search]);

  // Separate Documents from other categories so only the "Documents" category is paginated
  const { displayedCommands, remainingDocsCount } = useMemo(() => {
    const docItems = filteredCommands.filter((cmd) => cmd.category === 'Documents');
    const otherItemsBefore = filteredCommands.filter((cmd) => cmd.category === 'Recent Files');
    const otherItemsAfter = filteredCommands.filter(
      (cmd) => cmd.category !== 'Recent Files' && cmd.category !== 'Documents'
    );

    const visibleDocs = docItems.slice(0, docsLimit);
    const remaining = Math.max(0, docItems.length - docsLimit);

    return {
      displayedCommands: [...otherItemsBefore, ...visibleDocs, ...otherItemsAfter],
      remainingDocsCount: remaining,
    };
  }, [filteredCommands, docsLimit]);

  // Clamp selection index
  useEffect(() => {
    if (selectedIndex >= displayedCommands.length) {
      setSelectedIndex(Math.max(0, displayedCommands.length - 1));
    }
  }, [displayedCommands.length, selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // If we are on the last visible doc item in "Documents" and more are available, expand on down-arrow
      const currentItem = displayedCommands[selectedIndex];
      const nextItem = displayedCommands[selectedIndex + 1];
      const isLastVisibleDoc =
        currentItem?.category === 'Documents' &&
        (!nextItem || nextItem.category !== 'Documents') &&
        remainingDocsCount > 0;

      if (isLastVisibleDoc) {
        setDocsLimit((prev) => prev + 8);
        setSelectedIndex((prev) => prev + 1);
      } else {
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, displayedCommands.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayedCommands.length) % Math.max(1, displayedCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedCommands[selectedIndex]) {
        displayedCommands[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalContainerRef}
        className="relative w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[75vh] z-10 select-none animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
          color: theme.text,
        }}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search Header Input */}
        <div
          className="flex items-center px-4 py-3.5 border-b shrink-0 gap-3"
          style={{ borderColor: theme.border }}
        >
          <Search className="w-5 h-5 opacity-50 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search documents, themes, templates... (⌘P)"
            className="w-full bg-transparent text-sm sm:text-base outline-none placeholder:opacity-40 font-medium"
            style={{ color: theme.text }}
          />
          <kbd
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold font-mono rounded border opacity-60 shrink-0"
            style={{ borderColor: theme.border, backgroundColor: theme.bg }}
          >
            ESC
          </kbd>
        </div>

        {/* Command Items List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none"
        >
          {displayedCommands.length === 0 ? (
            <div className="py-12 text-center text-sm opacity-60">
              No actions or documents match &quot;{search}&quot;
            </div>
          ) : (
            <>
              {displayedCommands.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const showCategoryHeader =
                  idx === 0 || item.category !== displayedCommands[idx - 1].category;

                const isLastVisibleDoc =
                  item.category === 'Documents' &&
                  (idx === displayedCommands.length - 1 ||
                    displayedCommands[idx + 1].category !== 'Documents');

                return (
                  <React.Fragment key={item.id}>
                    {showCategoryHeader && (
                      <div
                        className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider opacity-50 select-none"
                        style={{ color: theme.text }}
                      >
                        {item.category}
                      </div>
                    )}
                    <div
                      data-selected={isSelected}
                      onClick={() => item.perform()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                        isSelected ? 'shadow-xs font-medium' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSelected ? theme.bgElevated : 'transparent',
                        borderLeft: isSelected ? `3px solid ${theme.accent}` : '3px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="p-1.5 rounded-md border shrink-0 opacity-90" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
                          {item.icon}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.title}</span>
                            {item.badge && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wide shrink-0"
                                style={{
                                  borderColor: theme.accent,
                                  color: theme.accent,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <div className="text-xs opacity-60 truncate mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && (
                          <kbd
                            className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded border opacity-70"
                            style={{ borderColor: theme.border, backgroundColor: theme.bg }}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                        {isSelected && <ChevronRight className="w-4 h-4 opacity-70" style={{ color: theme.accent }} />}
                      </div>
                    </div>

                    {/* Expand button placed exclusively under Documents */}
                    {isLastVisibleDoc && remainingDocsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setDocsLimit((prev) => prev + 8)}
                        className="w-full py-2 px-3 my-1 text-xs font-medium rounded-lg border border-dashed hover:bg-stone-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100"
                        style={{
                          borderColor: theme.border,
                          color: theme.accent,
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+{remainingDocsCount} more documents</span>
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Keyboard Navigation Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t text-[11px] opacity-60 shrink-0 select-none"
          style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        >
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded border text-[10px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 rounded border text-[10px]">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border text-[10px]">↵</kbd> Select
            </span>
          </div>
          <span>
            {filteredCommands.length} items ({commands.length} total)
          </span>
        </div>
      </div>
    </div>
  );
};
