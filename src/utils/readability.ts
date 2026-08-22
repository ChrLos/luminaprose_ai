import { ReadabilityMetrics } from '../types';

/**
 * Accurately counts sentences in Markdown prose using structural & markdown-aware detection.
 * Handles headings, bullet/numbered lists, task lists, table rows, blockquotes, and multi-line paragraphs.
 */
export function countMarkdownSentences(markdown: string): number {
  if (!markdown || !markdown.trim()) return 0;

  // 1. Strip fenced code blocks, display math, and HTML comments
  const textWithoutBlocks = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const lines = textWithoutBlocks.split('\n');
  const structuralBlocks: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const combined = currentParagraphLines.join(' ').trim();
      if (combined) {
        structuralBlocks.push(combined);
      }
      currentParagraphLines = [];
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Check if line is a structural markdown element
    const isHeading = /^#{1,6}\s+/.test(trimmed);
    const isListItem = /^([-*+]|\d+[.)])\s+/.test(trimmed);
    const isBlockquote = /^>\s*/.test(trimmed);
    const isTableRow = /^\|.*\|$/.test(trimmed);
    const isHorizontalRule = /^([-*_]\s*){3,}$/.test(trimmed);

    if (isHorizontalRule) {
      flushParagraph();
      continue;
    }

    if (isHeading || isListItem || isBlockquote || isTableRow) {
      flushParagraph();
      // Clean the structural prefix
      const cleaned = trimmed
        .replace(/^#{1,6}\s+/, '')
        .replace(/^([-*+]|\d+[.)])\s+(\[[ xX]\]\s*)?/, '')
        .replace(/^>\s*/, '')
        .replace(/^\||\|$/g, '')
        .replace(/\|/g, ', ');
      
      if (cleaned.trim()) {
        structuralBlocks.push(cleaned.trim());
      }
    } else {
      // Regular paragraph line - accumulate for soft-wrap handling
      currentParagraphLines.push(trimmed);
    }
  }

  flushParagraph();

  let totalSentences = 0;

  for (const block of structuralBlocks) {
    // Strip inline markdown artifacts: images, links, formatting, math, inline code
    const cleanBlock = block
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/`[^`]+`/g, '')
      .replace(/\$[^\$]+?\$/g, '')
      .replace(/[*_~`]/g, '')
      .trim();

    if (!cleanBlock) continue;

    // Check if block contains any actual letters/numbers
    const hasWords = /[a-zA-Z0-9_\u00C0-\u017F]/.test(cleanBlock);
    if (!hasWords) continue;

    // Split by sentence terminators: . ! ? … and CJK punctuation 。！？
    const segments = cleanBlock
      .split(/[.!?…\u3002\uFF01\uFF1F]+(?:\s+|$|["'”’»])/g)
      .map((s) => s.trim())
      .filter((s) => /[a-zA-Z0-9_\u00C0-\u017F]/.test(s));

    // Each non-empty structural unit counts as at least 1 sentence
    const blockSentences = Math.max(1, segments.length);
    totalSentences += blockSentences;
  }

  return Math.max(1, totalSentences);
}

export function calculateReadability(markdown: string): ReadabilityMetrics {
  if (!markdown || !markdown.trim()) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      paragraphs: 0,
      headings: 0,
      readingTimeMinutes: 0,
      speakingTimeMinutes: 0,
      fleschKincaidScore: 100,
      gradeLevelText: 'General',
    };
  }

  // Strip code blocks and images for accurate text metrics
  const cleanText = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*>\-_~`]/g, ' ')
    .trim();

  // Words count
  const wordsArray = cleanText.match(/\b[a-zA-Z0-9_\u00C0-\u017F'-]+\b/g) || [];
  const words = wordsArray.length;

  // Characters
  const characters = markdown.length;
  const charactersNoSpaces = markdown.replace(/\s+/g, '').length;

  // Paragraphs
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0 && !p.trim().startsWith('#')).length;

  // Headings
  const headings = (markdown.match(/^#{1,6}\s+.+$/gm) || []).length;

  // Reading time (approx 200-220 words per minute for silent reading)
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 210));

  // Speaking time (approx 130 words per minute)
  const speakingTimeMinutes = Math.max(1, Math.ceil(words / 130));

  // Markdown-aware structural sentence counting (Option 2)
  const sentences = countMarkdownSentences(markdown);
  
  let totalSyllables = 0;
  for (const word of wordsArray) {
    totalSyllables += countSyllables(word);
  }

  // Flesch Reading Ease score = 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
  let fleschScore = 100;
  let gradeLevel = '5th Grade (Easy)';

  if (words > 0 && sentences > 0) {
    fleschScore = Math.round(
      206.835 - 1.015 * (words / sentences) - 84.6 * (totalSyllables / words)
    );
    fleschScore = Math.max(0, Math.min(100, fleschScore));

    if (fleschScore >= 90) gradeLevel = '5th Grade (Very Easy)';
    else if (fleschScore >= 80) gradeLevel = '6th Grade (Easy)';
    else if (fleschScore >= 70) gradeLevel = '7th Grade (Fairly Easy)';
    else if (fleschScore >= 60) gradeLevel = '8th-9th Grade (Plain English)';
    else if (fleschScore >= 50) gradeLevel = '10th-12th Grade (Fairly Difficult)';
    else if (fleschScore >= 30) gradeLevel = 'College Level (Difficult)';
    else gradeLevel = 'Academic / Graduate (Very Difficult)';
  }

  return {
    words,
    characters,
    charactersNoSpaces,
    paragraphs: Math.max(1, paragraphs),
    headings,
    readingTimeMinutes: words === 0 ? 0 : readingTimeMinutes,
    speakingTimeMinutes: words === 0 ? 0 : speakingTimeMinutes,
    fleschKincaidScore: fleschScore,
    gradeLevelText: gradeLevel,
  };
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  word = word.replace(/^y/, '');
  const syl = word.match(/[aeiouy]{1,2}/g);
  return syl ? Math.max(1, syl.length) : 1;
}

