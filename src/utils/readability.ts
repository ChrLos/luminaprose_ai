import { ReadabilityMetrics } from '../types';

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

  // Flesch-Kincaid & Syllables Estimation
  const sentences = (cleanText.match(/[.!?]+(?:\s+|$)/g) || []).length || 1;
  
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
