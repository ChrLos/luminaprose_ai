import React from 'react';
import { 
  X, 
  Type, 
  AlignLeft, 
  AlignJustify, 
  Palette, 
  Sliders,
  RotateCcw,
  Check,
  BookOpen,
  Sun,
  Flame,
  FileText,
  Sparkles
} from 'lucide-react';
import { FontFamily, LineHeight, MeasureWidth, ParagraphSpacing, TextAlignment, ThemeId, TypographySettings } from '../types';
import { THEMES } from '../utils/themes';

interface TypographyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TypographySettings;
  onUpdateSettings: (settings: Partial<TypographySettings>) => void;
  currentThemeId: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  onResetDefaults: () => void;
}

const BODY_FONTS: { id: FontFamily; label: string; desc: string; sample: string }[] = [
  { id: 'Newsreader', label: 'Newsreader', desc: 'Warm literary serif for long essays', sample: 'Newsreader Aa' },
  { id: 'Lora', label: 'Lora', desc: 'Classic scholarly serif', sample: 'Lora Aa' },
  { id: 'Cormorant Garamond', label: 'Cormorant', desc: 'Graceful luxury editorial serif', sample: 'Cormorant Aa' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta', desc: 'Modern crisp geometric sans', sample: 'Plus Jakarta Aa' },
  { id: 'Atkinson Hyperlegible', label: 'Atkinson', desc: 'High-legibility accessible typeface', sample: 'Atkinson Aa' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono', desc: 'Clean monospace for technical writing', sample: 'JetBrains 12' },
  { id: 'System Sans', label: 'System Sans', desc: 'Native OS system typeface', sample: 'System Aa' },
];

export const TypographyDrawer: React.FC<TypographyDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentThemeId,
  onSelectTheme,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  const currentTheme = THEMES[currentThemeId] || THEMES.linen;

  // Curated Reading Presets
  const applyPreset = (preset: {
    fontFamily: FontFamily;
    fontSize: number;
    lineHeight: LineHeight;
    measureWidth: MeasureWidth;
    paragraphSpacing: ParagraphSpacing;
    themeId?: ThemeId;
    dropCaps?: boolean;
    wordSpacing?: 'normal' | 'relaxed' | 'spacious';
  }) => {
    onUpdateSettings({
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      lineHeight: preset.lineHeight,
      measureWidth: preset.measureWidth,
      paragraphSpacing: preset.paragraphSpacing,
      dropCaps: preset.dropCaps ?? settings.dropCaps,
      wordSpacing: preset.wordSpacing ?? 'normal',
    });
    if (preset.themeId) {
      onSelectTheme(preset.themeId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <aside 
        className="absolute inset-y-0 right-0 max-w-md w-full shadow-2xl flex flex-col z-10 transition-transform duration-200 border-l"
        style={{
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        {/* Drawer Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bgSecondary }}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-sm tracking-tight">Typography & Reader Studio</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetDefaults}
              className="p-1.5 rounded-md text-xs font-medium hover:bg-stone-500/10 transition-colors flex items-center gap-1 cursor-pointer"
              style={{ color: currentTheme.textMuted }}
              title="Reset to default typography"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
              style={{ color: currentTheme.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Curated Styles */}
          <section className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.textMuted }}>
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Curated Reading Styles</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyPreset({
                  fontFamily: 'Newsreader',
                  fontSize: 20,
                  lineHeight: '1.8',
                  measureWidth: 'optimal',
                  paragraphSpacing: 'normal',
                  themeId: 'linen',
                  dropCaps: true,
                })}
                className="p-2.5 rounded-lg border text-left hover:border-amber-500 transition-all cursor-pointer"
                style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bgSecondary }}
              >
                <div className="text-xs font-semibold">📖 Literary Essay</div>
                <div className="text-[10px] opacity-75">Newsreader • 20px • 1.8x</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset({
                  fontFamily: 'Lora',
                  fontSize: 19,
                  lineHeight: '1.8',
                  measureWidth: 'narrow',
                  paragraphSpacing: 'indented',
                  themeId: 'sepia',
                  dropCaps: true,
                })}
                className="p-2.5 rounded-lg border text-left hover:border-amber-500 transition-all cursor-pointer"
                style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bgSecondary }}
              >
                <div className="text-xs font-semibold">📚 Classic Novel</div>
                <div className="text-[10px] opacity-75">Lora • Indented • Sepia</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset({
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 18,
                  lineHeight: '1.65',
                  measureWidth: 'optimal',
                  paragraphSpacing: 'normal',
                  themeId: 'swiss',
                  dropCaps: false,
                })}
                className="p-2.5 rounded-lg border text-left hover:border-amber-500 transition-all cursor-pointer"
                style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bgSecondary }}
              >
                <div className="text-xs font-semibold">⚡ Modern Clean</div>
                <div className="text-[10px] opacity-75">Jakarta Sans • Crisp</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset({
                  fontFamily: 'Atkinson Hyperlegible',
                  fontSize: 19,
                  lineHeight: '1.95',
                  measureWidth: 'optimal',
                  paragraphSpacing: 'normal',
                  themeId: 'obsidian',
                  dropCaps: false,
                })}
                className="p-2.5 rounded-lg border text-left hover:border-amber-500 transition-all cursor-pointer"
                style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bgSecondary }}
              >
                <div className="text-xs font-semibold">👁️ High Legibility</div>
                <div className="text-[10px] opacity-75">Atkinson • Accessible</div>
              </button>
            </div>
          </section>

          {/* Eye Comfort: Screen Warmth & Blue-Light Filter */}
          <section className="space-y-3 p-3.5 rounded-xl border" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bgSecondary }}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.textMuted }}>
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Screen Warmth (Candlelight Filter)</span>
              </label>
              <span className="text-xs font-mono font-semibold">{settings.screenWarmth}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Sun className="w-3.5 h-3.5 opacity-50" />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.screenWarmth}
                onChange={(e) => onUpdateSettings({ screenWarmth: Number(e.target.value) })}
                className="w-full h-1.5 bg-stone-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-[11px] opacity-75">
              Soft amber tone reduces blue-light glare and optical fatigue during evening reading.
            </div>
          </section>

          {/* Section 1: Themes */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.textMuted }}>
                <Palette className="w-3.5 h-3.5" />
                <span>Atmospheric Themes</span>
              </label>
              <span className="text-xs capitalize font-medium text-amber-600 dark:text-amber-400">
                {currentTheme.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {Object.values(THEMES).map((t) => {
                const isSelected = t.id === currentThemeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTheme(t.id)}
                    className={`p-3 rounded-lg border text-left transition-all relative cursor-pointer flex items-center justify-between ${
                      isSelected ? 'ring-2 ring-amber-500 shadow-xs' : 'hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: t.bg,
                      borderColor: isSelected ? t.accent : t.border,
                      color: t.text,
                    }}
                  >
                    <div>
                      <div className="text-xs font-semibold">{t.name}</div>
                      <div className="text-[10px] opacity-75 capitalize">{t.category}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: t.accent }} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 2: Font Family */}
          <section className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.textMuted }}>
              <Type className="w-3.5 h-3.5" />
              <span>Body Typeface</span>
            </label>

            <div className="grid grid-cols-1 gap-1.5">
              {BODY_FONTS.map((font) => {
                const isSelected = settings.fontFamily === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => onUpdateSettings({ fontFamily: font.id })}
                    className={`px-3.5 py-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected ? 'ring-1.5 ring-amber-500' : 'hover:bg-stone-500/5'
                    }`}
                    style={{
                      borderColor: isSelected ? currentTheme.accent : currentTheme.border,
                      backgroundColor: isSelected ? currentTheme.bgElevated : 'transparent',
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium">{font.label}</div>
                      <div className="text-[11px]" style={{ color: currentTheme.textMuted }}>{font.desc}</div>
                    </div>
                    <span className="text-xs italic opacity-60 font-serif">{font.sample}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Font Size */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme.textMuted }}>
                Type Scale
              </label>
              <span className="text-xs font-mono font-semibold">{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-serif">A</span>
              <input
                type="range"
                min="14"
                max="26"
                step="1"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                className="w-full h-1.5 bg-stone-300 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <span className="text-base font-serif font-bold">A</span>
            </div>
          </section>

          {/* Section 4: Line Height (Leading) */}
          <section className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme.textMuted }}>
              Line Leading (Vertical Breath)
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { id: '1.5', label: '1.5x' },
                { id: '1.65', label: '1.65x' },
                { id: '1.8', label: '1.8x' },
                { id: '1.95', label: '1.95x' },
                { id: '2.1', label: '2.1x' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ lineHeight: item.id as LineHeight })}
                  className={`py-1.5 px-1 rounded-md border text-xs font-medium transition-all text-center cursor-pointer ${
                    settings.lineHeight === item.id ? 'font-bold ring-1 ring-amber-500' : 'opacity-80'
                  }`}
                  style={{
                    borderColor: settings.lineHeight === item.id ? currentTheme.accent : currentTheme.border,
                    backgroundColor: settings.lineHeight === item.id ? currentTheme.bgElevated : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* Section 5: Typographic Math & Word Spacing */}
          <section className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentTheme.textMuted }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Word & Character Breathing Room</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'normal', label: 'Normal' },
                { id: 'relaxed', label: 'Relaxed' },
                { id: 'spacious', label: 'Spacious' },
              ].map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onUpdateSettings({ wordSpacing: ws.id as any })}
                  className={`py-1.5 px-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer ${
                    settings.wordSpacing === ws.id ? 'font-bold ring-1 ring-amber-500' : 'opacity-80'
                  }`}
                  style={{
                    borderColor: settings.wordSpacing === ws.id ? currentTheme.accent : currentTheme.border,
                    backgroundColor: settings.wordSpacing === ws.id ? currentTheme.bgElevated : 'transparent',
                  }}
                >
                  {ws.label}
                </button>
              ))}
            </div>
          </section>

          {/* Section 6: Measure / Column Width */}
          <section className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme.textMuted }}>
              Reading Column Measure
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'narrow', label: 'Narrow (56ch)' },
                { id: 'optimal', label: 'Optimal (68ch)' },
                { id: 'wide', label: 'Wide (82ch)' },
                { id: 'editorial', label: 'Magazine' },
                { id: 'full', label: 'Full Width' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSettings({ measureWidth: item.id as MeasureWidth })}
                  className={`py-1.5 px-2 rounded-md border text-xs font-medium transition-all text-center cursor-pointer ${
                    settings.measureWidth === item.id ? 'font-bold ring-1 ring-amber-500' : 'opacity-80'
                  }`}
                  style={{
                    borderColor: settings.measureWidth === item.id ? currentTheme.accent : currentTheme.border,
                    backgroundColor: settings.measureWidth === item.id ? currentTheme.bgElevated : 'transparent',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* Section 7: Paragraph Style & Alignment */}
          <section className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: currentTheme.textMuted }}>
              Paragraph & Layout Formats
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ paragraphSpacing: 'normal' })}
                className={`p-2 rounded-md border text-xs text-left cursor-pointer ${
                  settings.paragraphSpacing === 'normal' ? 'ring-1 ring-amber-500 font-semibold' : ''
                }`}
                style={{
                  borderColor: currentTheme.border,
                  backgroundColor: settings.paragraphSpacing === 'normal' ? currentTheme.bgElevated : 'transparent',
                }}
              >
                <div>Modern Block</div>
                <div className="text-[10px] opacity-70">Spaced paragraphs</div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ paragraphSpacing: 'indented' })}
                className={`p-2 rounded-md border text-xs text-left cursor-pointer ${
                  settings.paragraphSpacing === 'indented' ? 'ring-1 ring-amber-500 font-semibold' : ''
                }`}
                style={{
                  borderColor: currentTheme.border,
                  backgroundColor: settings.paragraphSpacing === 'indented' ? currentTheme.bgElevated : 'transparent',
                }}
              >
                <div>Book Indent</div>
                <div className="text-[10px] opacity-70">First-line tab indent</div>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ alignment: 'left' })}
                className={`flex-1 py-1.5 px-3 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                  settings.alignment === 'left' ? 'ring-1 ring-amber-500 font-semibold' : 'opacity-80'
                }`}
                style={{
                  borderColor: currentTheme.border,
                  backgroundColor: settings.alignment === 'left' ? currentTheme.bgElevated : 'transparent',
                }}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Left Aligned</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ alignment: 'justify' })}
                className={`flex-1 py-1.5 px-3 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                  settings.alignment === 'justify' ? 'ring-1 ring-amber-500 font-semibold' : 'opacity-80'
                }`}
                style={{
                  borderColor: currentTheme.border,
                  backgroundColor: settings.alignment === 'justify' ? currentTheme.bgElevated : 'transparent',
                }}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span>Justified</span>
              </button>
            </div>
          </section>

          {/* Section 8: Reading Flow & Enhancements */}
          <section className="space-y-2 pt-2 border-t" style={{ borderColor: currentTheme.border }}>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: currentTheme.textMuted }}>
              Focus & Eye Guidance
            </label>

            {/* Bionic Reading */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-500/5 cursor-pointer">
              <div className="text-xs">
                <div className="font-medium flex items-center gap-1">
                  <span><b>Bi</b>onic Reading Flow</span>
                </div>
                <div className="text-[10px] opacity-70">Bolds word fixation anchors to guide saccadic eye movement</div>
              </div>
              <input
                type="checkbox"
                checked={settings.bionicReading}
                onChange={(e) => onUpdateSettings({ bionicReading: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </label>

            {/* Reading Guide Ruler */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-500/5 cursor-pointer">
              <div className="text-xs">
                <div className="font-medium">Tracking Guide Ruler</div>
                <div className="text-[10px] opacity-70">Subtle horizontal guide line following mouse position</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.readingGuide)}
                onChange={(e) => onUpdateSettings({ readingGuide: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </label>

            {/* Paper Texture */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-500/5 cursor-pointer">
              <div className="text-xs">
                <div className="font-medium flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paper Matte Grain</span>
                </div>
                <div className="text-[10px] opacity-70">Subtle tactile paper grain texture for print feeling</div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.paperTexture)}
                onChange={(e) => onUpdateSettings({ paperTexture: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </label>

            {/* Drop Caps */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-500/5 cursor-pointer">
              <div className="text-xs">
                <div className="font-medium">Drop Caps</div>
                <div className="text-[10px] opacity-70">Illuminated opening initial letter</div>
              </div>
              <input
                type="checkbox"
                checked={settings.dropCaps}
                onChange={(e) => onUpdateSettings({ dropCaps: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </label>

            {/* Focus Dim */}
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-500/5 cursor-pointer">
              <div className="text-xs">
                <div className="font-medium">Focus Block Isolation</div>
                <div className="text-[10px] opacity-70">Dims non-hovered paragraphs</div>
              </div>
              <input
                type="checkbox"
                checked={settings.focusMode}
                onChange={(e) => onUpdateSettings({ focusMode: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </label>
          </section>
        </div>
      </aside>
    </div>
  );
};
