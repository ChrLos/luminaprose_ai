import React, { useEffect, useRef, useState, useMemo, useCallback, useDeferredValue } from 'react';
import { 
  ListTree, 
  X, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Minus, 
  Plus,
  Volume2,
  Play,
  Pause,
  SkipForward,
  SkipBack
} from 'lucide-react';
import { 
  ThemeConfig, 
  TypographySettings, 
  ReadabilityMetrics, 
  TocHeading 
} from '../types';
import { parseMarkdownToHtml, extractHeadings } from '../utils/markdownParser';
import { calculateReadability } from '../utils/readability';
import { applyBionicReading } from '../utils/bionicReader';
import { DocumentNarrator, SpeechState } from '../utils/speechNarrator';

interface PreviewProps {
  markdown: string;
  onUpdateMarkdown: (newMarkdown: string) => void;
  theme: ThemeConfig;
  settings: TypographySettings;
  onUpdateSettings?: (newSettings: Partial<TypographySettings>) => void;
  onOpenTypography?: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScrollSync?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  onScrollDirectionChange?: (isVisible: boolean) => void;
}

export const Preview: React.FC<PreviewProps> = React.memo(({
  markdown,
  onUpdateMarkdown,
  theme,
  settings,
  onUpdateSettings,
  onOpenTypography,
  scrollRef: externalScrollRef,
  onScrollSync,
  onScrollDirectionChange,
}) => {
  const localScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = externalScrollRef || localScrollRef;
  const outlineBtnRef = useRef<HTMLButtonElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  const headingCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showToc, setShowToc] = useState(false);
  const [isOutlineBtnVisible, setIsOutlineBtnVisible] = useState(true);
  const [isScrollHeaderVisible, setIsScrollHeaderVisible] = useState(true);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [activeHeadingText, setActiveHeadingText] = useState<string>('');
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const [copiedCodeToast, setCopiedCodeToast] = useState<string | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);

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
      narratorRef.current?.stop();
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

  // Parse HTML cleanly with KaTeX and syntax highlighting
  const rawParsedHtml = useMemo(() => {
    return parseMarkdownToHtml(deferredMarkdown, {
      highlightSyntax: settings.highlightSyntax,
      showLineNumbers: settings.showLineNumbers,
    });
  }, [deferredMarkdown, settings.highlightSyntax, settings.showLineNumbers]);

  // Apply Bionic Reading if toggled on (without touching math/code)
  const parsedHtml = useMemo(() => {
    if (!settings.bionicReading) return rawParsedHtml;
    return applyBionicReading(rawParsedHtml);
  }, [rawParsedHtml, settings.bionicReading]);

  // Headings for Table of Contents
  const headings = useMemo(() => extractHeadings(deferredMarkdown), [deferredMarkdown]);

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

    // 3. Task Item Checkbox Handler (Indexed for 100% formatting and duplicate resilience)
    (window as any).__toggleTaskItem = (checkbox: HTMLInputElement) => {
      const taskIdxStr = checkbox.getAttribute('data-task-index');
      if (taskIdxStr === null) return;

      const targetIdx = parseInt(taskIdxStr, 10);
      const isNowChecked = checkbox.checked;
      const lines = markdown.split('\n');

      let currentTaskCount = 0;
      let updated = false;

      const newLines = lines.map((line) => {
        const match = line.match(/^(\s*[-*+]\s+)\[([ xX])\](\s+.*)$/);
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
      delete (window as any).__toggleTaskItem;
    };
  }, [markdown, onUpdateMarkdown]);

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
    if (!settings.readingGuide || !containerRef.current) return;
    const clientY = e.clientY;
    if (mouseRafRef.current) return;

    mouseRafRef.current = requestAnimationFrame(() => {
      mouseRafRef.current = null;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGuideY(clientY - rect.top);
      }
    });
  };

  const handleMouseLeave = () => {
    setGuideY(null);
  };

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
        style={{ willChange: 'scroll-position' }}
        className="preview-container relative flex-1 h-full overflow-y-auto px-6 sm:px-10 lg:px-16 py-8 lg:py-14"
      >
        {/* Subtle Reading Guide Ruler */}
        {settings.readingGuide && guideY !== null && (
          <div 
            className="pointer-events-none absolute left-0 right-0 h-8 -translate-y-1/2 transition-transform duration-75 z-10 opacity-25"
            style={{ 
              top: `${guideY}px`,
              backgroundColor: theme.accent,
              borderTop: `1px dashed ${theme.accent}`,
              borderBottom: `1px dashed ${theme.accent}`,
            }} 
          />
        )}

        {/* Reading Article Envelope */}
        <article 
          className={`mx-auto transition-all ${
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
            className="no-print mb-8 pb-3.5 border-b flex flex-wrap items-center justify-between text-xs font-sans gap-3 select-none"
            style={{ borderColor: theme.border, color: theme.textMuted }}
          >
            {/* Left: Reading stats */}
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium" title="Estimated Reading Time">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{readability.readingTimeMinutes} min read ({readability.words.toLocaleString()} words)</span>
              </span>

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

          <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-sans">
            {headings.length === 0 ? (
              <div className="text-center py-8 opacity-60">
                No headings found in markdown. Use # or ## to create outline items.
              </div>
            ) : (
              headings.map((h) => {
                const isActive = activeHeadingId === h.id;
                const indentPx = (h.level - 1) * 16 + 12;
                
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => scrollToHeading(h.id)}
                    style={{ 
                      paddingLeft: `${indentPx}px`,
                      color: isActive 
                        ? (theme.category === 'dark' ? '#ffffff' : '#000000') 
                        : theme.text,
                    }}
                    className={`w-full text-left py-1.5 pr-2.5 rounded-md transition-all flex items-center justify-between group cursor-pointer border-l-2 ${
                      isActive 
                        ? 'bg-amber-500/20 border-amber-600 font-bold shadow-2xs' 
                        : 'border-transparent hover:bg-stone-500/10 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <span className={`truncate text-xs ${h.level === 1 ? 'font-bold' : ''}`}>{h.text}</span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100 text-amber-700 dark:text-amber-400' : 'opacity-0 group-hover:opacity-60'}`} />
                  </button>
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
