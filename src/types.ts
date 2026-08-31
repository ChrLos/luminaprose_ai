export type FontFamily = 
  | 'Newsreader'
  | 'Lora'
  | 'Cormorant Garamond'
  | 'Plus Jakarta Sans'
  | 'Atkinson Hyperlegible'
  | 'JetBrains Mono'
  | 'System Sans'
  | 'System Serif';

export type LineHeight = '1.5' | '1.65' | '1.8' | '1.95' | '2.1';

export type MeasureWidth = 'narrow' | 'optimal' | 'wide' | 'editorial' | 'full';

export type ParagraphSpacing = 'normal' | 'relaxed' | 'indented';

export type TextAlignment = 'left' | 'justify';

export type ThemeId = 
  | 'linen'
  | 'paperwhite'
  | 'obsidian'
  | 'oled'
  | 'swiss'
  | 'sepia'
  | 'nordic'
  | 'forest'
  | 'solarized'
  | 'midnight';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  category: 'light' | 'dark' | 'warm';
  bg: string;
  bgSecondary: string;
  bgElevated: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
  codeBg: string;
  blockquoteBorder: string;
  tableHeaderBg: string;
  tableStripeBg: string;
  hrColor: string;
}

export interface TypographySettings {
  fontFamily: FontFamily;
  headerFontFamily: FontFamily;
  fontSize: number; // in px, e.g. 19
  lineHeight: LineHeight;
  measureWidth: MeasureWidth;
  paragraphSpacing: ParagraphSpacing;
  alignment: TextAlignment;
  letterSpacing: 'tight' | 'normal' | 'wide';
  wordSpacing: 'normal' | 'relaxed' | 'spacious';
  dropCaps: boolean;
  showLineNumbers: boolean;
  codeLigatures: boolean;
  smoothTypewriter: boolean;
  focusMode: boolean; // Dims non-hovered blocks
  highlightSyntax: boolean;
  readingGuide: boolean; // Reading guide horizontal ruler
  bionicReading: boolean; // Bionic fixation points for fast reading
  screenWarmth: number; // 0 to 100 for blue-light filter
  paperTexture: boolean; // Subtle organic paper grain
}

export const DEFAULT_TYPOGRAPHY_SETTINGS: TypographySettings = {
  fontFamily: 'Newsreader',
  headerFontFamily: 'Plus Jakarta Sans',
  fontSize: 19,
  lineHeight: '1.8',
  measureWidth: 'optimal',
  paragraphSpacing: 'relaxed',
  alignment: 'left',
  letterSpacing: 'normal',
  wordSpacing: 'normal',
  dropCaps: false,
  showLineNumbers: true,
  codeLigatures: true,
  smoothTypewriter: true,
  focusMode: false,
  highlightSyntax: true,
  readingGuide: false,
  bionicReading: false,
  screenWarmth: 0,
  paperTexture: false,
};

export type ViewLayout = 'split' | 'reader' | 'editor' | 'slides';

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  tags?: string[];
  isDeleted?: boolean;
  deletedAt?: number;
}

export interface DocumentSnapshot {
  id: string;
  docId: string;
  timestamp: number;
  title: string;
  content: string;
  type: 'manual' | 'auto';
  label?: string;
  wordCount: number;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  line: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface AlignedDiffRow {
  oldLineNum?: number;
  oldContent?: string;
  oldType?: 'removed' | 'unchanged' | 'empty';
  newLineNum?: number;
  newContent?: string;
  newType?: 'added' | 'unchanged' | 'empty';
}

export type DiffDisplayItem =
  | { type: 'line'; data: DiffLine; index: number }
  | { type: 'fold'; count: number; startIdx: number; endIdx: number; id: string };

export interface ReadabilityMetrics {
  words: number; // Filtered prose word count (omits code blocks, inline code, math, syntax markup, URLs, HTML)
  rawWords: number; // Full raw context word count (all tokens across the document)
  omittedWords: number; // Count of words in omitted sections (rawWords - words)
  characters: number;
  charactersNoSpaces: number;
  proseCharacters: number;
  paragraphs: number;
  headings: number;
  codeBlocksCount: number;
  mathBlocksCount: number;
  lines: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  fleschKincaidScore: number;
  gradeLevelText: string;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
  lineIndex?: number;
}

export const APP_STORAGE_KEYS = {
  DOCUMENTS: 'lumina_markdown_documents',
  DOCUMENTS_V2: 'lumina_markdown_documents_v2',
  ACTIVE_DOC_ID: 'lumina_active_doc_id',
  PROSE_SETTINGS: 'lumina_typography_settings_v3',
  THEME_ID: 'lumina_theme_id',
  ZOOM_LEVEL: 'lumina_editor_zoom',
  SYNC_SCROLL: 'lumina_sync_scroll',
  TYPEWRITER_SOUND: 'lumina_typewriter_sound',
  CHANGELOG_VIEWED: 'lumina_changelog_viewed_version',
} as const;

export const CURRENT_APP_VERSION = '1.2.0';
