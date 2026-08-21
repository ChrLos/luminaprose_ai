import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { ThemeConfig } from '../types';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: 'Ctrl / Cmd + P', action: 'Open Global Command Palette' },
    { key: 'Ctrl / Cmd + F', action: 'Find in Document' },
    { key: 'Ctrl / Cmd + H', action: 'Find & Replace' },
    { key: 'Ctrl / Cmd + K', action: 'Insert Hyperlink [text](url)' },
    { key: 'Ctrl / Cmd + Z', action: 'Undo edit' },
    { key: 'Ctrl / Cmd + Shift + Z / Y', action: 'Redo edit' },
    { key: 'Backspace', action: 'Revert smart symbol (→ back to ->)' },
    { key: 'Ctrl / Cmd + 1', action: 'Switch to Split View' },
    { key: 'Ctrl / Cmd + 2', action: 'Switch to Reader Mode' },
    { key: 'Ctrl / Cmd + 3', action: 'Switch to Editor Mode' },
    { key: 'Ctrl / Cmd + B', action: 'Bold text (**)' },
    { key: 'Ctrl / Cmd + I', action: 'Italic text (*)' },
    { key: 'Ctrl / Cmd + /', action: 'Open Shortcuts Helper' },
    { key: 'Tab', action: 'Indent 2 spaces' },
    { key: 'Escape', action: 'Close modal / Exit presentation' },
    { key: 'Arrow Right / Space', action: 'Next Slide in Presentation' },
    { key: 'Arrow Left', action: 'Previous Slide in Presentation' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose} 
      />

      <div 
        className="relative max-w-md w-full rounded-2xl shadow-2xl border p-6 z-10 space-y-5"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-base">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {SHORTCUTS.map((s, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-stone-500/5 transition-colors text-xs"
            >
              <span style={{ color: theme.text }}>{s.action}</span>
              <kbd 
                className="px-2 py-1 rounded font-mono font-semibold border text-[11px]"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.border,
                  color: theme.textMuted,
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t" style={{ borderColor: theme.border }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border hover:bg-stone-500/10 cursor-pointer transition-colors"
            style={{ borderColor: theme.border }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
