import React, { useEffect, useRef, useState, useMemo, useCallback, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { 
  ListTree, 
  X, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  Minus, 
  Plus,
  Volume2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Info,
  FileText,
  Code,
  Sigma,
  Filter,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { 
  ThemeConfig, 
  TypographySettings, 
  ReadabilityMetrics, 
  TocHeading 
} from '../types';
import { parseMarkdownToHtml, extractHeadings, clearParseCache, slugify } from '../utils/markdownParser';
import { calculateReadability } from '../utils/readability';
import { applyBionicReading } from '../utils/bionicReader';
import { DocumentNarrator, SpeechState } from '../utils/speechNarrator';
import { renderMermaidInContainer, subscribeMermaidUpdates } from '../utils/mermaidRenderer';
import { invalidateSyncScrollCache } from '../utils/syncScrollEngine';
import { getDocScrollPosition, saveDocScrollPosition } from '../utils/scrollStore';
import { getSelectionAsMarkdown } from '../utils/htmlToMarkdown';
import { MermaidViewerModal } from './MermaidViewerModal';

interface PreviewProps {
  currentDocId?: string;
  markdown: string;
  onUpdateMarkdown: (newMarkdown: string) => void;
  theme: ThemeConfig;
  settings: TypographySettings;
  onUpdateSettings?: (newSettings: Partial<TypographySettings>) => void;
  onOpenTypography?: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScrollSync?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  onScrollDirectionChange?: (isVisible: boolean) => void;
  onInteraction?: (scroller: 'editor' | 'preview') => void;
}

export const Preview: React.FC<PreviewProps> = React.memo(({
  currentDocId,
  markdown,
  onUpdateMarkdown,
  theme,
  settings,
  onUpdateSettings,
  onOpenTypography,
  scrollRef: externalScrollRef,
  onScrollSync,
  onScrollDirectionChange,
  onInteraction,
}) => {
  const localScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = externalScrollRef || localScrollRef;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tocListRef = useRef<HTMLDivElement>(null);
  const outlineBtnRef = useRef<HTMLButtonElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  const headingCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showToc, setShowToc] = useState(false);
  const [collapsedHeadings, setCollapsedHeadings] = useState<Set<string>>(new Set());
  const [isOutlineBtnVisible, setIsOutlineBtnVisible] = useState(true);
  const [isScrollHeaderVisible, setIsScrollHeaderVisible] = useState(true);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [activeHeadingText, setActiveHeadingText] = useState<string>('');
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const [viewingMermaid, setViewingMermaid] = useState<{ rawCode: string; svgHtml: string } | null>(null);
  const [copiedCodeToast, setCopiedCodeToast] = useState<string | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);
  const [showWordCountBreakdown, setShowWordCountBreakdown] = useState(false);
  const wordCountModalRef = useRef<HTMLDivElement>(null);

  // High-performance DOM-based Floating Selection Tooltip (0 React state updates during selection)
  const selectionBubbleRef = useRef<HTMLDivElement | null>(null);
  const selectedMarkdownRef = useRef<string>('');
  const selectedWordCountRef = useRef<number>(0);

  const hideSelectionBubble = useCallback(() => {
    if (selectionBubbleRef.current) {
      selectionBubbleRef.current.style.display = 'none';
    }
  }, []);

  const updateSelectionDOM = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hideSelectionBubble();
      return;
    }

    const container = containerRef.current;
    if (!container) {
      hideSelectionBubble();
      return;
    }

    const text = selection.toString();
    if (!text || !text.trim()) {
      hideSelectionBubble();
      return;
    }

    const range = selection.getRangeAt(0);

    // Verify selection is within the preview container
    const isInside =
      container.contains(range.commonAncestorContainer) ||
      container.contains(range.startContainer) ||
      container.contains(range.endContainer);

    if (!isInside) {
      hideSelectionBubble();
      return;
    }

    const rawMarkdown = getSelectionAsMarkdown(container);
    if (!rawMarkdown || rawMarkdown.trim().length === 0) {
      hideSelectionBubble();
      return;
    }

    // Measure bounding client rect
    const rects = range.getClientRects();
    let rect: DOMRect | null = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      rect = range.getBoundingClientRect();
    }

    if (!rect || (rect.top === 0 && rect.bottom === 0 && rect.left === 0 && rect.right === 0)) {
      hideSelectionBubble();
      return;
    }

    const clientX = (rect.left + rect.right) / 2;
    const clientY = rect.top;

    const clampedX = Math.max(120, Math.min(clientX, window.innerWidth - 120));
    const isAbove = clientY >= 50;
    const clampedY = isAbove ? clientY - 42 : rect.bottom + 8;
    const wordCount = rawMarkdown.split(/\s+/).filter(Boolean).length;

    selectedMarkdownRef.current = rawMarkdown;
    selectedWordCountRef.current = wordCount;

    // Create or update DOM bubble directly without triggering React re-renders
    let bubble = selectionBubbleRef.current;
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'selection-toolbar-bubble no-print fixed z-[9999] select-none pointer-events-auto';
      bubble.style.transform = 'translateX(-50%)';
      bubble.style.transition = 'opacity 0.15s ease-out';
      
      // Prevent mousedown from stealing focus or collapsing the text selection
      bubble.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      document.body.appendChild(bubble);
      selectionBubbleRef.current = bubble;
    }

    bubble.innerHTML = `
      <div class="flex items-center gap-1.5 p-1 rounded-lg border shadow-2xl backdrop-blur-md text-xs font-sans"
           style="background-color: ${theme.bgElevated}; border-color: ${theme.border}; color: ${theme.text};">
        <button
          type="button"
          id="copy-selection-md-btn"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer shadow-xs border text-white"
          style="background-color: ${theme.accent}; border-color: ${theme.accent};"
          title="Copy highlighted text formatted as Markdown (Ctrl+Shift+C)"
        >
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          <span>Copy as Markdown</span>
        </button>
        <div class="px-2 py-0.5 text-[11px] font-mono opacity-70 border-l" style="border-color: ${theme.border};">
          ${wordCount} words
        </div>
      </div>
    `;

    const copyBtn = bubble.querySelector('#copy-selection-md-btn') as HTMLButtonElement;
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const mdText = selectedMarkdownRef.current;
        const count = selectedWordCountRef.current;
        if (!mdText) return;

        navigator.clipboard.writeText(mdText).then(() => {
          copyBtn.style.backgroundColor = '#10B981';
          copyBtn.style.borderColor = '#10B981';
          copyBtn.innerHTML = `
            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Copied Markdown!</span>
          `;
          setCopiedCodeToast(`Copied ${count} words as Markdown`);
          setTimeout(() => {
            setCopiedCodeToast(null);
            hideSelectionBubble();
          }, 1500);
        });
      });
    }

    bubble.style.top = `${clampedY}px`;
    bubble.style.left = `${clampedX}px`;
    bubble.style.display = 'block';
  }, [containerRef, theme, hideSelectionBubble]);

  // Clean up selection bubble on unmount
  useEffect(() => {
    return () => {
      if (selectionBubbleRef.current) {
        selectionBubbleRef.current.remove();
        selectionBubbleRef.current = null;
      }
    };
  }, []);

  // Event listeners for text selection
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(updateSelectionDOM, 30);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift'].includes(e.key)) {
        setTimeout(updateSelectionDOM, 30);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.selection-toolbar-bubble')) {
        return;
      }
      hideSelectionBubble();
    };

    const handleContainerScroll = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        updateSelectionDOM();
      } else {
        hideSelectionBubble();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleContainerScroll, { passive: true });
    }

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      if (container) {
        container.removeEventListener('scroll', handleContainerScroll);
      }
    };
  }, [updateSelectionDOM, hideSelectionBubble, containerRef]);

  // Keyboard shortcut: Ctrl/Cmd + Shift + C while selection is active in reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && containerRef.current) {
          const md = getSelectionAsMarkdown(containerRef.current);
          if (md && md.trim()) {
            e.preventDefault();
            navigator.clipboard.writeText(md).then(() => {
              setCopiedCodeToast('Selection copied as Markdown');
              setTimeout(() => setCopiedCodeToast(null), 2000);
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);

  // Close word count modal on click outside
  useEffect(() => {
    const handleWordCountOutsideClick = (e: MouseEvent) => {
      if (wordCountModalRef.current && !wordCountModalRef.current.contains(e.target as Node)) {
        setShowWordCountBreakdown(false);
      }
    };
    if (showWordCountBreakdown) {
      document.addEventListener('mousedown', handleWordCountOutsideClick);
      return () => document.removeEventListener('mousedown', handleWordCountOutsideClick);
    }
  }, [showWordCountBreakdown]);

  // Audio Narrator State
  const [showNarrator, setShowNarrator] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    isPaused: false,
    currentSentenceIndex: 0,
    totalSentences: 0,
    currentText: '',
    rate: 1.0,
  });

  const narratorRef = useRef<DocumentNarrator | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const mouseRafRef = useRef<number | null>(null);

  // Initialize Speech Narrator
  useEffect(() => {
    narratorRef.current = new DocumentNarrator((state) => {
      setSpeechState(state);
    });

    return () => {
      narratorRef.current?.destroy();
    };
  }, []);

  // IntersectionObserver to detect when the main inline outline button scrolls out of view
  useEffect(() => {
    if (!outlineBtnRef.current || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsOutlineBtnVisible(entry.isIntersecting);
      },
      {
        root: containerRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(outlineBtnRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  // Defer heavy markdown processing during active typing
  const deferredMarkdown = useDeferredValue(markdown);

  // Update Narrator text when markdown changes
  useEffect(() => {
    if (narratorRef.current) {
      narratorRef.current.setMarkdown(deferredMarkdown);
    }
  }, [deferredMarkdown]);

  // Subscribe to background Mermaid renders so diagrams update seamlessly in virtual DOM
  const [mermaidVersion, setMermaidVersion] = useState(0);

  useEffect(() => {
    return subscribeMermaidUpdates(() => {
      clearParseCache();
      invalidateSyncScrollCache();
      setMermaidVersion((v) => v + 1);
    });
  }, []);

  // Parse HTML cleanly with KaTeX, syntax highlighting, and SVG Mermaid diagrams
  const rawParsedHtml = useMemo(() => {
    return parseMarkdownToHtml(deferredMarkdown, theme.category === 'dark', true);
  }, [deferredMarkdown, theme.category, mermaidVersion]);

  // Apply Bionic Reading if toggled on (without touching math/code)
  const parsedHtml = useMemo(() => {
    if (!settings.bionicReading) return rawParsedHtml;
    return applyBionicReading(rawParsedHtml);
  }, [rawParsedHtml, settings.bionicReading]);

  // Headings for Table of Contents
  const headings = useMemo(() => extractHeadings(deferredMarkdown), [deferredMarkdown]);

  // Render Mermaid diagrams when markdown changes or unrendered diagrams are in view
  useEffect(() => {
    renderMermaidInContainer(containerRef.current, theme.category === 'dark');
    const timer = setTimeout(() => {
      renderMermaidInContainer(containerRef.current, theme.category === 'dark');
    }, 40);
    return () => clearTimeout(timer);
  }, [parsedHtml, theme.category]);

  // Readability metrics (efficient calculation)
  const readability: ReadabilityMetrics = useMemo(
    () => calculateReadability(deferredMarkdown),
    [deferredMarkdown]
  );

  // Setup Global handlers for interactive components inside raw HTML
  useEffect(() => {
    // 1. Copy Code Block Handler
    (window as any).__copyCodeBlock = (button: HTMLButtonElement) => {
      const codeEncoded = button.getAttribute('data-code');
      if (codeEncoded) {
        const rawCode = decodeURIComponent(codeEncoded);
        navigator.clipboard.writeText(rawCode).then(() => {
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          button.classList.add('bg-emerald-600', 'text-white');
          setCopiedCodeToast('Code copied to clipboard');
          setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-emerald-600', 'text-white');
            setCopiedCodeToast(null);
          }, 2000);
        });
      }
    };

    // 2. Image Zoom Handler
    (window as any).__zoomImage = (src: string, encodedAlt: string) => {
      const alt = decodeURIComponent(encodedAlt || '');
      setZoomedImage({ src, alt });
    };

    // 3. Mermaid Diagram Pan & Zoom Modal Handler
    (window as any).__openMermaidViewer = (btn: HTMLElement) => {
      const codeEncoded = btn.getAttribute('data-code');
      const wrapper = btn.closest('.mermaid-block-wrapper');
      const diagramEl = wrapper ? wrapper.querySelector('.mermaid-diagram') : null;
      const svgHtml = diagramEl ? diagramEl.innerHTML : '';
      const rawCode = codeEncoded ? decodeURIComponent(codeEncoded) : '';
      if (rawCode) {
        setViewingMermaid({ rawCode, svgHtml });
      }
    };

    // 4. Task Item Checkbox Handler (Indexed for 100% formatting, loose lists, and duplicate resilience)
    (window as any).__toggleTaskItem = (checkbox: HTMLInputElement) => {
      const taskIdxStr = checkbox.getAttribute('data-task-index');
      if (taskIdxStr === null) return;

      const targetIdx = parseInt(taskIdxStr, 10);
      const isNowChecked = checkbox.checked;
      const lines = markdown.split('\n');

      let currentTaskCount = 0;
      let updated = false;

      const newLines = lines.map((line) => {
        const match = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX])\](\s+.*)$/);
        if (match) {
          if (currentTaskCount === targetIdx && !updated) {
            updated = true;
            currentTaskCount++;
            return `${match[1]}[${isNowChecked ? 'x' : ' '}]${match[3]}`;
          }
          currentTaskCount++;
        }
        return line;
      });

      if (updated) {
        onUpdateMarkdown(newLines.join('\n'));
      }
    };

    return () => {
      delete (window as any).__copyCodeBlock;
      delete (window as any).__zoomImage;
      delete (window as any).__openMermaidViewer;
      delete (window as any).__toggleTaskItem;
    };
  }, [markdown, onUpdateMarkdown]);

  // Flag to suppress saving scroll during document switching / restoration
  const isRestoringScrollRef = useRef(false);

  // Restore persistent scroll position per document ID
  useEffect(() => {
    if (!currentDocId) return;
    const saved = getDocScrollPosition(currentDocId);
    const targetScroll = saved.previewScrollTop;
    const container = containerRef.current;

    isRestoringScrollRef.current = true;

    if (container) {
      container.scrollTop = targetScroll;
      lastScrollTopRef.current = targetScroll;
    }

    // Schedule across multiple animation frames & timeout ticks to ensure markdown/katex/mermaid DOM rendered
    const r1 = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = targetScroll;
        lastScrollTopRef.current = targetScroll;
      }
    });

    const t1 = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = targetScroll;
        lastScrollTopRef.current = targetScroll;
      }
    }, 60);

    const t2 = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = targetScroll;
        lastScrollTopRef.current = targetScroll;
      }
      isRestoringScrollRef.current = false;
    }, 150);

    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [currentDocId]);

  // Keyboard accessibility: Escape key to dismiss image zoom lightbox
  useEffect(() => {
    if (!zoomedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setZoomedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  // High-performance zero-re-render scroll handler
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Persist per-document scroll (only when not in the middle of restoring)
    if (currentDocId && !isRestoringScrollRef.current) {
      saveDocScrollPosition(currentDocId, { previewScrollTop: scrollTop });
    }

    // Direct DOM progress calculation (0 React re-renders)
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${progress}%`;
    }

    if (onScrollSync) {
      onScrollSync(scrollTop, scrollHeight, clientHeight);
    }

    // Scroll Direction Detection
    const delta = scrollTop - lastScrollTopRef.current;
    if (Math.abs(delta) > 16) {
      const isScrollingDown = delta > 0 && scrollTop > 40;
      if (isScrollingDown !== !isScrollHeaderVisible) {
        setIsScrollHeaderVisible(!isScrollingDown);
        if (onScrollDirectionChange) onScrollDirectionChange(!isScrollingDown);
      }
      lastScrollTopRef.current = scrollTop;
    }

    // Debounced heading layout tracking (prevents layout thrashing on frame ticks)
    if (headings.length > 0) {
      if (headingCheckTimeoutRef.current) clearTimeout(headingCheckTimeoutRef.current);
      headingCheckTimeoutRef.current = setTimeout(() => {
        const headingElements = headings
          .map((h) => ({ id: h.id, text: h.text, el: document.getElementById(h.id) }))
          .filter((item): item is { id: string; text: string; el: HTMLElement } => Boolean(item.el));

        for (let i = headingElements.length - 1; i >= 0; i--) {
          const rect = headingElements[i].el.getBoundingClientRect();
          if (rect.top <= 180) {
            setActiveHeadingId(headingElements[i].id);
            setActiveHeadingText(headingElements[i].text);
            break;
          }
        }
      }, 100);
    }
  }, [containerRef, headings, onScrollSync, onScrollDirectionChange, isScrollHeaderVisible]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current);
      if (headingCheckTimeoutRef.current) clearTimeout(headingCheckTimeoutRef.current);
    };
  }, []);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(id);
      if (window.innerWidth < 1024) {
        setShowToc(false);
      }
    }
  };

  // Font family mapping
  const getFontFamilyStyle = () => {
    switch (settings.fontFamily) {
      case 'Newsreader':
        return 'var(--font-serif-literary)';
      case 'Lora':
        return 'var(--font-serif-classic)';
      case 'Cormorant Garamond':
        return 'var(--font-serif-elegant)';
      case 'Plus Jakarta Sans':
        return 'var(--font-sans-clean)';
      case 'Atkinson Hyperlegible':
        return 'var(--font-sans-legible)';
      case 'JetBrains Mono':
        return 'var(--font-mono-code)';
      case 'System Serif':
        return 'ui-serif, Georgia, Cambria, serif';
      default:
        return 'system-ui, -apple-system, sans-serif';
    }
  };

  // Measure Column width mapping
  const getMeasureMaxWidth = () => {
    switch (settings.measureWidth) {
      case 'narrow':
        return '600px';
      case 'optimal':
        return '720px';
      case 'wide':
        return '860px';
      case 'editorial':
        return '980px';
      case 'full':
        return '100%';
    }
  };

  // Mouse move for reading guide ruler (RAF Throttled)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!settings.readingGuide || !wrapperRef.current) return;
    const clientY = e.clientY;
    if (mouseRafRef.current) return;

    mouseRafRef.current = requestAnimationFrame(() => {
      mouseRafRef.current = null;
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setGuideY(clientY - rect.top);
      }
    });
  };

  const handleMouseLeave = () => {
    setGuideY(null);
  };

  // Handle internal anchor links (e.g. <a href="#image-restoration">, footnotes, or <a name="...">)
  const handleArticleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const rawHref = anchor.getAttribute('href');
    if (rawHref && rawHref.startsWith('#')) {
      e.preventDefault();
      const targetRef = rawHref.substring(1).trim();
      if (!targetRef) return;

      const container = containerRef.current;
      if (!container) return;

      onInteraction?.('preview');

      // Try multiple resolution strategies:
      // 1. Direct document.getElementById / container query
      let targetEl: HTMLElement | null = null;

      try {
        targetEl = document.getElementById(targetRef) ||
          container.querySelector(`[id="${CSS.escape(targetRef)}"]`) ||
          container.querySelector(`[name="${CSS.escape(targetRef)}"]`) ||
          container.querySelector(`a[name="${CSS.escape(targetRef)}"]`) ||
          container.querySelector(`a[id="${CSS.escape(targetRef)}"]`);
      } catch {
        targetEl = document.getElementById(targetRef);
      }

      // 2. Slugified match (e.g. if link is href="#Image-Restoration" and target is id="image-restoration" or heading slug)
      if (!targetEl) {
        const slug = slugify(targetRef);
        if (slug) {
          try {
            targetEl = document.getElementById(slug) ||
              container.querySelector(`[id="${CSS.escape(slug)}"]`) ||
              container.querySelector(`[name="${CSS.escape(slug)}"]`) ||
              container.querySelector(`a[name="${CSS.escape(slug)}"]`);
          } catch {
            targetEl = document.getElementById(slug);
          }
        }
      }

      // 3. Case-insensitive attribute search
      if (!targetEl) {
        const lowerRef = targetRef.toLowerCase();
        const allTagged = Array.from(container.querySelectorAll<HTMLElement>('[id], [name], a[name], a[id]'));
        for (const el of allTagged) {
          const elId = el.getAttribute('id')?.toLowerCase();
          const elName = el.getAttribute('name')?.toLowerCase();
          if (elId === lowerRef || elName === lowerRef || (elId && slugify(elId) === lowerRef)) {
            targetEl = el;
            break;
          }
        }
      }

      if (targetEl) {
        // Calculate exact scroll offset relative to preview container
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetScrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 24;

        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });

        // Add a brief subtle flash to draw eye to reference target
        targetEl.classList.add('anchor-target-highlight');
        setTimeout(() => {
          targetEl?.classList.remove('anchor-target-highlight');
        }, 1500);
      }
    }
  };

  // Toggle collapsible heading in outline
  const toggleCollapseHeading = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedHeadings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Synchronize outline position and expand active section when opening TOC
  useEffect(() => {
    if (showToc && containerRef.current) {
      const previewContainerRect = containerRef.current.getBoundingClientRect();
      const headingElements = headings
        .map((h) => ({ id: h.id, level: h.level, el: document.getElementById(h.id) }))
        .filter((item): item is { id: string; level: number; el: HTMLElement } => Boolean(item.el));

      let currentActive = headings[0]?.id;
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const rect = headingElements[i].el.getBoundingClientRect();
        if (rect.top <= previewContainerRect.top + 120) {
          currentActive = headingElements[i].id;
          break;
        }
      }

      if (currentActive) {
        setActiveHeadingId(currentActive);
        // Ensure its ancestors are uncollapsed so the active item is visible
        setCollapsedHeadings((prev) => {
          if (prev.size === 0) return prev;
          const next = new Set(prev);
          const activeIdx = headings.findIndex((h) => h.id === currentActive);
          if (activeIdx > 0) {
            const activeLevel = headings[activeIdx].level;
            for (let i = activeIdx - 1; i >= 0; i--) {
              if (headings[i].level < activeLevel) {
                next.delete(headings[i].id);
              }
            }
          }
          return next;
        });

        setTimeout(() => {
          const el = tocListRef.current?.querySelector(`[data-toc-id="${currentActive}"]`);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 50);
      }
    }
  }, [showToc, headings, containerRef]);

  // Compute visible headings considering collapsed ancestor branches
  const visibleHeadings = useMemo(() => {
    const result: { heading: TocHeading; hasChildren: boolean; isCollapsed: boolean }[] = [];
    
    // First, precalculate which headings have child subheadings
    const hasChildrenMap = new Map<string, boolean>();
    for (let i = 0; i < headings.length; i++) {
      const curr = headings[i];
      const next = headings[i + 1];
      hasChildrenMap.set(curr.id, Boolean(next && next.level > curr.level));
    }

    // Determine visibility based on collapsed parent branches
    let hiddenUnderLevel: number | null = null;

    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const hasChildren = hasChildrenMap.get(h.id) || false;
      const isCollapsed = collapsedHeadings.has(h.id);

      if (hiddenUnderLevel !== null) {
        if (h.level > hiddenUnderLevel) {
          // Skip rendering this collapsed child
          continue;
        } else {
          // Reset hidden level once we encounter a peer or higher level
          hiddenUnderLevel = null;
        }
      }

      result.push({ heading: h, hasChildren, isCollapsed });

      if (hasChildren && isCollapsed) {
        hiddenUnderLevel = h.level;
      }
    }

    return result;
  }, [headings, collapsedHeadings]);

  // Quick font size increments
  const handleAdjustFontSize = (delta: number) => {
    if (!onUpdateSettings) return;
    const newSize = Math.max(14, Math.min(26, settings.fontSize + delta));
    onUpdateSettings({ fontSize: newSize });
  };

  // Word spacing style calculation
  const getWordSpacingStyle = () => {
    switch (settings.wordSpacing) {
      case 'relaxed':
        return '0.08em';
      case 'spacious':
        return '0.16em';
      default:
        return 'normal';
    }
  };

  // Warmth overlay calculation (0-100)
  const warmthAlpha = (settings.screenWarmth || 0) * 0.0022;

  return (
    <div 
      ref={wrapperRef}
      data-theme-category={theme.category}
      className={`relative flex h-full overflow-hidden flex-1 select-text transition-colors ${
        theme.category === 'dark' ? 'theme-dark' : 'theme-light'
      } ${settings.paperTexture ? 'paper-matte-bg' : ''}`}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Screen Warmth & Candlelight Blue-Light Filter Overlay */}
      {settings.screenWarmth > 0 && (
        <div 
          className="pointer-events-none absolute inset-0 z-40 transition-opacity duration-300"
          style={{
            backgroundColor: `rgba(249, 115, 22, ${warmthAlpha})`,
            mixBlendMode: theme.category === 'dark' ? 'screen' : 'multiply',
          }}
        />
      )}

      {/* Subtle Reading Guide Ruler in fixed viewport coordinate space */}
      {settings.readingGuide && guideY !== null && (
        <div 
          className="pointer-events-none absolute left-0 right-0 h-8 -translate-y-1/2 transition-transform duration-75 z-20 opacity-25"
          style={{ 
            top: `${guideY}px`,
            backgroundColor: theme.accent,
            borderTop: `1px dashed ${theme.accent}`,
            borderBottom: `1px dashed ${theme.accent}`,
          }} 
        />
      )}

      {/* Silky Reading Progress Indicator Bar */}
      <div 
        className="no-print absolute top-0 left-0 right-0 h-1 z-30 opacity-80 pointer-events-none"
        style={{ backgroundColor: 'rgba(150, 150, 150, 0.15)' }}
      >
        <div 
          ref={progressBarRef}
          className="h-full"
          style={{
            width: '0%',
            backgroundColor: theme.accent,
          }}
        />
      </div>

      {/* Floating Top-Right Corner Outline Button when main inline button is scrolled out of view */}
      {!isOutlineBtnVisible && headings.length > 0 && (
        <div
          className={`no-print absolute top-4 right-4 z-30 transition-all duration-300 ease-in-out ${
            isScrollHeaderVisible
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : '-translate-y-12 opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto'
          }`}
        >
          <button
            type="button"
            onClick={() => setShowToc(!showToc)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              showToc ? 'ring-2 ring-amber-500 border-amber-500' : ''
            }`}
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
              color: theme.text,
            }}
            title="Toggle Table of Contents"
          >
            <ListTree className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Outline ({headings.length})</span>
          </button>
        </div>
      )}

      {/* Main Reading Surface */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onPointerEnter={() => onInteraction?.('preview')}
        onPointerDown={() => onInteraction?.('preview')}
        onTouchStart={() => onInteraction?.('preview')}
        onWheel={() => onInteraction?.('preview')}
        style={{ willChange: 'scroll-position' }}
        className="preview-container relative flex-1 h-full overflow-y-auto px-6 sm:px-10 lg:px-16 py-8 lg:py-14"
      >
        {/* Reading Article Envelope */}
        <article 
          onClick={handleArticleClick}
          className={`mx-auto w-full min-w-0 max-w-full transition-all ${
            settings.dropCaps ? 'drop-cap' : ''
          } ${
            settings.paragraphSpacing === 'indented' ? 'book-indent' : ''
          } ${
            settings.focusMode ? 'focus-dim-inactive' : ''
          }`}
          style={{
            maxWidth: getMeasureMaxWidth(),
            fontFamily: getFontFamilyStyle(),
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            textAlign: settings.alignment,
            letterSpacing: settings.letterSpacing === 'tight' ? '-0.02em' : settings.letterSpacing === 'wide' ? '0.03em' : 'normal',
            wordSpacing: getWordSpacingStyle(),
            ['--border-color' as any]: theme.border,
            ['--hr-color' as any]: theme.hrColor,
            ['--code-bg' as any]: theme.codeBg,
            ['--table-header-bg' as any]: theme.tableHeaderBg,
            ['--table-stripe-bg' as any]: theme.tableStripeBg,
            ['--blockquote-border' as any]: theme.blockquoteBorder,
            ['--accent-color' as any]: theme.accent,
            ['--text-color' as any]: theme.text,
          }}
        >
          {/* Quick Reading Comfort & Metrics Ribbon */}
          <div 
            className="no-print mb-8 pb-3.5 border-b flex flex-wrap items-center justify-between text-xs font-sans gap-3 select-none relative"
            style={{ borderColor: theme.border, color: theme.textMuted }}
          >
            {/* Left: Reading stats with Dual Word Count Popover Trigger */}
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Dual Word Count Badge & Breakdown Button */}
              <div className="relative" ref={wordCountModalRef}>
                <button
                  type="button"
                  onClick={() => setShowWordCountBreakdown((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                    showWordCountBreakdown 
                      ? 'ring-1.5 ring-amber-500 shadow-xs' 
                      : 'hover:border-amber-500/50'
                  }`}
                  style={{
                    borderColor: showWordCountBreakdown ? theme.accent : theme.border,
                    backgroundColor: showWordCountBreakdown ? theme.bgElevated : 'transparent',
                    color: theme.text,
                  }}
                  title="Click to view Word Count Calculation & Omission Breakdown"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{readability.readingTimeMinutes} min read</span>
                  <span className="opacity-30">•</span>
                  <span className="font-semibold">{readability.words.toLocaleString()} words</span>
                  <span className="text-[10px] opacity-60">({readability.rawWords.toLocaleString()} raw)</span>
                  <Info className="w-3 h-3 opacity-50 ml-0.5" />
                </button>

                {/* Word Count Breakdown Popover */}
                {showWordCountBreakdown && (
                  <div 
                    className="absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      backgroundColor: theme.bgElevated,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: theme.border }}>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-semibold text-sm">Word Count & Content Analysis</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWordCountBreakdown(false)}
                        className="p-1 rounded hover:bg-stone-500/10 cursor-pointer"
                        style={{ color: theme.textMuted }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Metric Comparison Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          className="p-2.5 rounded-xl border flex flex-col gap-1"
                          style={{ borderColor: theme.accent, backgroundColor: theme.bg }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Filter className="w-3 h-3" /> Filtered Prose
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-medium">Reading</span>
                          </div>
                          <div className="text-xl font-bold font-mono">{readability.words.toLocaleString()}</div>
                          <span className="text-[10px] opacity-70 leading-tight">
                            Excludes code, math, syntax markup & link URLs.
                          </span>
                        </div>

                        <div 
                          className="p-2.5 rounded-xl border flex flex-col gap-1"
                          style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium opacity-80 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Full Context
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-500/10 opacity-70 font-mono">Raw</span>
                          </div>
                          <div className="text-xl font-bold font-mono">{readability.rawWords.toLocaleString()}</div>
                          <span className="text-[10px] opacity-70 leading-tight">
                            All words and tokens across raw Markdown.
                          </span>
                        </div>
                      </div>

                      {/* What is Omitted Section */}
                      <div className="p-2.5 rounded-xl border text-[11px] space-y-1.5" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
                        <div className="font-semibold text-[11px] flex items-center justify-between">
                          <span>Omitted from Prose Word Count:</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {readability.omittedWords.toLocaleString()} words
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] opacity-80 pt-1 border-t" style={{ borderColor: theme.border }}>
                          <div className="flex items-center gap-1">
                            <Code className="w-3 h-3 shrink-0" />
                            <span>Code blocks: <strong>{readability.codeBlocksCount}</strong></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sigma className="w-3 h-3 shrink-0" />
                            <span>Math blocks: <strong>{readability.mathBlocksCount}</strong></span>
                          </div>
                          <div className="col-span-2 text-[10px] opacity-70 pt-0.5">
                            • Also omitted: Inline code, HTML tags, link target URLs, YAML headers &amp; Markdown symbols (#, **, &gt;, ---).
                          </div>
                        </div>
                      </div>

                      {/* Document Details Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                        <div className="p-1.5 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
                          <div className="font-bold font-mono text-xs">{readability.characters.toLocaleString()}</div>
                          <div className="opacity-60">Total Chars</div>
                        </div>
                        <div className="p-1.5 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
                          <div className="font-bold font-mono text-xs">{readability.paragraphs}</div>
                          <div className="opacity-60">Paragraphs</div>
                        </div>
                        <div className="p-1.5 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
                          <div className="font-bold font-mono text-xs">{readability.lines}</div>
                          <div className="opacity-60">Lines</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <span className="hidden sm:inline opacity-30">•</span>

              <span className="hidden sm:flex items-center gap-1.5" title="Readability Grade Level">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{readability.gradeLevelText}</span>
              </span>

              {activeHeadingText && (
                <>
                  <span className="hidden md:inline opacity-30">•</span>
                  <span className="hidden md:inline truncate max-w-[200px] font-medium opacity-80" title={activeHeadingText}>
                    § {activeHeadingText}
                  </span>
                </>
              )}
            </div>

            {/* Right: Audio Narrator, Quick Font Adjusters & Outline button */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Text-to-Speech Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (showNarrator) {
                    narratorRef.current?.stop();
                    setShowNarrator(false);
                  } else {
                    setShowNarrator(true);
                    narratorRef.current?.play();
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                  showNarrator ? 'bg-amber-500/20 text-amber-600 border-amber-500 font-semibold' : ''
                }`}
                style={{
                  borderColor: showNarrator ? theme.accent : theme.border,
                  backgroundColor: showNarrator ? undefined : theme.bgSecondary,
                  color: showNarrator ? theme.accent : theme.text,
                }}
                title="Audio Narrator (Text-to-Speech)"
              >
                {showNarrator ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{showNarrator ? 'Narrating' : 'Listen'}</span>
              </button>

              {/* Bionic Reading Toggle */}
              {onUpdateSettings && (
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ bionicReading: !settings.bionicReading })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    settings.bionicReading ? 'bg-amber-500/20 text-amber-600 border-amber-500 font-semibold' : ''
                  }`}
                  style={{
                    borderColor: settings.bionicReading ? theme.accent : theme.border,
                    backgroundColor: settings.bionicReading ? undefined : theme.bgSecondary,
                    color: settings.bionicReading ? theme.accent : theme.text,
                  }}
                  title="Bionic Reading (Focus fixation points)"
                >
                  <span className="font-bold">Bi</span><span>onic</span>
                </button>
              )}

              {onUpdateSettings && (
                <div 
                  className="flex items-center border rounded-md px-1.5 py-0.5 gap-1.5 text-[11px]"
                  style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
                >
                  <button 
                    type="button" 
                    onClick={() => handleAdjustFontSize(-1)}
                    disabled={settings.fontSize <= 14}
                    className="p-1 hover:text-amber-600 disabled:opacity-30 cursor-pointer"
                    title="Decrease Font Size"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-semibold px-0.5">{settings.fontSize}px</span>
                  <button 
                    type="button" 
                    onClick={() => handleAdjustFontSize(1)}
                    disabled={settings.fontSize >= 26}
                    className="p-1 hover:text-amber-600 disabled:opacity-30 cursor-pointer"
                    title="Increase Font Size"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  <span className="opacity-25">|</span>

                  {/* Leading quick buttons */}
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ lineHeight: '1.65' })}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${settings.lineHeight === '1.65' ? 'bg-amber-500/20 text-amber-600 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                    title="Standard Leading (1.65x)"
                  >
                    1.6x
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ lineHeight: '1.8' })}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${settings.lineHeight === '1.8' ? 'bg-amber-500/20 text-amber-600 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                    title="Comfortable Leading (1.8x)"
                  >
                    1.8x
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ lineHeight: '1.95' })}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${settings.lineHeight === '1.95' ? 'bg-amber-500/20 text-amber-600 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                    title="Relaxed Leading (1.95x)"
                  >
                    2.0x
                  </button>
                </div>
              )}

              {headings.length > 0 && (
                <button
                  ref={outlineBtnRef}
                  type="button"
                  onClick={() => setShowToc(!showToc)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    showToc ? 'ring-1 ring-amber-500' : ''
                  }`}
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.bgSecondary,
                    color: theme.text,
                  }}
                  title="Toggle Table of Contents"
                >
                  <ListTree className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Outline ({headings.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Multimodal Audio Narrator Dock */}
          {showNarrator && (
            <div 
              className="no-print mb-8 p-3.5 rounded-xl border shadow-sm flex flex-col gap-2.5 transition-all animate-in fade-in select-none"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.border,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Audio Narrator</span>
                  <span className="text-[11px] font-mono opacity-70">
                    Sentence {speechState.currentSentenceIndex + 1} of {speechState.totalSentences}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Speed selector */}
                  <div className="flex items-center gap-1 text-[11px] border rounded px-1.5 py-0.5" style={{ borderColor: theme.border }}>
                    {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => narratorRef.current?.setRate(rate)}
                        className={`px-1 rounded cursor-pointer ${speechState.rate === rate ? 'font-bold text-amber-600' : 'opacity-70 hover:opacity-100'}`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      narratorRef.current?.stop();
                      setShowNarrator(false);
                    }}
                    className="p-1 rounded hover:bg-stone-500/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => narratorRef.current?.prev()}
                  className="p-1.5 rounded hover:bg-stone-500/10 cursor-pointer"
                  title="Previous Sentence"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (speechState.isPlaying) {
                      narratorRef.current?.pause();
                    } else {
                      narratorRef.current?.play();
                    }
                  }}
                  className="p-2 rounded-full text-white shadow-xs cursor-pointer hover:opacity-90 transition-transform active:scale-95"
                  style={{ backgroundColor: theme.accent }}
                  title={speechState.isPlaying ? 'Pause' : 'Play'}
                >
                  {speechState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => narratorRef.current?.next()}
                  className="p-1.5 rounded hover:bg-stone-500/10 cursor-pointer"
                  title="Next Sentence"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="0"
                  max={Math.max(0, speechState.totalSentences - 1)}
                  value={speechState.currentSentenceIndex}
                  onChange={(e) => narratorRef.current?.seek(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              {/* Spoken sentence snippet preview */}
              {speechState.currentText && (
                <p className="text-xs italic opacity-85 truncate px-1" style={{ color: theme.textMuted }}>
                  "{speechState.currentText}"
                </p>
              )}
            </div>
          )}

          {/* Rendered HTML with exquisite typography styling */}
          <div 
            className="markdown-body prose-content"
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
          />
        </article>
      </div>

      {/* Slide-out Table of Contents Sidebar */}
      {showToc && (
        <aside 
          className="no-print absolute top-0 right-0 bottom-0 w-72 border-l shadow-xl z-30 flex flex-col transition-all backdrop-blur-xs select-none"
          style={{
            backgroundColor: theme.bgSecondary,
            borderColor: theme.border,
            color: theme.text,
          }}
        >
          <div 
            className="p-4 border-b flex items-center justify-between shrink-0 font-sans"
            style={{ borderColor: theme.border }}
          >
            <div className="flex items-center gap-2">
              <ListTree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-xs uppercase tracking-wider">Document Outline</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowToc(false)}
              className="p-1.5 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
              style={{ color: theme.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={tocListRef} className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-sans">
            {headings.length === 0 ? (
              <div className="text-center py-8 opacity-60">
                No headings found in markdown. Use # or ## to create outline items.
              </div>
            ) : (
              visibleHeadings.map(({ heading: h, hasChildren, isCollapsed }) => {
                const isActive = activeHeadingId === h.id;
                const indentPx = (h.level - 1) * 12 + 6;
                
                return (
                  <div
                    key={h.id}
                    data-toc-id={h.id}
                    onClick={() => scrollToHeading(h.id)}
                    style={{ 
                      paddingLeft: `${indentPx}px`,
                      color: isActive 
                        ? (theme.category === 'dark' ? '#ffffff' : '#000000') 
                        : theme.text,
                    }}
                    className={`w-full text-left py-1.5 pr-2.5 rounded-md transition-all flex items-center gap-1 group cursor-pointer border-l-2 ${
                      isActive 
                        ? 'bg-amber-500/20 border-amber-600 font-bold shadow-2xs' 
                        : 'border-transparent hover:bg-stone-500/10 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={(e) => toggleCollapseHeading(h.id, e)}
                        className="p-0.5 rounded hover:bg-stone-500/20 transition-colors cursor-pointer shrink-0"
                        title={isCollapsed ? "Expand section" : "Collapse section"}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4.5 shrink-0 inline-block" />
                    )}
                    <span className={`truncate flex-1 text-xs ${h.level === 1 ? 'font-bold' : ''}`}>{h.text}</span>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Image Lightbox Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out select-none"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img 
              src={zoomedImage.src} 
              alt={zoomedImage.alt}
              className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl" 
            />
            {zoomedImage.alt && (
              <p className="mt-3 text-sm text-stone-300 italic font-serif max-w-lg text-center">
                {zoomedImage.alt}
              </p>
            )}
            <button 
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-400 p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Mermaid Diagram Interactive Viewer Modal */}
      {viewingMermaid && (
        <MermaidViewerModal
          isOpen={Boolean(viewingMermaid)}
          onClose={() => setViewingMermaid(null)}
          rawCode={viewingMermaid.rawCode}
          svgHtml={viewingMermaid.svgHtml}
          theme={theme}
        />
      )}

      {/* Toast Notification */}
      {copiedCodeToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2 rounded-lg text-xs shadow-xl flex items-center gap-2 animate-bounce select-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copiedCodeToast}</span>
        </div>
      )}
    </div>
  );
});
