import mermaid from 'mermaid';

let isInitialized = false;
let currentThemeMode: 'dark' | 'neutral' = 'neutral';

// In-memory cache of rendered SVGs keyed by `${themeMode}::${rawCode}`
export const mermaidSvgCache = new Map<string, string>();

type MermaidListener = () => void;
const listeners = new Set<MermaidListener>();

/**
 * Subscribe to Mermaid render updates so React components can re-evaluate parsed HTML
 */
export function subscribeMermaidUpdates(listener: MermaidListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyMermaidUpdated() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying mermaid listener:', e);
    }
  });
}

/**
 * Returns cached SVG for diagram code if available, otherwise null.
 */
export function getCachedMermaidSvg(rawCode: string, isDark?: boolean): string | null {
  const trimmed = (rawCode || '').trim();
  if (!trimmed) return null;

  if (isDark !== undefined) {
    const key = `${isDark ? 'dark' : 'neutral'}::${trimmed}`;
    if (mermaidSvgCache.has(key)) return mermaidSvgCache.get(key)!;
  }
  // Try either dark or neutral fallback
  return mermaidSvgCache.get(`dark::${trimmed}`) || mermaidSvgCache.get(`neutral::${trimmed}`) || null;
}

/**
 * Initializes or re-configures Mermaid with theme matching
 */
export function initMermaid(isDark: boolean) {
  const targetTheme = isDark ? 'dark' : 'neutral';
  
  if (!isInitialized || currentThemeMode !== targetTheme) {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: targetTheme,
        securityLevel: 'loose',
        fontFamily: 'inherit',
        suppressErrorRendering: true,
        logLevel: 5, // fatal errors only
      });
      isInitialized = true;
      currentThemeMode = targetTheme;
    } catch (e) {
      console.warn('Mermaid initialize warning:', e);
    }
  }
}

let diagramIdCounter = 0;

// Queue to serialize Mermaid rendering calls and prevent concurrency locks
let renderQueue: Promise<any> = Promise.resolve();

/**
 * Safely renders a single Mermaid diagram string to SVG with timeout and caching
 */
export async function renderMermaidSvg(rawCode: string, isDark: boolean): Promise<string> {
  const trimmed = (rawCode || '').trim();
  if (!trimmed) {
    throw new Error('Diagram content is empty');
  }

  const themeKey = isDark ? 'dark' : 'neutral';
  const cacheKey = `${themeKey}::${trimmed}`;

  if (mermaidSvgCache.has(cacheKey)) {
    return mermaidSvgCache.get(cacheKey)!;
  }

  return new Promise<string>((resolve, reject) => {
    // Chain onto renderQueue, ensuring failures do not break subsequent renders
    renderQueue = renderQueue
      .catch(() => {
        // Recover from any previous queue error
      })
      .then(async () => {
        // Re-check cache in case another queue item rendered the same code
        if (mermaidSvgCache.has(cacheKey)) {
          resolve(mermaidSvgCache.get(cacheKey)!);
          return;
        }

        initMermaid(isDark);
        
        // Generate valid HTML/XML ID (starts with a letter, no colons)
        const uniqueId = `mermaidSvg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}_${++diagramIdCounter}`;

        let isFinished = false;
        const timer = setTimeout(() => {
          if (!isFinished) {
            isFinished = true;
            cleanupStrayElements(uniqueId);
            resolve(`<div class="p-3 my-2 rounded-lg text-xs font-mono border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-left max-w-lg mx-auto"><div class="font-semibold mb-1">⚠️ Diagram Rendering Timeout</div><p class="opacity-80 text-[11px]">The diagram took too long to compile.</p></div>`);
          }
        }, 4000);

        try {
          const { svg } = await mermaid.render(uniqueId, trimmed);
          
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timer);
            cleanupStrayElements(uniqueId);
            
            if (svg && svg.includes('<svg')) {
              if (mermaidSvgCache.size >= 80) {
                const firstKey = mermaidSvgCache.keys().next().value;
                if (firstKey) mermaidSvgCache.delete(firstKey);
              }
              mermaidSvgCache.set(cacheKey, svg);
              notifyMermaidUpdated();
              resolve(svg);
            } else {
              resolve(`<div class="p-3 my-2 rounded-lg text-xs font-mono border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-left max-w-lg mx-auto"><p class="text-[11px]">Empty diagram output</p></div>`);
            }
          }
        } catch (err: any) {
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timer);
            cleanupStrayElements(uniqueId);
            const errMsg = err?.message || 'Diagram syntax error';
            resolve(`
              <div class="p-3 my-2 rounded-lg text-xs font-mono border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-left max-w-lg mx-auto">
                <div class="font-semibold mb-1 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Mermaid Syntax Notice</span>
                </div>
                <p class="opacity-85 text-[11px] truncate">${errMsg}</p>
              </div>
            `);
          }
        }

      });
  });
}

function cleanupStrayElements(uniqueId: string) {
  try {
    const ids = [uniqueId, `d${uniqueId}`, `i${uniqueId}`];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.parentElement) {
        el.remove();
      }
    }
  } catch {
    // Ignore DOM cleanup errors
  }
}

/**
 * Safely renders all Mermaid diagram containers inside a root DOM element
 */
export async function renderMermaidInContainer(container: HTMLElement | null, isDark: boolean) {
  if (!container) return;

  const diagramNodes = container.querySelectorAll<HTMLElement>('.mermaid-diagram[data-mermaid]');
  if (diagramNodes.length === 0) return;

  const currentThemeKey = isDark ? 'dark' : 'neutral';
  let hasNewRender = false;

  for (const node of Array.from(diagramNodes)) {
    const rawCodeEncoded = node.getAttribute('data-mermaid');
    if (!rawCodeEncoded) continue;

    const rawCode = decodeURIComponent(rawCodeEncoded).trim();
    if (!rawCode) {
      node.innerHTML = '<div class="text-xs opacity-50 py-3 font-mono">Empty diagram</div>';
      continue;
    }

    const renderedCode = node.getAttribute('data-rendered-code');
    const renderedTheme = node.getAttribute('data-rendered-theme');

    // If already rendered with matching code and theme and has SVG, keep existing SVG
    if (renderedCode === rawCode && renderedTheme === currentThemeKey && node.querySelector('svg')) {
      continue;
    }

    const cacheKey = `${currentThemeKey}::${rawCode}`;
    if (mermaidSvgCache.has(cacheKey)) {
      const cachedSvg = mermaidSvgCache.get(cacheKey)!;
      node.innerHTML = cachedSvg;
      node.setAttribute('data-rendered-code', rawCode);
      node.setAttribute('data-rendered-theme', currentThemeKey);
      formatSvgElement(node.querySelector('svg'));
      continue;
    }

    try {
      const svg = await renderMermaidSvg(rawCode, isDark);
      node.innerHTML = svg;
      node.setAttribute('data-rendered-code', rawCode);
      node.setAttribute('data-rendered-theme', currentThemeKey);
      formatSvgElement(node.querySelector('svg'));
      hasNewRender = true;
    } catch (err: any) {
      node.setAttribute('data-rendered-code', rawCode);
      node.setAttribute('data-rendered-theme', currentThemeKey);
      node.innerHTML = `
        <div class="p-3 my-2 rounded-lg text-xs font-mono border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-left max-w-lg mx-auto">
          <div class="font-semibold mb-1 flex items-center gap-1.5">
            <span>⚠️</span>
            <span>Mermaid Syntax Notice</span>
          </div>
          <p class="opacity-85 text-[11px] truncate">${err?.message || 'Diagram syntax error'}</p>
        </div>
      `;
    }
  }

  if (hasNewRender) {
    notifyMermaidUpdated();
  }
}

function formatSvgElement(svgElement: SVGElement | null) {
  if (!svgElement) return;
  svgElement.style.maxWidth = '100%';
  svgElement.style.height = 'auto';
  svgElement.style.margin = '0 auto';
  svgElement.style.display = 'block';
}
