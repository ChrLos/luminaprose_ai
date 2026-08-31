import React, { useRef, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import { 
  Bold, 
  Italic, 
  Underline,
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
  Sparkles,
  RotateCcw,
  RotateCw,
  Type,
  ChevronDown,
  Check,
  Search,
  Workflow,
  ArrowUpDown,
} from 'lucide-react';
import { ThemeConfig, TypographySettings } from '../types';
import { ambientAudio } from '../utils/ambientAudio';
import { transformCase, transformLinesList, CaseStyle, ListType } from '../utils/textTransform';
import { checkSmartTypography, handleSmartQuote, isInsideCode, SmartTransformRecord } from '../utils/smartTypography';
import { sortSelectedLinesInDocument, LineSortOptions } from '../utils/lineSorter';
import { getDocScrollPosition, saveDocScrollPosition } from '../utils/scrollStore';
import { calculateReadability } from '../utils/readability';
import { FindReplaceBar } from './FindReplaceBar';
import { SearchMinimapRuler } from './SearchMinimapRuler';
import { TableBuilderModal } from './TableBuilderModal';

interface EditorProps {
  currentDocId?: string;
  value: string;
  onChange: (value: string, isImmediate?: boolean) => void;
  theme: ThemeConfig;
  settings: TypographySettings;
  playTypewriterSound: boolean;
  scrollRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScrollSync?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  onScrollDirectionChange?: (isVisible: boolean) => void;
  onInteraction?: (scroller: 'editor' | 'preview') => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onRecordHistory?: (beforeValue: string, selStart?: number, selEnd?: number) => void;
}

export const Editor: React.FC<EditorProps> = React.memo(({
  currentDocId,
  value,
  onChange,
  theme,
  settings,
  playTypewriterSound,
  scrollRef,
  onScrollSync,
  onScrollDirectionChange,
  onInteraction,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onRecordHistory,
}) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = scrollRef || internalTextareaRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Fast local value for responsive typing
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingHistoryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSnapshotValueRef = useRef<string>(value);
  const charsSinceLastSnapshotRef = useRef<number>(0);

  // Case transformation dropdown menu state
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);
  const caseMenuRef = useRef<HTMLDivElement>(null);

  // Line Sorting dropdown menu state
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (caseMenuRef.current && !caseMenuRef.current.contains(e.target as Node)) {
        setIsCaseMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Flag to suppress saving scroll during document switching / restoration
  const isRestoringScrollRef = useRef(false);

  // Restore persistent scroll position per document ID
  useEffect(() => {
    if (!currentDocId) return;
    const saved = getDocScrollPosition(currentDocId);
    const targetScroll = saved.editorScrollTop;
    const textarea = textareaRef.current;

    isRestoringScrollRef.current = true;

    if (textarea) {
      textarea.scrollTop = targetScroll;
      lastScrollTopRef.current = targetScroll;
    }

    // Schedule multiple ticks to ensure layout/fonts/DOM have fully rendered
    const r1 = requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = targetScroll;
        lastScrollTopRef.current = targetScroll;
      }
    });

    const t1 = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = targetScroll;
        lastScrollTopRef.current = targetScroll;
      }
      isRestoringScrollRef.current = false;
    }, 120);

    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
    };
  }, [currentDocId]);

  // Smart Typography Backspace Record ref
  const lastSmartTransformRef = useRef<SmartTransformRecord | null>(null);

  // Find and Replace State
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Visual Table Builder Modal state
  const [isTableBuilderOpen, setIsTableBuilderOpen] = useState(false);

  // Audio trigger ref & throttle
  const triggerKeyAudio = useCallback((type: 'standard' | 'backspace' | 'enter' = 'standard') => {
    if (!playTypewriterSound) return;
    ambientAudio.playKeyClick(type);
  }, [playTypewriterSound]);

  // Cursor line tracking for Editor tracking guide ruler
  const [cursorLineTop, setCursorLineTop] = useState<number | null>(null);

  const updateCursorLineRuler = useCallback(() => {
    if (!settings.readingGuide) {
      if (cursorLineTop !== null) setCursorLineTop(null);
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selStart = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, selStart);
    const lineNumber = textBeforeCursor.split('\n').length;

    // Line height: standard mono 14px with leading-relaxed is approx 22.4px
    const isLg = window.innerWidth >= 1024;
    const paddingTop = isLg ? 32 : 24;
    const approxLineHeight = 22.4;

    const computedTop = (lineNumber - 1) * approxLineHeight + paddingTop - textarea.scrollTop;
    setCursorLineTop(computedTop);
  }, [settings.readingGuide, textareaRef, cursorLineTop]);

  // Debounced parent notification with adaptive delay for large documents
  const notifyParent = useCallback((val: string, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (immediate) {
      onChange(val, true);
    } else {
      const docLength = val.length;
      const delay = docLength > 40000 ? 180 : docLength > 15000 ? 120 : 60;
      debounceTimerRef.current = setTimeout(() => {
        onChange(val, false);
      }, delay);
    }
  }, [onChange]);

  // Record history snapshot helper before programmatic toolbar action
  const recordCurrentStateForHistory = useCallback(() => {
    const textarea = textareaRef.current;
    if (onRecordHistory) {
      onRecordHistory(
        localValue,
        textarea?.selectionStart,
        textarea?.selectionEnd
      );
      lastSnapshotValueRef.current = localValue;
      charsSinceLastSnapshotRef.current = 0;
    }
  }, [localValue, onRecordHistory, textareaRef]);

  // Sync with prop value when changing documents or on Undo/Redo
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
      lastSnapshotValueRef.current = value;
      charsSinceLastSnapshotRef.current = 0;
      lastSmartTransformRef.current = null;
    }
  }, [value]);

  // Defer heavy background calculations (readability, line metrics) during rapid typing
  const deferredLocalValue = useDeferredValue(localValue);

  // Compute readability metrics smoothly without blocking typing
  const readabilityStats = useMemo(
    () => calculateReadability(deferredLocalValue),
    [deferredLocalValue]
  );

  const deferredLinesCount = useMemo(
    () => (deferredLocalValue ? deferredLocalValue.split('\n').length : 1),
    [deferredLocalValue]
  );

  // Compute all matches only when find panel is active
  const matches = useMemo(() => {
    if (!isFindOpen || !findQuery) return [];
    const results: { start: number; end: number }[] = [];
    try {
      let escapedQuery = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (matchWholeWord) {
        escapedQuery = `\\b${escapedQuery}\\b`;
      }
      const flags = matchCase ? 'g' : 'gi';
      const regex = new RegExp(escapedQuery, flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(localValue)) !== null) {
        results.push({ start: match.index, end: match.index + match[0].length });
        if (!regex.global) break;
      }
    } catch {
      // Ignore invalid regex
    }
    return results;
  }, [isFindOpen, localValue, findQuery, matchCase, matchWholeWord]);

  // Sync match index when matches change
  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIdx(0);
    } else if (currentMatchIdx >= matches.length) {
      setCurrentMatchIdx(0);
    }
  }, [matches.length, currentMatchIdx]);

  // Jump to specific match in textarea
  const highlightMatch = useCallback((index: number, matchesList = matches) => {
    if (matchesList.length === 0) return;
    const safeIdx = Math.max(0, Math.min(index, matchesList.length - 1));
    const target = matchesList[safeIdx];
    setCurrentMatchIdx(safeIdx);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(target.start, target.end);
      
      const fullTextBefore = localValue.substring(0, target.start);
      const lineNumber = fullTextBefore.split('\n').length;
      const approxLineHeight = 22;
      const targetScrollTop = Math.max(0, (lineNumber - 4) * approxLineHeight);
      textarea.scrollTop = targetScrollTop;
    }
  }, [matches, localValue, textareaRef]);

  const handleFindNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matches.length;
    highlightMatch(nextIdx);
  }, [matches.length, currentMatchIdx, highlightMatch]);

  const handleFindPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + matches.length) % matches.length;
    highlightMatch(prevIdx);
  }, [matches.length, currentMatchIdx, highlightMatch]);

  const handleReplaceCurrent = useCallback(() => {
    if (matches.length === 0 || !matches[currentMatchIdx]) return;
    recordCurrentStateForHistory();

    const target = matches[currentMatchIdx];
    const newValue = localValue.substring(0, target.start) + replaceQuery + localValue.substring(target.end);
    setLocalValue(newValue);
    lastSnapshotValueRef.current = newValue;
    notifyParent(newValue, true);

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(target.start, target.start + replaceQuery.length);
      }
    }, 0);
  }, [matches, currentMatchIdx, localValue, replaceQuery, recordCurrentStateForHistory, notifyParent, textareaRef]);

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0 || !findQuery) return;
    recordCurrentStateForHistory();

    let escapedQuery = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (matchWholeWord) {
      escapedQuery = `\\b${escapedQuery}\\b`;
    }
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(escapedQuery, flags);
    const newValue = localValue.replace(regex, replaceQuery);

    setLocalValue(newValue);
    lastSnapshotValueRef.current = newValue;
    notifyParent(newValue, true);
  }, [matches.length, findQuery, matchWholeWord, matchCase, replaceQuery, localValue, recordCurrentStateForHistory, notifyParent]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (typingHistoryTimerRef.current) clearTimeout(typingHistoryTimerRef.current);
    };
  }, []);

  // Close case menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (caseMenuRef.current && !caseMenuRef.current.contains(e.target as Node)) {
        setIsCaseMenuOpen(false);
      }
    };
    if (isCaseMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCaseMenuOpen]);

  // Textarea input change handler with word boundary & character-count snapshot grouping
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const textarea = textareaRef.current;
    const prevVal = localValue;
    setLocalValue(val);
    notifyParent(val, false);
    updateCursorLineRuler();

    // Trigger typewriter audio on mobile / Android virtual keyboard inputs
    if (playTypewriterSound) {
      if (val.length < prevVal.length) {
        triggerKeyAudio('backspace');
      } else if (val.endsWith('\n') || (val.length > prevVal.length && val[textarea?.selectionStart ? textarea.selectionStart - 1 : 0] === '\n')) {
        triggerKeyAudio('enter');
      } else if (val !== prevVal) {
        triggerKeyAudio('standard');
      }
    }

    const diff = Math.abs(val.length - prevVal.length);
    charsSinceLastSnapshotRef.current += diff;

    // Check smart typography (e.g. ->, =>, <=, >=, !=, ..., --) outside code blocks
    const cursorPos = textarea?.selectionStart || 0;
    const smartCheck = checkSmartTypography(val, cursorPos);
    if (smartCheck) {
      const { newText, newCursor, record } = smartCheck;
      setLocalValue(newText);
      lastSmartTransformRef.current = record;
      notifyParent(newText, false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursor;
        }
      }, 0);
      return;
    }

    // Check if the change ended on a word boundary (space, newline, punctuation)
    const lastChar = val.slice(-1);
    const isWordOrLineBoundary = lastChar === ' ' || lastChar === '\n' || /[.,!?:;\-]/.test(lastChar);

    // Save snapshot on word/line boundary or every 10-14 chars typed
    if (isWordOrLineBoundary || charsSinceLastSnapshotRef.current >= 12) {
      if (onRecordHistory && lastSnapshotValueRef.current !== prevVal) {
        onRecordHistory(
          lastSnapshotValueRef.current,
          textarea?.selectionStart,
          textarea?.selectionEnd
        );
        lastSnapshotValueRef.current = val;
        charsSinceLastSnapshotRef.current = 0;
      }
    }

    // Also short debounced snapshot for typing pauses (400ms)
    if (typingHistoryTimerRef.current) {
      clearTimeout(typingHistoryTimerRef.current);
    }
    typingHistoryTimerRef.current = setTimeout(() => {
      if (onRecordHistory && lastSnapshotValueRef.current !== val) {
        onRecordHistory(
          lastSnapshotValueRef.current,
          textarea?.selectionStart,
          textarea?.selectionEnd
        );
        lastSnapshotValueRef.current = val;
        charsSinceLastSnapshotRef.current = 0;
      }
    }, 400);
  };

  // Helper to wrap selected text with markdown tokens (Bold, Italic, Headings, etc.)
  const insertWrap = (before: string, after: string, defaultText = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    recordCurrentStateForHistory();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = localValue.substring(start, end) || defaultText;

    const replacement = `${before}${selectedText}${after}`;
    const newValue = localValue.substring(0, start) + replacement + localValue.substring(end);
    
    setLocalValue(newValue);
    lastSnapshotValueRef.current = newValue;
    notifyParent(newValue, true);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
    }, 0);
  };

  // Helper to insert block template with proper newline spacing
  const insertBlock = (block: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    recordCurrentStateForHistory();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const prefix = start > 0 && localValue[start - 1] !== '\n' ? '\n\n' : (start === 0 ? '' : '\n');
    const suffix = end < localValue.length && localValue[end] !== '\n' ? '\n\n' : (end === localValue.length ? '\n' : '');

    const newValue = localValue.substring(0, start) + prefix + block + suffix + localValue.substring(end);
    setLocalValue(newValue);
    lastSnapshotValueRef.current = newValue;
    notifyParent(newValue, true);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + block.length;
      textarea.selectionStart = textarea.selectionEnd = newPos;
    }, 0);
  };

  // Multi-line list and checklist transformer (switching between bullet, checklist, numbered, quote)
  const handleListTransform = (listType: ListType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    recordCurrentStateForHistory();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const { newFullText, newSelectionStart, newSelectionEnd } = transformLinesList(
      localValue,
      start,
      end,
      listType
    );

    setLocalValue(newFullText);
    lastSnapshotValueRef.current = newFullText;
    notifyParent(newFullText, true);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = newSelectionStart;
      textarea.selectionEnd = newSelectionEnd;
    }, 0);
  };

  // Case style transformer (Sentence case, Title Case, UPPERCASE, smallcase, camelCase, etc.)
  const handleCaseTransform = (style: CaseStyle) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    recordCurrentStateForHistory();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let targetStart = start;
    let targetEnd = end;
    let textToTransform = '';

    if (start !== end) {
      // Selected text
      textToTransform = localValue.substring(start, end);
    } else {
      // If nothing selected, find word or line at cursor
      const lineStart = localValue.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = localValue.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = localValue.length;

      targetStart = lineStart;
      targetEnd = lineEnd;
      textToTransform = localValue.substring(lineStart, lineEnd);
    }

    if (!textToTransform) {
      setIsCaseMenuOpen(false);
      return;
    }

    const transformed = transformCase(textToTransform, style);
    const newValue = localValue.substring(0, targetStart) + transformed + localValue.substring(targetEnd);

    setLocalValue(newValue);
    lastSnapshotValueRef.current = newValue;
    notifyParent(newValue, true);
    setIsCaseMenuOpen(false);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = targetStart;
      textarea.selectionEnd = targetStart + transformed.length;
    }, 0);
  };

  // Modular line sorting transformer (Natural / Alphabetical, Ascending / Descending)
  const handleSortTransform = (options: LineSortOptions) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    recordCurrentStateForHistory();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const result = sortSelectedLinesInDocument(localValue, start, end, options);

    if (!result.newText || result.newText === localValue) {
      setIsSortMenuOpen(false);
      return;
    }

    setLocalValue(result.newText);
    lastSnapshotValueRef.current = result.newText;
    notifyParent(result.newText, true);
    setIsSortMenuOpen(false);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = result.newSelectionStart;
      textarea.selectionEnd = result.newSelectionEnd;
    }, 0);
  };

  // Handle typing key click sounds, indent, shortcuts, undo/redo, smart typography
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mechanical key audio clicks: alphanumeric, tab, enter, backspace, delete
    if (playTypewriterSound) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        triggerKeyAudio('backspace');
      } else if (e.key === 'Enter') {
        triggerKeyAudio('enter');
      } else if (e.key.length === 1 || e.key === 'Tab') {
        triggerKeyAudio('standard');
      }
    }

    // 1. Smart Backspace Reversal for Typography Conversions (e.g. → reverts to ->, “ reverts to ")
    if (e.key === 'Backspace') {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // Auto-closing pair deletion / smart quote reversion
        if (start === end && start > 0 && start <= localValue.length) {
          const charBefore = localValue[start - 1];
          const charAfter = start < localValue.length ? localValue[start] : '';

          // When cursor is between smart double quotes “|”, pressing Backspace reverts both to raw double pair ""
          if (charBefore === '“' && charAfter === '”') {
            e.preventDefault();
            recordCurrentStateForHistory();
            const newValue = localValue.substring(0, start - 1) + '""' + localValue.substring(start + 1);
            setLocalValue(newValue);
            lastSnapshotValueRef.current = newValue;
            lastSmartTransformRef.current = null;
            notifyParent(newValue, true);

            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }

          // Auto-closing pair deletion for standard matching brackets & quotes
          if (
            (charBefore === '"' && charAfter === '"') ||
            (charBefore === '[' && charAfter === ']') ||
            (charBefore === '(' && charAfter === ')') ||
            (charBefore === '{' && charAfter === '}')
          ) {
            e.preventDefault();
            recordCurrentStateForHistory();
            const newValue = localValue.substring(0, start - 1) + localValue.substring(start + 1);
            setLocalValue(newValue);
            lastSnapshotValueRef.current = newValue;
            lastSmartTransformRef.current = null;
            notifyParent(newValue, true);

            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start - 1;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }
        }

        const rec = lastSmartTransformRef.current;
        if (
          rec &&
          start === end &&
          (start === rec.end || start === rec.start + 1 || start === rec.start + rec.original.length) &&
          textarea.value.length === rec.docLengthAfter
        ) {
          const currentSlice = textarea.value.substring(rec.start, rec.end);
          if (currentSlice === rec.replaced) {
            e.preventDefault();
            const revertedText = textarea.value.substring(0, rec.start) + rec.original + textarea.value.substring(rec.end);
            setLocalValue(revertedText);
            lastSnapshotValueRef.current = revertedText;
            lastSmartTransformRef.current = null;
            notifyParent(revertedText, false);

            const newCursor = rec.start + rec.original.length;
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursor;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }
        }
      }
      lastSmartTransformRef.current = null;
    } else if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
      // Clear smart transform tracker when typing other navigation keys
      if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown') {
        lastSmartTransformRef.current = null;
      }
    }

    // 2. Auto-Closing Pairs for double quotes ("" / “”), brackets ([]), and parentheses (())
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // Opening characters: ", [, (, {
        if (e.key === '"' || e.key === '[' || e.key === '(' || e.key === '{') {
          const inCode = isInsideCode(localValue, start);

          // For double quotes outside code blocks, use formal smart quotes “ and ”
          const openChar = e.key === '"' ? (inCode ? '"' : '“') : e.key;
          const closingChar = e.key === '"' ? (inCode ? '"' : '”') : e.key === '[' ? ']' : e.key === '(' ? ')' : '}';

          if (start !== end) {
            // Text is selected -> wrap selection
            e.preventDefault();
            recordCurrentStateForHistory();
            const selected = localValue.substring(start, end);
            const newValue = localValue.substring(0, start) + openChar + selected + closingChar + localValue.substring(end);
            setLocalValue(newValue);
            lastSnapshotValueRef.current = newValue;
            notifyParent(newValue, true);

            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = start + openChar.length;
                textareaRef.current.selectionEnd = end + openChar.length;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          } else {
            // Overtype if cursor is already before the quote
            if ((e.key === '"' && (localValue[start] === '"' || localValue[start] === '”'))) {
              e.preventDefault();
              textarea.selectionStart = textarea.selectionEnd = start + 1;
              updateCursorLineRuler();
              return;
            }

            // Insert pair and place cursor between them
            e.preventDefault();
            recordCurrentStateForHistory();
            const newValue = localValue.substring(0, start) + openChar + closingChar + localValue.substring(end);
            setLocalValue(newValue);
            lastSnapshotValueRef.current = newValue;

            // Track smart transform so single Backspace immediately reverts both “ and ” to raw "
            if (!inCode && e.key === '"') {
              lastSmartTransformRef.current = {
                start,
                end: start + openChar.length,
                original: '"',
                replaced: openChar + closingChar,
                docLengthAfter: newValue.length,
              };
            }

            notifyParent(newValue, true);

            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + openChar.length;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }
        }

        // Overtype closing characters
        if (e.key === ']' || e.key === ')' || e.key === '}') {
          if (start === end && localValue[start] === e.key) {
            e.preventDefault();
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            updateCursorLineRuler();
            return;
          }
        }

        // Smart Single Quotes outside codeblocks
        if (e.key === "'") {
          const quoteRes = handleSmartQuote(localValue, start, end, "'");
          if (quoteRes) {
            e.preventDefault();
            setLocalValue(quoteRes.newText);
            lastSmartTransformRef.current = quoteRes.record;
            notifyParent(quoteRes.newText, false);

            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = quoteRes.newCursor;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }
        }
      }
    }

    // Escape closes Find bar if open
    if (e.key === 'Escape' && isFindOpen) {
      e.preventDefault();
      setIsFindOpen(false);
      return;
    }

    // 3. Smart List & Task Checkbox Auto-continuation on Enter
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === textarea.selectionEnd) {
        const cursorPos = textarea.selectionStart;
        const lineStart = localValue.lastIndexOf('\n', cursorPos - 1) + 1;
        let lineEnd = localValue.indexOf('\n', cursorPos);
        if (lineEnd === -1) lineEnd = localValue.length;

        const beforeCursorInLine = localValue.substring(lineStart, cursorPos);
        const afterCursorInLine = localValue.substring(cursorPos, lineEnd);

        // Regex patterns for list prefixes
        // 1. Task Checkbox: (indent)(bullet or number)(checkbox [ ] or [x])(content)
        const taskMatch = beforeCursorInLine.match(/^(\s*)([-*+]|\d+[.)])\s+\[([ xX])\]\s*(.*)$/);
        // 2. Numbered / Ordered List: (indent)(number[.)])(content)
        const orderedMatch = beforeCursorInLine.match(/^(\s*)(\d+)([.)])\s+(.*)$/);
        // 3. Bullet List: (indent)(bullet)(content)
        const bulletMatch = beforeCursorInLine.match(/^(\s*)([-*+])\s+(.*)$/);

        if (taskMatch) {
          const indent = taskMatch[1];
          const marker = taskMatch[2];
          const content = taskMatch[4];

          // Empty item check -> Escape list mode if user hits Enter on empty task line
          if (!content.trim() && !afterCursorInLine.trim()) {
            e.preventDefault();
            recordCurrentStateForHistory();
            const newValue = localValue.substring(0, lineStart) + indent + localValue.substring(lineEnd);
            setLocalValue(newValue);
            lastSnapshotValueRef.current = newValue;
            notifyParent(newValue, true);
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStart + indent.length;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }

          e.preventDefault();
          recordCurrentStateForHistory();
          let nextPrefix = '';
          if (/^\d+/.test(marker)) {
            const num = parseInt(marker, 10) + 1;
            const delimiter = marker.endsWith('.') ? '.' : ')';
            nextPrefix = `${indent}${num}${delimiter} [ ] `;
          } else {
            nextPrefix = `${indent}${marker} [ ] `;
          }

          const newValue = localValue.substring(0, cursorPos) + '\n' + nextPrefix + localValue.substring(cursorPos);
          setLocalValue(newValue);
          lastSnapshotValueRef.current = newValue;
          notifyParent(newValue, true);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPos + 1 + nextPrefix.length;
              updateCursorLineRuler();
            }
          }, 0);
          return;
        } else if (orderedMatch) {
          const indent = orderedMatch[1];
          const num = parseInt(orderedMatch[2], 10);
          const delimiter = orderedMatch[3];
          const content = orderedMatch[4];

          // Empty item check -> Escape list mode
          if (!content.trim() && !afterCursorInLine.trim()) {
            e.preventDefault();
            recordCurrentStateForHistory();
            const newValue = localValue.substring(0, lineStart) + indent + localValue.substring(lineEnd);
            setLocalValue(newValue);
            lastSnapshotValueRef.current = newValue;
            notifyParent(newValue, true);
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStart + indent.length;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }

          e.preventDefault();
          recordCurrentStateForHistory();
          const nextPrefix = `${indent}${num + 1}${delimiter} `;
          const newValue = localValue.substring(0, cursorPos) + '\n' + nextPrefix + localValue.substring(cursorPos);
          setLocalValue(newValue);
          lastSnapshotValueRef.current = newValue;
          notifyParent(newValue, true);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPos + 1 + nextPrefix.length;
              updateCursorLineRuler();
            }
          }, 0);
          return;
        } else if (bulletMatch) {
          const indent = bulletMatch[1];
          const bullet = bulletMatch[2];
          const content = bulletMatch[3];

          // Empty item check -> Escape list mode
          if (!content.trim() && !afterCursorInLine.trim()) {
            e.preventDefault();
            recordCurrentStateForHistory();
            const newValue = localValue.substring(0, lineStart) + indent + localValue.substring(lineEnd);
            setLocalValue(newValue);
            lastSnapshotValueRef.current = newValue;
            notifyParent(newValue, true);
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStart + indent.length;
                updateCursorLineRuler();
              }
            }, 0);
            return;
          }

          e.preventDefault();
          recordCurrentStateForHistory();
          const nextPrefix = `${indent}${bullet} `;
          const newValue = localValue.substring(0, cursorPos) + '\n' + nextPrefix + localValue.substring(cursorPos);
          setLocalValue(newValue);
          lastSnapshotValueRef.current = newValue;
          notifyParent(newValue, true);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPos + 1 + nextPrefix.length;
              updateCursorLineRuler();
            }
          }, 0);
          return;
        }
      }
    }

    // Tab key indent support (2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      recordCurrentStateForHistory();

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = localValue.substring(0, start) + '  ' + localValue.substring(end);
      setLocalValue(newValue);
      lastSnapshotValueRef.current = newValue;
      notifyParent(newValue, true);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateCursorLineRuler();
      }, 0);
      return;
    }

    // Keyboard Shortcuts with Ctrl / Cmd
    if (e.ctrlKey || e.metaKey) {
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        if (onUndo) {
          e.preventDefault();
          onUndo();
          return;
        }
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y
      if (((e.key === 'z' || e.key === 'Z') && e.shiftKey) || e.key === 'y' || e.key === 'Y') {
        if (onRedo) {
          e.preventDefault();
          onRedo();
          return;
        }
      }

      // Find: Ctrl+F / Cmd+F
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
          const selected = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
          if (selected && !selected.includes('\n')) {
            setFindQuery(selected);
          }
        }
        setIsFindOpen(true);
        return;
      }

      // Replace: Ctrl+H / Cmd+H
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
          const selected = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
          if (selected && !selected.includes('\n')) {
            setFindQuery(selected);
          }
        }
        setIsFindOpen(true);
        setShowReplace(true);
        return;
      }

      // Bold: Ctrl+B
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        insertWrap('**', '**', 'bold text');
        return;
      }

      // Italic: Ctrl+I
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        insertWrap('*', '*', 'italic text');
        return;
      }

      // Underline: Ctrl+U / Cmd+U
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        insertWrap('<u>', '</u>', 'underlined text');
        return;
      }

      // Hyperlink: Ctrl+K
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        insertWrap('[', '](https://example.com)', 'link text');
        return;
      }
    }
  };

  // Scroll sync handler & direction detection
  const handleScroll = () => {
    updateCursorLineRuler();
    if (!textareaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
    
    // Persist per-document scroll offset (only when not in the middle of restoring)
    if (currentDocId && !isRestoringScrollRef.current) {
      saveDocScrollPosition(currentDocId, { editorScrollTop: scrollTop });
    }

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

  // Insert Callout Admonition
  const insertCallout = (type: 'NOTE' | 'TIP' | 'WARNING') => {
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
        className="no-print flex items-center justify-between px-3 py-1.5 border-b gap-1 shrink-0 select-none text-xs relative z-30 overflow-visible"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.bgSecondary,
        }}
      >
        <div className="flex items-center gap-0.5 overflow-visible">
          {/* Undo / Redo controls */}
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                canUndo ? 'hover:bg-stone-500/10 opacity-90' : 'opacity-30 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                canRedo ? 'hover:bg-stone-500/10 opacity-90' : 'opacity-30 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {(onUndo || onRedo) && (
            <span className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1" />
          )}

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
            onClick={() => insertWrap('<u>', '</u>', 'underlined text')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
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

          {/* Case Style Dropdown */}
          <div className="relative inline-block" ref={caseMenuRef}>
            <button
              type="button"
              onClick={() => setIsCaseMenuOpen((prev) => !prev)}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                isCaseMenuOpen ? 'bg-stone-500/20' : 'hover:bg-stone-500/10'
              }`}
              title="Change Case Style (Sentence, Title, UPPER, lower, camelCase...)"
            >
              <Type className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {isCaseMenuOpen && (
              <div 
                className="absolute left-0 top-full mt-1.5 w-44 rounded-lg shadow-2xl border py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50 border-b pb-1 mb-1" style={{ borderColor: theme.border }}>
                  Case Transform
                </div>
                <button
                  type="button"
                  onClick={() => handleCaseTransform('sentence')}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Sentence Case</span>
                  <span className="text-[10px] opacity-50 font-mono">Aa bb</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCaseTransform('title')}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Title Case</span>
                  <span className="text-[10px] opacity-50 font-mono">Aa Bb</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCaseTransform('upper')}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>UPPERCASE</span>
                  <span className="text-[10px] opacity-50 font-mono">AA BB</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCaseTransform('lower')}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>smallcase</span>
                  <span className="text-[10px] opacity-50 font-mono">aa bb</span>
                </button>
                <div className="my-1 border-t opacity-40" style={{ borderColor: theme.border }} />
                <button
                  type="button"
                  onClick={() => handleCaseTransform('camel')}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>camelCase</span>
                  <span className="text-[10px] opacity-50 font-mono">aaBb</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCaseTransform('kebab')}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>kebab-case</span>
                  <span className="text-[10px] opacity-50 font-mono">aa-bb</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCaseTransform('snake')}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>snake_case</span>
                  <span className="text-[10px] opacity-50 font-mono">aa_bb</span>
                </button>
              </div>
            )}
          </div>

          {/* Sort Lines Dropdown */}
          <div className="relative inline-block" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                isSortMenuOpen ? 'bg-stone-500/20' : 'hover:bg-stone-500/10'
              }`}
              title="Sort Lines (Ascending, Descending, Natural, Alphabetical)"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {isSortMenuOpen && (
              <div 
                className="absolute left-0 top-full mt-1.5 w-52 rounded-lg shadow-2xl border py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50 border-b pb-1 mb-1" style={{ borderColor: theme.border }}>
                  Sort Lines
                </div>
                <button
                  type="button"
                  onClick={() => handleSortTransform({ algorithm: 'natural', direction: 'asc' })}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Sort Ascending</span>
                  <span className="text-[10px] opacity-50 font-mono">A → Z (1, 2, 10)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSortTransform({ algorithm: 'natural', direction: 'desc' })}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Sort Descending</span>
                  <span className="text-[10px] opacity-50 font-mono">Z → A (10, 2, 1)</span>
                </button>
                <div className="my-1 border-t opacity-40" style={{ borderColor: theme.border }} />
                <button
                  type="button"
                  onClick={() => handleSortTransform({ algorithm: 'alphabetical', direction: 'asc' })}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Alphabetical Ascending</span>
                  <span className="text-[10px] opacity-50 font-mono">A-Z Strict</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSortTransform({ algorithm: 'alphabetical', direction: 'desc' })}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Alphabetical Descending</span>
                  <span className="text-[10px] opacity-50 font-mono">Z-A Strict</span>
                </button>
                <div className="my-1 border-t opacity-40" style={{ borderColor: theme.border }} />
                <button
                  type="button"
                  onClick={() => handleSortTransform({ algorithm: 'reverse' })}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-500/15 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Reverse Line Order</span>
                  <span className="text-[10px] opacity-50 font-mono">Flip</span>
                </button>
              </div>
            )}
          </div>

          <span className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1" />

          {/* Lists and Quotes (Multi-line & direct toggle/switch capable) */}
          <button
            type="button"
            onClick={() => handleListTransform('bullet')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Bullet List (Toggle / Switch Checklist / Multi-line)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleListTransform('numbered')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Numbered List (Toggle / Number sequential lines)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleListTransform('checklist')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Checklist (Toggle / Switch Bullet List / Multi-line)"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleListTransform('quote')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer"
            title="Blockquote (Toggle / Multi-line)"
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
            onClick={() => setIsTableBuilderOpen(true)}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer text-amber-600 dark:text-amber-400 font-semibold"
            title="Visual Table Builder & Generator"
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
            onClick={() => insertBlock('```mermaid\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Output Result]\n  B -->|No| D[Iterate / Fix]\n```')}
            className="p-1.5 rounded hover:bg-stone-500/10 transition-colors cursor-pointer text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1"
            title="Insert Mermaid.js Diagram (```mermaid)"
          >
            <Workflow className="w-3.5 h-3.5" />
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

        {/* Find/Replace & Admonition Callout quick inserts */}
        <div className="flex items-center gap-1">
          {/* Find & Replace button */}
          <button
            type="button"
            onClick={() => {
              if (isFindOpen) {
                setIsFindOpen(false);
              } else {
                setIsFindOpen(true);
                setShowReplace(false);
              }
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
              isFindOpen ? 'bg-amber-500/20 text-amber-600 border-amber-500 font-semibold' : 'hover:bg-stone-500/10'
            }`}
            style={{ borderColor: isFindOpen ? theme.accent : theme.border }}
            title="Find & Replace (Ctrl+F / Ctrl+H)"
          >
            <Search className="w-3 h-3" />
            <span className="hidden sm:inline">Find</span>
          </button>

          <span className="w-px h-3.5 bg-stone-300 dark:bg-stone-700 mx-0.5" />

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

      {/* Editor Main Text Area & Find/Replace Overlay */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Floating Find & Replace Overlay Bar */}
        <FindReplaceBar
          isOpen={isFindOpen}
          showReplace={showReplace}
          onToggleShowReplace={() => setShowReplace(!showReplace)}
          onClose={() => setIsFindOpen(false)}
          theme={theme}
          findQuery={findQuery}
          onFindQueryChange={(q) => setFindQuery(q)}
          replaceQuery={replaceQuery}
          onReplaceQueryChange={(r) => setReplaceQuery(r)}
          matchCase={matchCase}
          onToggleMatchCase={() => setMatchCase(!matchCase)}
          matchWholeWord={matchWholeWord}
          onToggleWholeWord={() => setMatchWholeWord(!matchWholeWord)}
          currentMatchIndex={matches.length > 0 ? currentMatchIdx + 1 : 0}
          totalMatches={matches.length}
          onFindNext={handleFindNext}
          onFindPrev={handleFindPrev}
          onReplaceCurrent={handleReplaceCurrent}
          onReplaceAll={handleReplaceAll}
          matches={matches}
          totalLength={localValue.length}
          onSelectMatch={(idx) => highlightMatch(idx)}
        />

        {/* Scrollbar Minimap Ruler for occurrence density & instant jumping */}
        {isFindOpen && matches.length > 0 && (
          <SearchMinimapRuler
            matches={matches}
            currentMatchIndex={currentMatchIdx}
            totalLength={localValue.length}
            text={localValue}
            onSelectMatch={(idx) => highlightMatch(idx)}
            theme={theme}
          />
        )}

        {/* Subtle Tracking Guide Ruler aligned to current cursor line */}
        {settings.readingGuide && cursorLineTop !== null && cursorLineTop >= 0 && (
          <div 
            className="pointer-events-none absolute left-0 right-0 h-6.5 -translate-y-1 transition-all duration-75 z-10 opacity-20"
            style={{ 
              top: `${cursorLineTop}px`,
              backgroundColor: theme.accent,
              borderTop: `1px dashed ${theme.accent}`,
              borderBottom: `1px dashed ${theme.accent}`,
            }} 
          />
        )}

        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onClick={updateCursorLineRuler}
          onKeyUp={updateCursorLineRuler}
          onSelect={updateCursorLineRuler}
          onPointerEnter={() => onInteraction?.('editor')}
          onPointerDown={() => {
            onInteraction?.('editor');
            ambientAudio.unlockAudio();
          }}
          onTouchStart={() => {
            onInteraction?.('editor');
            ambientAudio.unlockAudio();
          }}
          onWheel={() => onInteraction?.('editor')}
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

        {/* Visual Markdown Table Generator & Cell Editor Modal */}
        {isTableBuilderOpen && (
          <TableBuilderModal
            isOpen={isTableBuilderOpen}
            onClose={() => setIsTableBuilderOpen(false)}
            onInsertTable={(tableMd) => insertBlock(tableMd)}
            theme={theme}
          />
        )}
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
        <div className="flex items-center gap-2.5">
          <span>Markdown Source</span>
          <span className="opacity-40">•</span>
          <span>{deferredLinesCount} lines</span>
          <span className="opacity-40">•</span>
          <span className="font-semibold" title="Filtered Prose Word Count (excludes code blocks, math, markdown syntax)">
            {readabilityStats.words.toLocaleString()} words
          </span>
          <span className="opacity-60" title="Full Context Raw Word Count (all tokens across document)">
            ({readabilityStats.rawWords.toLocaleString()} raw)
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span>UTF-8</span>
          <span className="opacity-40">•</span>
          <span>{localValue.length} chars</span>
        </div>
      </div>
    </div>
  );
});
