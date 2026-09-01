import React from 'react';
import { X, Sparkles, Palette, Zap, Wrench, Shield, AlertTriangle, Rocket, Check } from 'lucide-react';
import { ThemeConfig } from '../types';
import { useFocusTrap } from '../utils/useFocusTrap';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  version?: string;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  theme,
  version = '1.2.1',
}) => {
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const SECTIONS = [
    {
      title: 'New Features',
      badge: '✨',
      icon: <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />,
      colorClass: 'border-amber-500/20 bg-amber-500/5',
      items: [
        {
          feature: 'Recycle bin.',
          desc: 'Deleted documents now stay in a dedicated Recycle Bin for 14 days before permanent removal, allowing easy restoration.',
        },
        {
          feature: 'Storage recovery scanner.',
          desc: 'A new storage scanner checks legacy browser storage slots and snapshot records to recover previously saved notes.',
        },
        {
          feature: 'Dual word count.',
          desc: 'The status bar and reader view now show readable prose words and total raw tokens separately, along with a detailed metrics popover.',
        },
        {
          feature: 'Copy selection as markdown.',
          desc: 'You can now highlight any text in the reader view and copy it directly to your clipboard as clean Markdown syntax.',
        },
        {
          feature: 'Smart list continuation.',
          desc: 'Pressing Enter on bullet lists, numbered items, or task checkboxes automatically continues the list on the next line.',
        },
        {
          feature: 'Line sorting tool.',
          desc: 'You can now sort highlighted lines alphabetically or naturally by number directly from the editor toolbar.',
        },
        {
          feature: 'Side-by-side snapshot comparison.',
          desc: 'Version history now includes a comparison view to inspect line-by-line differences before restoring an older version.',
        },
        {
          feature: 'Underline formatting.',
          desc: 'You can now underline text using the editor toolbar, keyboard shortcuts, or standard underline tags.',
        },
      ],
    },
    {
      title: 'UI/UX Improvements',
      badge: '🎨',
      icon: <Palette className="w-4 h-4 text-purple-500 shrink-0" />,
      colorClass: 'border-purple-500/20 bg-purple-500/5',
      items: [
        {
          feature: 'Improved light theme readability.',
          desc: 'Fixed low-contrast text and bright notification banners across the document manager and Recycle Bin when using light themes.',
        },
        {
          feature: 'Collapsible outline navigation.',
          desc: 'Headings in the document outline can now be folded, and the active section automatically highlights as you scroll.',
        },
        {
          feature: 'Paginated command palette.',
          desc: 'Document listings in the quick command palette now display in clean batches of 8 items to keep actions easy to find.',
        },
        {
          feature: 'Cleaned up search layout.',
          desc: 'Search and replace inputs now fit within mobile and split-screen viewports without causing layout overflow.',
        },
        {
          feature: 'Refined HTML exports.',
          desc: 'Exported standalone HTML documents now match the preview pane typography and include a collapsible outline.',
        },
      ],
    },
    {
      title: 'Performance and Speed',
      badge: '⚡',
      icon: <Zap className="w-4 h-4 text-emerald-500 shrink-0" />,
      colorClass: 'border-emerald-500/20 bg-emerald-500/5',
      items: [
        {
          feature: 'Smoother split-view scrolling.',
          desc: 'Rebuilt the dual-pane sync engine with binary search alignment and animation frame batching to eliminate stutter during fast scrolling.',
        },
        {
          feature: 'Fast Myers diff engine.',
          desc: 'Replaced the revision comparison engine with the Myers diff algorithm, accelerating line comparisons on large documents.',
        },
        {
          feature: 'Math formula caching.',
          desc: 'Rendered KaTeX equations are now cached in memory to eliminate re-rendering pauses while editing text around math formulas.',
        },
        {
          feature: 'Responsive typing loop.',
          desc: 'Readability analysis and background metric calculations now run on deferred schedules so typing remains smooth at 60 frames per second.',
        },
        {
          feature: 'Fast search minimap.',
          desc: 'Optimized the search scrollbar minimap to handle thousands of matches without slowing down typing.',
        },
        {
          feature: 'Cached bionic reading.',
          desc: 'Cached paragraph text structures for bionic reading to eliminate repeated parsing pauses during scrolling.',
        },
        {
          feature: 'On-demand PDF module loading.',
          desc: 'Heavy PDF export libraries now load only when you open the export window, reducing initial startup weight.',
        },
        {
          feature: 'Efficient modal rendering.',
          desc: 'Inactive popups and drawers no longer participate in background render passes while you type.',
        },
      ],
    },
    {
      title: 'Fixes',
      badge: '🛠️',
      icon: <Wrench className="w-4 h-4 text-sky-500 shrink-0" />,
      colorClass: 'border-sky-500/20 bg-sky-500/5',
      items: [
        {
          feature: 'Accurate markdown line numbers.',
          desc: 'Fixed an issue where code blocks and math formulas caused preview line numbers to drift out of sync.',
        },
        {
          feature: 'Smart quote backspace correction.',
          desc: 'Pressing Backspace between smart double quotes now converts them back to standard double quotes.',
        },
        {
          feature: 'Fixed reader text selection.',
          desc: 'Highlighting text in the reader view no longer drops the selection when the action popup appears.',
        },
        {
          feature: 'Contained indented code scrolling.',
          desc: 'Indented code lines and tabbed text now scroll within their own box instead of widening the whole page.',
        },
        {
          feature: 'Reliable internal document links.',
          desc: 'Clicking in-page links now scrolls smoothly to target sections without jumping the layout.',
        },
        {
          feature: 'Consistent typing sounds.',
          desc: 'Typewriter keystroke audio now plays reliably on mobile devices and during rapid typing.',
        },
        {
          feature: 'Standardized hook paths.',
          desc: 'Reorganized internal focus trap modules to follow project conventions while preserving legacy import compatibility.',
        },
        {
          feature: 'Fix Stale Document.',
          desc: 'Fixing document not able to be saved or changed because of the database migration.',
        },
      ],
    },
    {
      title: 'Security & Reliability',
      badge: '🔐',
      icon: <Shield className="w-4 h-4 text-blue-500 shrink-0" />,
      colorClass: 'border-blue-500/20 bg-blue-500/5',
      items: [
        {
          feature: 'Automatic storage management.',
          desc: 'Scroll position history is now pruned automatically to prevent browser storage limit errors.',
        },
        {
          feature: 'Reliable text narration and audio cleanup.',
          desc: 'Long-form text speech playback no longer stalls on long sections and cleans up memory when stopped.',
        },
        {
          feature: 'Scroll loop protection.',
          desc: 'Prevented split-pane scroll events from echoing back and forth between the editor and preview.',
        },
        {
          feature: 'Modular state management.',
          desc: 'Extracted core workspace logic into dedicated state hooks to eliminate stale closures and background update loops.',
        },
      ],
    },
    {
      title: 'Breaking Changes & Migration',
      badge: '⚠️',
      icon: <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />,
      colorClass: 'border-orange-500/20 bg-orange-500/5',
      items: [
        {
          feature: 'Storage key migration.',
          desc: 'The application now automatically imports notes stored across legacy keys and dual-writes to current and previous storage formats.',
        },
        {
          feature: 'Centralized application defaults.',
          desc: 'Internal configuration defaults now reference unified constants, standardizing settings handling across all modules.',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className="relative max-w-2xl w-full max-h-[88vh] flex flex-col rounded-2xl shadow-2xl border z-10 overflow-hidden outline-hidden"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg tracking-tight">What&apos;s New in Lumina Prose</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  v{version}
                </span>
              </div>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Explore the latest features, enhancements, and performance updates.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-500/10 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Changelog Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed flex-1">
          {SECTIONS.map((sec, idx) => (
            <div key={idx} className="space-y-2.5">
              <div className="flex items-center gap-2 border-b pb-1.5" style={{ borderColor: theme.border }}>
                <span className="text-base">{sec.badge}</span>
                <h3 className="font-bold text-sm tracking-tight" style={{ color: theme.text }}>
                  {sec.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {sec.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className={`p-3 rounded-xl border transition-all ${sec.colorClass}`}
                    style={{ borderColor: theme.border }}
                  >
                    <p style={{ color: theme.text }}>
                      <strong className="font-semibold">{item.feature}</strong>{' '}
                      <span style={{ color: theme.textMuted }}>{item.desc}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-3.5 border-t shrink-0"
          style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
        >
          <span className="text-[11px]" style={{ color: theme.textMuted }}>
            Press <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-mono">Esc</kbd> anytime to dismiss
          </span>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-md transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Got it, explore now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
