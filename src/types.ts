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

export type ViewLayout = 'split' | 'reader' | 'editor' | 'slides';

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  tags?: string[];
}

export interface ReadabilityMetrics {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  headings: number;
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
