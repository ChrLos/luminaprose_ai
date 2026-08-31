import { FontFamily, MeasureWidth, ParagraphSpacing, LineHeight } from '../types';

/**
 * Returns the CSS font-family string for body text based on FontFamily setting
 */
export function getFontFamilyCss(fontFamily: FontFamily): string {
  switch (fontFamily) {
    case 'Newsreader':
      return "'Newsreader', Georgia, serif";
    case 'Lora':
      return "'Lora', Georgia, serif";
    case 'Cormorant Garamond':
      return "'Cormorant Garamond', 'Times New Roman', serif";
    case 'Plus Jakarta Sans':
      return "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    case 'Atkinson Hyperlegible':
      return "'Atkinson Hyperlegible', system-ui, sans-serif";
    case 'JetBrains Mono':
      return "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    case 'System Serif':
      return 'ui-serif, Georgia, Cambria, serif';
    case 'System Sans':
    default:
      return 'system-ui, -apple-system, sans-serif';
  }
}

/**
 * Returns the CSS font-family string for headings based on FontFamily setting
 */
export function getHeaderFontFamilyCss(headerFontFamily: FontFamily): string {
  return getFontFamilyCss(headerFontFamily);
}

/**
 * Returns max-width constraint for measure widths
 */
export function getMeasureMaxWidthCss(measureWidth: MeasureWidth): string {
  switch (measureWidth) {
    case 'narrow':
      return '600px';
    case 'optimal':
      return '720px';
    case 'wide':
      return '860px';
    case 'editorial':
      return '980px';
    case 'full':
      return '100%';
  }
}

/**
 * Returns word spacing CSS value
 */
export function getWordSpacingCss(wordSpacing: 'normal' | 'relaxed' | 'spacious'): string {
  switch (wordSpacing) {
    case 'relaxed':
      return '0.08em';
    case 'spacious':
      return '0.16em';
    case 'normal':
    default:
      return 'normal';
  }
}

/**
 * Returns letter spacing CSS value
 */
export function getLetterSpacingCss(letterSpacing: 'tight' | 'normal' | 'wide'): string {
  switch (letterSpacing) {
    case 'tight':
      return '-0.02em';
    case 'wide':
      return '0.03em';
    case 'normal':
    default:
      return 'normal';
  }
}
