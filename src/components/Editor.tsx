import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  Image, 
  Table, 
  Divide, 
  Sigma, 
  Info,
  Sparkles
} from 'lucide-react';
import { ThemeConfig, TypographySettings } from '../types';
import { ambientAudio } from '../utils/ambientAudio';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: ThemeConfig;
  settings: TypographySettings;
  playTypewriterSound: boolean;
  scrollRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScrollSync?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  onScrollDirectionChange?: (isVisible: boolean) => void;
}

export const Editor: React.FC<EditorProps> = React.memo(({
  value,
  onChange,
  theme,
  settings,
  playTypewriterSound,
  scrollRef,
  onScrollSync,
  onScrollDirectionChange,
}) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = scrollRef || internalTextareaRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Maintain fast local value for 120 FPS typing
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with prop value when changing documents or external updates
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced parent notification
  const notifyParent = (val: string, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (immediate) {
      onChange(val);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        onChange(val);
      }, 100);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    notifyParent(val, false);
  };

  // Handle typing key click sounds and typewriter centering
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (playTypewriterSound && e.key.length === 1) {
      ambientAudio.playKeyClick();
    }

    // Tab key indent support
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = localValue.substring(0, start) + '  ' + localValue.substring(end);
      setLocalValue(newValue);
      notifyParent(newValue, true);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }

    // Markdown Shortcut handlers: Ctrl+B, Ctrl+I, Ctrl+K
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        insertWrap('**', '**');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        insertWrap('*', '*');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        insertWrap('[', '](url)');
      }
    }
  };

  // Scroll sync handler & direction detection
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
    
    if (onScrollSync) {
      onScrollSync(scrollTop, scrollHeight, clientHeight);
    }

    const delta = scrollTop - lastScrollTopRef.current;
    if (Math.abs(delta) > 8) {
      if (delta > 0 && scrollTop > 40) {
        onScrollDirectionChange?.(false);
      } else if (delta < 0 || scrollTop <= 40) {
        onScrollDirectionChange?.(true);
      }
      lastScrollTopRef.current = scrollTop;
    }
  };

  // Helper to wrap selected text with markdown tokens
  const insertWrap = (before: string, after: string, defaultText = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = localValue.substring(start, end) || defaultText;

    const replacement = `${before}${selectedText}${after}`;
    const newValue = localValue.substring(0, start) + replacement + localValue.substring(end);
    setLocalValue(newValue);
    notifyParent(newValue, true);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
    }, 0);
  };

  // Insert block template
  const insertBlock = (block: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Add newlines around block if needed
    const prefix = start > 0 && localValue[start - 1] !== '\n' ? '\n\n' : '\n';
    const suffix = end < localValue.length && localValue[end] !== '\n' ? '\n\n' : '\n';

    const newValue = localValue.substring(0, start) + prefix + block + suffix + localValue.substring(end);
    setLocalValue(newValue);
    notifyParent(newValue, true);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + block.length;
      textarea.selectionStart = textarea.selectionEnd = newPos;
    }, 0);
  };

  // Insert Callout Admonition
  const insertCallout = (type: 'NOTE' | 'TIP' | 'WARNING' | 'IMPORTANT') => {
    const template = `> [!${type}] Callout Title\n> Write your highlighted message or guidance here.`;
    insertBlock(template);
  };

  // Insert Table template
  const insertTable = () => {
    const tableMd = `| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data Item 1 | Value A | 100 |\n| Data Item 2 | Value B | 200 |`;
    insertBlock(tableMd);
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full overflow-hidden border-r transition-colors"
      style={{
        backgroundColor: theme.bgSecondary,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      {/* Markdown Toolbar */}
      <div 
        className="no-print flex items-center justify-between px-3 py-1.5 border-b overflow-x-auto gap-1 shrink-0 scrollbar-none select-none text-xs"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.bgSecondary,
        }}
      >
        <div className="flex items-center gap-0.5">
          {/* Headings */}
          <button
            type="button"
            onClick={() => insertWrap('# ', '', 'Heading 1')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('## ', '', 'Heading 2')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('### ', '', 'Heading 3')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1" />

          {/* Formatting */}
          <button
            type="button"
            onClick={() => insertWrap('**', '**', 'bold text')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('*', '*', 'italic text')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('~~', '~~', 'strikethrough')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('==', '==', 'highlight')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer font-serif italic text-amber-600 font-bold"
            title="Highlight Text"
          >
            ==
          </button>

          <span className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1" />

          {/* Lists and Quotes */}
          <button
            type="button"
            onClick={() => insertWrap('- ', '', 'List item')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('1. ', '', 'Numbered item')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('- [ ] ', '', 'Task item')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Task Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('> ', '', 'Quote statement')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1" />

          {/* Code, Links, Math, Table */}
          <button
            type="button"
            onClick={() => insertWrap('`', '`', 'code')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('```typescript\n// Write code here\nconsole.log("Hello, Lumina!");\n```')}
            className="px-2 py-1 rounded hover:bg-stone-500/10 transition-colors font-mono text-[11px] font-semibold cursor-pointer"
            title="Code Block"
          >
            {'{ }'}
          </button>
          <button
            type="button"
            onClick={() => insertWrap('[', '](https://example.com)', 'Link title')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Hyperlink (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertWrap('![', '](https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1000)', 'Caption text')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Image"
          >
            <Image className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={insertTable}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Insert Table"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('$$\nE = mc^2\n$$')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="LaTeX Math Formula"
          >
            <Sigma className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertBlock('---\n')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Divider / Slide Break (---)"
          >
            <Divide className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Admonition Callout quick inserts */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertCallout('NOTE')}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer"
            title="Insert Note Callout"
          >
            +Note
          </button>
          <button
            type="button"
            onClick={() => insertCallout('TIP')}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            title="Insert Tip Callout"
          >
            +Tip
          </button>
          <button
            type="button"
            onClick={() => insertCallout('WARNING')}
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer"
            title="Insert Warning Callout"
          >
            +Warn
          </button>
        </div>
      </div>

      {/* Editor Main Text Area */}
      <div className="flex-1 relative flex overflow-hidden">
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck="false"
          placeholder="Start writing in clean Markdown or paste your content here..."
          className="w-full h-full p-6 lg:p-8 resize-none outline-none font-mono text-[14px] leading-relaxed overflow-y-auto transition-colors"
          style={{
            backgroundColor: theme.bg,
            color: theme.text,
            caretColor: theme.accent,
            willChange: 'scroll-position',
          }}
        />
      </div>

      {/* Editor Bottom Status Bar */}
      <div 
        className="no-print h-7 px-4 border-t flex items-center justify-between text-[11px] select-none font-mono shrink-0"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.bgSecondary,
          color: theme.textMuted,
        }}
      >
        <div className="flex items-center gap-3">
          <span>Markdown Source</span>
          <span>•</span>
          <span>{localValue.split('\n').length} lines</span>
        </div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>•</span>
          <span>{localValue.length} chars</span>
        </div>
      </div>
    </div>
  );
});
