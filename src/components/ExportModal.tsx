import React, { useState } from 'react';
import {
  X,
  Copy,
  FileDown,
  Code,
  Check,
  Share2,
  Loader2,
  FileText,
} from 'lucide-react';
import { ThemeConfig, TypographySettings } from '../types';
import { parseMarkdownToHtml } from '../utils/markdownParser';
import { applyBionicReading } from '../utils/bionicReader';
import { useFocusTrap } from '../utils/useFocusTrap';
import { generateStandaloneHtmlDocument } from '../utils/exportGenerator';
import { getFontFamilyCss, getHeaderFontFamilyCss } from '../utils/typographyStyles';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  documentTitle: string;
  theme: ThemeConfig;
  settings: TypographySettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  markdown,
  documentTitle,
  theme,
  settings,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getRenderedBodyHtml = () => {
    let bodyHtml = parseMarkdownToHtml(markdown, theme.category === 'dark', true);
    if (settings.bionicReading) {
      bodyHtml = applyBionicReading(bodyHtml);
    }
    return bodyHtml;
  };

  // Direct Client-Side PDF Generation
  const handleGeneratePdf = async () => {
    setIsExportingPdf(true);
    setPdfError(null);
    setPdfProgressText('Loading PDF engine...');

    try {
      const { generateDirectPdf } = await import('../utils/pdfGenerator');
      setPdfProgressText('Preparing PDF document...');
      await generateDirectPdf({
        title: documentTitle,
        htmlContent: getRenderedBodyHtml(),
        theme,
        settings,
        fontFamily: getFontFamilyCss(settings.fontFamily),
        headerFontFamily: getHeaderFontFamilyCss(settings.headerFontFamily),
        onProgress: (step) => setPdfProgressText(step),
      });
      setIsExportingPdf(false);
      setPdfProgressText('');
    } catch (err) {
      console.error('Direct PDF generation error:', err);
      setIsExportingPdf(false);
      setPdfProgressText('');
      setPdfError('PDF export could not complete. Please try again.');
    }
  };

  // Copy Formatted Rich HTML to Clipboard
  const handleCopyRichText = async () => {
    try {
      const htmlContent = parseMarkdownToHtml(markdown, theme.category === 'dark', true);
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([markdown], { type: 'text/plain' });

      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(markdown);
      }

      setCopiedType('rich');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      await navigator.clipboard.writeText(markdown);
      setCopiedType('rich');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  // Copy Raw Markdown
  const handleCopyRawMarkdown = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopiedType('raw');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Download .md file
  const handleDownloadMarkdown = () => {
    const filename = `${documentTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'document'}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Standalone HTML file
  const handleDownloadHtml = () => {
    const filename = `${documentTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'document'}.html`;
    const fullHtml = generateStandaloneHtmlDocument({
      markdown,
      documentTitle,
      theme,
      settings,
    });

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div 
        ref={modalRef}
        className="relative max-w-lg w-full rounded-2xl shadow-2xl border p-6 z-10 space-y-5"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Export & Publish Document"
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-base">Export & Publish Document</h2>
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

        {pdfError && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
            <span>{pdfError}</span>
            <button type="button" onClick={() => setPdfError(null)} className="ml-2 hover:underline cursor-pointer">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Action 1: Direct Download PDF (.pdf) */}
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isExportingPdf}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group disabled:opacity-50"
            style={{
              borderColor: theme.accent,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              {isExportingPdf ? (
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                Direct PDF
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold">
                {isExportingPdf ? (pdfProgressText || 'Exporting...') : 'Export to PDF (.pdf)'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Direct file download with 1:1 styles
              </div>
            </div>
          </button>

          {/* Action 2: Copy Rich Text */}
          <button
            type="button"
            onClick={handleCopyRichText}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              {copiedType === 'rich' ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Clipboard</span>
            </div>
            <div>
              <div className="text-sm font-semibold">
                {copiedType === 'rich' ? 'Copied Rich Text!' : 'Copy Formatted Text'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Paste into Notion, Docs, or Medium
              </div>
            </div>
          </button>

          {/* Action 3: Download .md */}
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <FileDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Markdown</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Download .md</div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Standard Markdown text file
              </div>
            </div>
          </button>

          {/* Action 4: Download HTML */}
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Standalone</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Download .html</div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Mobile-friendly + Auto-hiding Outline
              </div>
            </div>
          </button>
        </div>

        {/* Copy Raw Markdown footer button */}
        <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: theme.border }}>
          <button
            type="button"
            onClick={handleCopyRawMarkdown}
            className="text-xs font-mono font-medium hover:underline flex items-center gap-1.5 cursor-pointer"
            style={{ color: theme.textMuted }}
          >
            {copiedType === 'raw' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedType === 'raw' ? 'Copied Raw Markdown!' : 'Copy raw markdown source'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border hover:bg-stone-500/10 cursor-pointer transition-colors"
            style={{ borderColor: theme.border }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
