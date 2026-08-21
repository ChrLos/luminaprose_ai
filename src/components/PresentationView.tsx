import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Minimize2
} from 'lucide-react';
import { ThemeConfig, TypographySettings } from '../types';
import { parseMarkdownToHtml, clearParseCache } from '../utils/markdownParser';
import { renderMermaidInContainer, subscribeMermaidUpdates } from '../utils/mermaidRenderer';
import { MermaidViewerModal } from './MermaidViewerModal';

interface PresentationViewProps {
  markdown: string;
  theme: ThemeConfig;
  settings: TypographySettings;
  onClose: () => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({
  markdown,
  theme,
  settings,
  onClose,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [viewingMermaid, setViewingMermaid] = useState<{ rawCode: string; svgHtml: string } | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Setup global open viewer handler for presentation slide view
  useEffect(() => {
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

    return () => {
      delete (window as any).__openMermaidViewer;
    };
  }, []);

  const [mermaidVersion, setMermaidVersion] = useState(0);

  useEffect(() => {
    return subscribeMermaidUpdates(() => {
      clearParseCache();
      setMermaidVersion((v) => v + 1);
    });
  }, []);

  // Split markdown by '---' to form slides
  const slides = useMemo(() => {
    const rawSlides = markdown
      .split(/\n\s*---\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    return rawSlides.length > 0 ? rawSlides : [markdown];
  }, [markdown]);

  const totalSlides = slides.length;

  const currentSlideHtml = useMemo(() => {
    return parseMarkdownToHtml(slides[currentSlide] || '', theme.category === 'dark', false);
  }, [slides, currentSlide, theme.category, mermaidVersion]);

  // Render Mermaid diagrams on slide change
  useEffect(() => {
    renderMermaidInContainer(stageRef.current, theme.category === 'dark');
    const timer = setTimeout(() => {
      renderMermaidInContainer(stageRef.current, theme.category === 'dark');
    }, 40);
    return () => clearTimeout(timer);
  }, [currentSlideHtml, theme.category]);

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
      // Reset scroll position to top when changing slides
      if (stageRef.current) stageRef.current.scrollTop = 0;
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
      // Reset scroll position to top when changing slides
      if (stageRef.current) stageRef.current.scrollTop = 0;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Canva-style auto-hiding controls on mouse inactivity
  const showControlsTemporarily = () => {
    setIsControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 2800);
  };

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [currentSlide]);

  // Sync native fullscreen state change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      showControlsTemporarily();

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === ' ' || e.code === 'Space') {
        // If the slide content is scrollable and hasn't reached the bottom, let Space scroll down
        const stage = stageRef.current;
        if (stage && stage.scrollHeight > stage.clientHeight + 20) {
          const isAtBottom = stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 30;
          if (!isAtBottom) {
            // Scroll down smoothly
            stage.scrollBy({ top: stage.clientHeight * 0.7, behavior: 'smooth' });
            e.preventDefault();
            return;
          }
        }
        // If at bottom or not scrollable, advance to next slide
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, totalSlides, onClose]);

  const progressPercentage = ((currentSlide + 1) / totalSlides) * 100;

  return (
    <div 
      data-theme-category={theme.category}
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
      className={`fixed inset-0 z-50 flex flex-col select-none overflow-hidden transition-all ${
        theme.category === 'dark' ? 'theme-dark' : 'theme-light'
      } ${!isControlsVisible ? 'cursor-none' : ''}`}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {/* Slide Top Control Bar (Auto-hiding Canva style) */}
      <div 
        className={`absolute top-0 inset-x-0 z-40 transition-all duration-300 transform ${
          isControlsVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div 
          className="h-14 px-6 flex items-center justify-between border-b backdrop-blur-md shadow-md"
          style={{ 
            borderColor: theme.border, 
            backgroundColor: `${theme.bgSecondary}ee` 
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-serif italic font-bold text-base">Presentation View</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full border font-mono font-medium" style={{ borderColor: theme.border, color: theme.textMuted }}>
              Slide {currentSlide + 1} of {totalSlides}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
              title="Exit Presentation (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full h-1 bg-stone-300/40 dark:bg-stone-800/60">
          <div 
            className="h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%`, backgroundColor: theme.accent }}
          />
        </div>
      </div>

      {/* Floating Edge Navigators (Previous / Next) */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={currentSlide === 0}
        aria-label="Previous Slide"
        className={`absolute left-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full border shadow-lg flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-0 disabled:pointer-events-none ${
          isControlsVisible ? 'opacity-80 hover:opacity-100 hover:scale-105' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: theme.bgElevated,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        disabled={currentSlide === totalSlides - 1}
        aria-label="Next Slide"
        className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full border shadow-lg flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-0 disabled:pointer-events-none ${
          isControlsVisible ? 'opacity-80 hover:opacity-100 hover:scale-105' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: theme.bgElevated,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Viewport Stage (Compensates for long content with dedicated padding and fluid scroll) */}
      <div 
        ref={stageRef}
        className="relative w-full h-full overflow-y-auto px-4 sm:px-10 lg:px-16 pt-20 pb-24 flex justify-center scroll-smooth"
      >
        <div 
          className="my-auto w-full max-w-4xl p-8 sm:p-14 lg:p-16 rounded-2xl shadow-xl border flex flex-col justify-center transition-all"
          style={{
            backgroundColor: theme.bgElevated,
            borderColor: theme.border,
            fontFamily: settings.fontFamily === 'Newsreader' ? 'var(--font-serif-literary)' : 'var(--font-sans-clean)',
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
          <div 
            className="markdown-body presentation-slide-content leading-relaxed text-base sm:text-lg"
            dangerouslySetInnerHTML={{ __html: currentSlideHtml }}
          />
        </div>
      </div>

      {/* Slide Bottom Navigation Dock (Auto-hiding Canva style) */}
      <div 
        className={`absolute bottom-0 inset-x-0 z-40 transition-all duration-300 transform ${
          isControlsVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div 
          className="h-16 px-6 flex items-center justify-between border-t backdrop-blur-md shadow-lg"
          style={{ 
            borderColor: theme.border, 
            backgroundColor: `${theme.bgSecondary}ee` 
          }}
        >
          <div className="text-xs font-mono hidden sm:flex items-center gap-1.5" style={{ color: theme.textMuted }}>
            <span>Navigate:</span>
            <kbd className="px-1.5 py-0.5 rounded border border-stone-400/40 font-semibold text-[11px]">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-stone-400/40 font-semibold text-[11px]">→</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 rounded border border-stone-400/40 font-semibold text-[11px]">Space</kbd>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-500/10 cursor-pointer transition-colors"
              style={{ borderColor: theme.border }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentSlide === totalSlides - 1}
              className="flex items-center gap-1 px-5 py-2 rounded-lg text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-sm cursor-pointer transition-all hover:opacity-90"
              style={{ backgroundColor: theme.accent }}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mermaid Diagram Pan & Zoom Modal */}
      {viewingMermaid && (
        <MermaidViewerModal
          isOpen={Boolean(viewingMermaid)}
          onClose={() => setViewingMermaid(null)}
          rawCode={viewingMermaid.rawCode}
          svgHtml={viewingMermaid.svgHtml}
          theme={theme}
        />
      )}
    </div>
  );
};
