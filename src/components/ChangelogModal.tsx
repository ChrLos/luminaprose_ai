import React from 'react';
import { X, Sparkles, Palette, Zap, Wrench, Rocket, Check } from 'lucide-react';
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
  version = 'v1.1.1',
}) => {
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const SECTIONS = [
    {
      title: 'New features',
      badge: '✨',
      icon: <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />,
      colorClass: 'border-amber-500/20 bg-amber-500/5',
      items: [
        {
          feature: 'Visual table generator.',
          desc: 'You can build and edit tables in an interactive spreadsheet grid with column alignment controls and starter templates.',
        },
        {
          feature: 'Find and replace.',
          desc: 'A dedicated search bar lets you locate matches, navigate between occurrences, and replace text across your document.',
        },
        {
          feature: 'Smart typography.',
          desc: 'The editor converts typed arrows and quotes into typographical symbols as you write, and pressing Backspace immediately restores the raw characters.',
        },
        {
          feature: 'Mermaid diagram viewer.',
          desc: 'Mermaid diagrams render directly in preview and presentation modes. You can expand any diagram into a full-screen canvas to pan and zoom.',
        },
        {
          feature: 'Interactive HTML exports.',
          desc: 'Exported HTML files include an interactive diagram viewer with pan controls, zoom up to 2500%, and direct SVG downloads.',
        },
        {
          feature: 'Search minimap ruler.',
          desc: 'A scrollbar ruler highlights where search matches appear across the document so you can jump to any match with one click.',
        },
        {
          feature: 'List style converter.',
          desc: 'You can switch bullet lists into checklists and back, or format multiple selected lines at once.',
        },
        {
          feature: 'Case conversion menu.',
          desc: 'A toolbar dropdown converts selected text to Sentence case, Title Case, uppercase, lowercase, camelCase, kebab-case, or snake_case.',
        },
      ],
    },
    {
      title: 'UI/UX improvements',
      badge: '🎨',
      icon: <Palette className="w-4 h-4 text-purple-500 shrink-0" />,
      colorClass: 'border-purple-500/20 bg-purple-500/5',
      items: [
        {
          feature: 'Reordered navigation bar.',
          desc: 'The scroll sync toggle now sits between the command palette and atmosphere controls, and the central toolbar stays anchored during view switches.',
        },
        {
          feature: 'Updated shortcuts.',
          desc: 'The command palette now opens with Ctrl + P or Cmd + P, leaving Ctrl + K and Cmd + K free for markdown hyperlinks.',
        },
        {
          feature: 'Mechanical keyboard audio.',
          desc: 'Deleting characters with Backspace and pressing Enter trigger distinct acoustic click profiles.',
        },
        {
          feature: 'Command palette structure.',
          desc: 'Commands follow a set category order: Recent Files, Documents, Templates, Actions, View, and Themes.',
        },
        {
          feature: 'Case dropdown display.',
          desc: 'The case conversion menu floats over the editor panes with a drop shadow instead of clipping inside the toolbar.',
        },
        {
          feature: 'Modal keyboard focus.',
          desc: 'Dialogs trap keyboard focus inside their containers until you press Escape.',
        },
      ],
    },
    {
      title: 'Performance and speed',
      badge: '⚡',
      icon: <Zap className="w-4 h-4 text-emerald-500 shrink-0" />,
      colorClass: 'border-emerald-500/20 bg-emerald-500/5',
      items: [
        {
          feature: 'Instant diagram rendering.',
          desc: 'Rendered diagrams are stored in memory so switching views or scrolling loads existing diagrams without flashing or delay.',
        },
        {
          feature: 'Fast typing in long documents.',
          desc: 'Word counts and command lists update only when necessary, keeping the editor responsive during heavy typing sessions.',
        },
        {
          feature: 'Version history virtualization.',
          desc: 'The version history drawer renders only visible snapshots on screen, cutting DOM size on long revision timelines.',
        },
        {
          feature: 'Smooth split scrolling.',
          desc: 'The two-way scroll engine tracks the active pane to stop layout jitter and scrolling feedback loops.',
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
          feature: 'Undo and redo reliability.',
          desc: 'The undo engine captures edits at word boundaries and toolbar actions, preserving history across view mode changes.',
        },
        {
          feature: 'Shortcut conflict resolution.',
          desc: 'Pressing undo shortcuts inside search bars or rename inputs no longer modifies the document in the background.',
        },
        {
          feature: 'Offline math rendering.',
          desc: 'Standalone HTML and PDF exports include local KaTeX styling so equations render properly without an internet connection.',
        },
        {
          feature: 'Diagram zoom and fit.',
          desc: 'Expanded diagrams measure intrinsic dimensions on open to fill the screen cleanly without oversized margins.',
        },
        {
          feature: 'Storage recovery.',
          desc: 'The app detects corrupted local storage on startup and resets safely to sample notes instead of crashing on a blank screen.',
        },
        {
          feature: 'Markdown-aware readability analysis.',
          desc: 'Readability scores no longer need periods on lists, tasks, headings, or table rows.',
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
                  {version}
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
