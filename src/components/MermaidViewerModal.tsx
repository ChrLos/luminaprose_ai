import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Maximize2,
  Move,
  Workflow,
  Crosshair,
  Maximize,
  Minimize2
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { getCachedMermaidSvg, renderMermaidSvg } from '../utils/mermaidRenderer';
import { useFocusTrap } from '../utils/useFocusTrap';

interface MermaidViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawCode: string;
  svgHtml: string;
  theme: ThemeConfig;
}

export const MermaidViewerModal: React.FC<MermaidViewerModalProps> = ({
  isOpen,
  onClose,
  rawCode,
  svgHtml: initialSvgHtml,
  theme,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [baseFitScale, setBaseFitScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState<boolean>(false);
  const [activeSvg, setActiveSvg] = useState<string>(() => {
    if (initialSvgHtml && initialSvgHtml.includes('<svg')) return initialSvgHtml;
    const cached = getCachedMermaidSvg(rawCode, theme.category === 'dark');
    return cached || initialSvgHtml || '';
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const lastTouchTimeRef = useRef<number>(0);

  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  /**
   * Prepares Mermaid SVG by parsing viewBox intrinsic dimensions and enforcing
   * explicit SVG width & height style attributes so vector scale is exact and zero-margin.
   */
  const prepareSvgForCanvas = useCallback((rawSvg: string): string => {
    if (!rawSvg) return '';
    if (!rawSvg.includes('<svg')) return rawSvg;

    let width = 0;
    let height = 0;

    // 1. Try extracting viewBox
    const viewBoxMatch = rawSvg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
    if (viewBoxMatch && viewBoxMatch[1]) {
      const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        width = parts[2];
        height = parts[3];
      }
    }

    // 2. Fallback to width/height attrs
    if (!width || !height) {
      const wMatch = rawSvg.match(/width\s*=\s*["']([0-9.]+)(px)?["']/i);
      const hMatch = rawSvg.match(/height\s*=\s*["']([0-9.]+)(px)?["']/i);
      if (wMatch && wMatch[1]) width = parseFloat(wMatch[1]);
      if (hMatch && hMatch[1]) height = parseFloat(hMatch[1]);
    }

    if (!width || width <= 0) width = 800;
    if (!height || height <= 0) height = 500;

    // Measure viewport to set base SVG canvas dimensions so 100% zoom naturally fills screen
    const canvasW = window.innerWidth || 1200;
    const canvasH = (window.innerHeight || 800) - 80;
    const availW = Math.max(canvasW - 64, 320);
    const availH = Math.max(canvasH - 80, 240);

    const aspect = width / height;
    let fitW = availW;
    let fitH = availW / aspect;
    if (fitH > availH) {
      fitH = availH;
      fitW = availH * aspect;
    }

    // Enforce healthy baseline minimum width (at least 800px) so small diagrams render large & crisp
    if (fitW < 800) {
      fitW = 800;
      fitH = 800 / aspect;
    }

    const roundedW = Math.round(fitW);
    const roundedH = Math.round(fitH);

    return rawSvg.replace(/<svg([^>]*)>/i, (_, attrs) => {
      const cleanedAttrs = attrs
        .replace(/\s*(width|height)\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');

      return `<svg${cleanedAttrs} width="${roundedW}" height="${roundedH}" style="width: ${roundedW}px !important; height: ${roundedH}px !important; min-width: ${roundedW}px !important; min-height: ${roundedH}px !important; max-width: none !important; max-height: none !important; display: block !important;">`;
    });
  }, []);

  /**
   * Intelligently calculates optimal fit scale so diagram fills the screen
   * comfortably without leaving excessive whitespace on sides.
   */
  const calculateOptimalFitScale = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!content) return 1;

    const svg = content.querySelector('svg');
    if (!svg) return 1;

    const svgW = parseFloat(svg.getAttribute('width') || '') || svg.clientWidth || 800;
    const svgH = parseFloat(svg.getAttribute('height') || '') || svg.clientHeight || 500;

    const canvasW = container && container.clientWidth > 0 ? container.clientWidth : (window.innerWidth || 1200);
    const canvasH = container && container.clientHeight > 0 ? container.clientHeight : ((window.innerHeight || 800) - 60);

    const availW = Math.max(canvasW - 48, 200);
    const availH = Math.max(canvasH - 64, 200);

    const scaleX = availW / svgW;
    const scaleY = availH / svgH;

    const fit = Math.min(scaleX, scaleY);
    
    // Keep fit baseline around 1.0 (clamped between 0.8 and 3.0) so 100% displays perfectly on screen
    return Number(Math.min(Math.max(fit, 0.8), 3.0).toFixed(2));
  }, []);

  const handleFitToScreen = useCallback(() => {
    const fit = calculateOptimalFitScale();
    setBaseFitScale(fit);
    setScale(fit);
    setPosition({ x: 0, y: 0 });
  }, [calculateOptimalFitScale]);

  // Sync active SVG and dynamically render if needed
  useEffect(() => {
    if (!isOpen) return;

    const cached = getCachedMermaidSvg(rawCode, theme.category === 'dark');
    if (cached) {
      setActiveSvg(prepareSvgForCanvas(cached));
      return;
    }

    if (initialSvgHtml && initialSvgHtml.includes('<svg')) {
      setActiveSvg(prepareSvgForCanvas(initialSvgHtml));
      return;
    }

    // Render on the fly
    let isSubscribed = true;
    renderMermaidSvg(rawCode, theme.category === 'dark')
      .then((svg) => {
        if (isSubscribed) setActiveSvg(prepareSvgForCanvas(svg));
      })
      .catch((err) => {
        if (isSubscribed) {
          setActiveSvg(`
            <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-xs">
              <div class="font-bold mb-1">Diagram Render Error</div>
              <div class="text-[11px]">${err?.message || 'Syntax error'}</div>
            </div>
          `);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, rawCode, initialSvgHtml, theme.category, prepareSvgForCanvas]);

  // Once SVG is mounted in the DOM, compute optimal auto-fit scale
  useEffect(() => {
    if (!isOpen || !activeSvg) return;

    const frameId = requestAnimationFrame(() => {
      const fit = calculateOptimalFitScale();
      setBaseFitScale(fit);
      setScale(fit);
      setPosition({ x: 0, y: 0 });
    });

    return () => cancelAnimationFrame(frameId);
  }, [isOpen, activeSvg, calculateOptimalFitScale]);

  // Handle ResizeObserver to maintain diagram centering on viewport/container size changes
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      // If position drifted off-screen during dynamic window resize, clamp it
      setPosition((prev) => {
        const boundX = container.clientWidth * 1.5;
        const boundY = container.clientHeight * 1.5;
        if (Math.abs(prev.x) > boundX || Math.abs(prev.y) > boundY) {
          return { x: 0, y: 0 };
        }
        return prev;
      });
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleFitToScreen();
      } else if (e.key === '1') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, scale, handleFitToScreen]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.35, (baseFitScale || 1) * 25));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.35, (baseFitScale || 1) * 0.1));
  };

  const handleReset = () => {
    handleFitToScreen();
  };

  const handleActualSize = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prev) => {
      const next = prev * zoomFactor;
      const maxLimit = (baseFitScale || 1) * 25;
      const minLimit = (baseFitScale || 1) * 0.1;
      return Math.min(Math.max(next, minLimit), maxLimit);
    });
  }, [baseFitScale]);

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Single finger drag
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    } else if (e.touches.length === 2) {
      // Two finger pinch to zoom
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / pinchStartDistRef.current;
      const newScale = Math.min(Math.max(pinchStartScaleRef.current * ratio, 0.15), 8);
      setScale(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      pinchStartDistRef.current = null;

      // Double-tap to reset detection
      const now = Date.now();
      if (now - lastTouchTimeRef.current < 300) {
        handleFitToScreen();
      }
      lastTouchTimeRef.current = now;
    } else if (e.touches.length === 1) {
      // Transition from pinch back to 1-finger drag
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
      pinchStartDistRef.current = null;
    }
  };

  // Copy raw Mermaid code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Download rendered SVG file
  const handleDownloadSvg = () => {
    if (!activeSvg) return;
    const blob = new Blob([activeSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mermaid-diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isTransformed = Math.abs(scale - baseFitScale) > 0.05 || position.x !== 0 || position.y !== 0;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mermaid Diagram Viewer"
    >
      <div ref={modalRef} className="contents">
        {/* Top Controls Bar */}
        <div 
          className="w-full flex items-center justify-between px-4 py-3 border-b shadow-md z-10 shrink-0"
          style={{
            backgroundColor: theme.bgElevated,
            borderColor: theme.border,
            color: theme.text,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title & Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight flex items-center gap-2 truncate">
                <span>Mermaid Diagram Canvas</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border opacity-75 font-normal" style={{ borderColor: theme.border }}>
                  Auto-Fitted to Screen
                </span>
              </h3>
              <p className="text-[11px] opacity-60 hidden sm:block">
                Drag or touch to pan • Scroll or pinch to zoom • Double-tap/click to fit
              </p>
            </div>
          </div>

          {/* Toolbar Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div 
              className="flex items-center rounded-lg border p-0.5"
              style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
            >
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFitToScreen}
                className="px-2 py-1 text-xs font-mono font-medium hover:bg-stone-500/10 rounded-md transition-colors cursor-pointer min-w-[56px] text-center"
                title="Click to Auto-Fit to Screen (0)"
                aria-label="Current zoom level"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
                title="Zoom In (+)"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Fit Screen Button */}
            <button
              type="button"
              onClick={handleFitToScreen}
              className={`p-2 rounded-lg border hover:bg-stone-500/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                isTransformed ? 'text-amber-500 border-amber-500/60 font-bold' : ''
              }`}
              style={{ borderColor: isTransformed ? undefined : theme.border }}
              title="Auto-Fit Diagram to Screen (0)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fit Screen</span>
            </button>

            {/* 100% 1:1 Button */}
            <button
              type="button"
              onClick={handleActualSize}
              className="p-2 rounded-lg border hover:bg-stone-500/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              style={{ borderColor: theme.border }}
              title="Actual 1:1 Scale (1)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">100%</span>
            </button>

            {/* Download SVG */}
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="p-2 rounded-lg border hover:bg-stone-500/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              style={{ borderColor: theme.border }}
              title="Export as SVG Image"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export SVG</span>
            </button>

            {/* Copy Code */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 rounded-lg border hover:bg-stone-500/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              style={{ borderColor: theme.border }}
              title="Copy Raw Mermaid Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-stone-500/20 transition-colors cursor-pointer text-stone-400 hover:text-white"
              title="Close Canvas (Esc)"
              aria-label="Close Diagram Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Interactive Pan & Zoom Canvas */}
        <div 
          ref={containerRef}
          className={`flex-1 relative overflow-hidden flex items-center justify-center touch-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleFitToScreen}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle grid background for drafting canvas feel */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: `radial-gradient(circle, ${theme.category === 'dark' ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* Quick Auto-Recenter Button when transformed */}
          {isTransformed && (
            <button
              type="button"
              onClick={handleFitToScreen}
              className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg border shadow-lg text-xs font-medium flex items-center gap-1.5 backdrop-blur-md hover:scale-105 transition-transform cursor-pointer"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.border,
                color: theme.accent,
              }}
              title="Re-center and Auto-Fit diagram to screen"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Auto-Fit Screen</span>
            </button>
          )}

          {/* Floating Pan Hint Pill */}
          <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full border shadow-lg text-[11px] font-sans flex items-center gap-1.5 pointer-events-none opacity-80 backdrop-blur-xs"
            style={{
              backgroundColor: theme.bgElevated,
              borderColor: theme.border,
              color: theme.text,
            }}
          >
            <Move className="w-3 h-3 text-amber-500" />
            <span>Drag / Touch to pan • Scroll / Pinch to zoom • Double-click / tap to fit</span>
          </div>

          {/* Scalable & Pannable Content with Dynamic Origin */}
          <div
            ref={contentRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            }}
            className="mermaid-viewer-content p-6 max-w-none flex items-center justify-center pointer-events-auto"
            dangerouslySetInnerHTML={{ __html: activeSvg }}
          />
        </div>
      </div>
    </div>
  );
};
