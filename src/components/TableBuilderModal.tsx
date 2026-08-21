import React, { useState } from 'react';
import { 
  Table, 
  Plus, 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  X, 
  Check, 
  ArrowRight,
  ArrowDown,
  Sparkles
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { useFocusTrap } from '../utils/useFocusTrap';

export type TableAlignment = 'left' | 'center' | 'right';

interface TableBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (markdownTable: string) => void;
  theme: ThemeConfig;
}

export const TableBuilderModal: React.FC<TableBuilderModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
  theme,
}) => {
  const [headers, setHeaders] = useState<string[]>(['Feature', 'Description', 'Status']);
  const [alignments, setAlignments] = useState<TableAlignment[]>(['left', 'left', 'center']);
  const [rows, setRows] = useState<string[][]>([
    ['Typography', 'High legibility serif & sans-serif fonts', 'Ready'],
    ['Mermaid', 'Interactive live zoomable architecture diagrams', 'Active'],
    ['KaTeX Math', 'Real-time LaTeX formula processing', 'Ready'],
  ]);

  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  // Add column
  const handleAddColumn = () => {
    if (headers.length >= 10) return;
    const colNum = headers.length + 1;
    setHeaders([...headers, `Header ${colNum}`]);
    setAlignments([...alignments, 'left']);
    setRows(rows.map((row) => [...row, '']));
  };

  // Delete column
  const handleDeleteColumn = (colIdx: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== colIdx));
    setAlignments(alignments.filter((_, i) => i !== colIdx));
    setRows(rows.map((row) => row.filter((_, i) => i !== colIdx)));
  };

  // Add row
  const handleAddRow = () => {
    if (rows.length >= 25) return;
    const newRow = Array(headers.length).fill('');
    setRows([...rows, newRow]);
  };

  // Delete row
  const handleDeleteRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rowIdx));
  };

  // Update header text
  const handleHeaderChange = (colIdx: number, val: string) => {
    const next = [...headers];
    next[colIdx] = val;
    setHeaders(next);
  };

  // Cycle alignment: left -> center -> right -> left
  const handleCycleAlignment = (colIdx: number) => {
    const next = [...alignments];
    const current = next[colIdx];
    if (current === 'left') next[colIdx] = 'center';
    else if (current === 'center') next[colIdx] = 'right';
    else next[colIdx] = 'left';
    setAlignments(next);
  };

  // Update cell text
  const handleCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const next = rows.map((r, rI) => {
      if (rI !== rowIdx) return r;
      const nextRow = [...r];
      nextRow[colIdx] = val;
      return nextRow;
    });
    setRows(next);
  };

  // Quick preset templates
  const applyPreset = (type: 'comparison' | 'pricing' | 'kanban' | 'data') => {
    if (type === 'comparison') {
      setHeaders(['Feature', 'Community', 'Pro Plan']);
      setAlignments(['left', 'center', 'center']);
      setRows([
        ['Live Preview', '✓ Included', '✓ Included'],
        ['PDF Export', 'Standard', 'Ultra Vector High-Res'],
        ['Custom Themes', '3 Themes', 'All 12 Themes + Custom'],
      ]);
    } else if (type === 'pricing') {
      setHeaders(['Tier', 'Monthly Cost', 'Storage', 'Support']);
      setAlignments(['left', 'right', 'center', 'center']);
      setRows([
        ['Starter', '$0', '50 MB', 'Community'],
        ['Professional', '$12/mo', '5 GB', 'Priority Email'],
        ['Enterprise', '$49/mo', 'Unlimited', '24/7 Dedicated'],
      ]);
    } else if (type === 'kanban') {
      setHeaders(['Task Item', 'Assignee', 'Priority', 'Status']);
      setAlignments(['left', 'left', 'center', 'center']);
      setRows([
        ['Design system audit', 'Alex R.', 'High', 'In Progress'],
        ['Accessibility review', 'Sam M.', 'Medium', 'Pending'],
        ['Performance benchmark', 'Taylor K.', 'Low', 'Completed'],
      ]);
    } else if (type === 'data') {
      setHeaders(['ID', 'Metric Name', 'Baseline', 'Target', 'Variance']);
      setAlignments(['left', 'left', 'right', 'right', 'center']);
      setRows([
        ['KPI-01', 'Page Load Time', '1.8s', '0.6s', '-66%'],
        ['KPI-02', 'Lighthouse Score', '82', '98', '+16%'],
        ['KPI-03', 'Time to Interactive', '950ms', '320ms', '-66%'],
      ]);
    }
  };

  // Generate clean Markdown table with alignment pipes
  const handleInsert = () => {
    // 1. Header row
    const headerLine = '| ' + headers.map((h) => h.trim() || 'Column').join(' | ') + ' |';

    // 2. Alignment delimiter row
    const delimiterLine =
      '| ' +
      alignments
        .map((a) => {
          if (a === 'center') return ':---:';
          if (a === 'right') return '---:';
          return ':---';
        })
        .join(' | ') +
      ' |';

    // 3. Data rows
    const dataLines = rows.map((row) => {
      const paddedRow = headers.map((_, i) => (row[i] !== undefined ? row[i].trim() : ''));
      return '| ' + paddedRow.join(' | ') + ' |';
    });

    const markdownTable = [headerLine, delimiterLine, ...dataLines].join('\n');
    onInsertTable(markdownTable);
    onClose();
  };

  const isDark = theme.category === 'dark';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-builder-title"
    >
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose} 
        aria-hidden="true"
      />

      <div 
        ref={modalRef}
        className="relative max-w-4xl w-full max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0" 
          style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-lg border shadow-xs" 
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
            >
              <Table className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 id="table-builder-title" className="font-bold text-base leading-tight">Visual Markdown Table Builder</h2>
              <p className="text-xs opacity-65 mt-0.5">
                Design, align columns, and edit table cells visually without syntax friction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ borderColor: theme.border }}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets & Controls Bar */}
        <div 
          className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs"
          style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-[11px] opacity-70 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('comparison')}
              className="px-2.5 py-1 rounded-md border text-[11px] font-medium hover:border-amber-500 transition-colors cursor-pointer"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
            >
              Feature Comparison
            </button>
            <button
              type="button"
              onClick={() => applyPreset('pricing')}
              className="px-2.5 py-1 rounded-md border text-[11px] font-medium hover:border-amber-500 transition-colors cursor-pointer"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
            >
              Pricing Tiers
            </button>
            <button
              type="button"
              onClick={() => applyPreset('kanban')}
              className="px-2.5 py-1 rounded-md border text-[11px] font-medium hover:border-amber-500 transition-colors cursor-pointer"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
            >
              Task Checklist
            </button>
            <button
              type="button"
              onClick={() => applyPreset('data')}
              className="px-2.5 py-1 rounded-md border text-[11px] font-medium hover:border-amber-500 transition-colors cursor-pointer"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
            >
              Metrics & KPIs
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddColumn}
              disabled={headers.length >= 8}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors hover:border-amber-500 disabled:opacity-40 cursor-pointer"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
              title="Add a new column"
            >
              <Plus className="w-3 h-3" />
              <span>Add Column ({headers.length}/8)</span>
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              disabled={rows.length >= 20}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors hover:border-amber-500 disabled:opacity-40 cursor-pointer"
              style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
              title="Add a new row"
            >
              <Plus className="w-3 h-3" />
              <span>Add Row ({rows.length}/20)</span>
            </button>
          </div>
        </div>

        {/* Visual Table Editor Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div 
            className="rounded-xl border overflow-x-auto shadow-xs" 
            style={{ borderColor: theme.border, backgroundColor: theme.bg }}
          >
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              {/* Table Column Actions & Alignment Controls Header */}
              <thead>
                <tr className="border-b" style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}>
                  <th className="w-10 p-2 text-center text-[10px] font-mono opacity-50 border-r" style={{ borderColor: theme.border }}>
                    #
                  </th>
                  {headers.map((header, colIdx) => {
                    const align = alignments[colIdx] || 'left';
                    return (
                      <th 
                        key={colIdx} 
                        className="p-2.5 border-r min-w-[160px] last:border-r-0"
                        style={{ borderColor: theme.border }}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          {/* Column Alignment Toggle */}
                          <button
                            type="button"
                            onClick={() => handleCycleAlignment(colIdx)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border transition-colors cursor-pointer hover:border-amber-500"
                            style={{ borderColor: theme.border, backgroundColor: theme.bgElevated }}
                            title={`Alignment: ${align} (Click to switch)`}
                          >
                            {align === 'left' && <AlignLeft className="w-3 h-3 text-blue-500" />}
                            {align === 'center' && <AlignCenter className="w-3 h-3 text-amber-500" />}
                            {align === 'right' && <AlignRight className="w-3 h-3 text-emerald-500" />}
                            <span>{align}</span>
                          </button>

                          {/* Delete Column */}
                          {headers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteColumn(colIdx)}
                              className="p-1 rounded opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity cursor-pointer"
                              title="Delete column"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Column Header Input */}
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          placeholder={`Column ${colIdx + 1}`}
                          className={`w-full px-2.5 py-1.5 rounded font-bold text-xs border outline-none focus:ring-1 focus:ring-amber-500 transition-all ${
                            align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                          }`}
                          style={{
                            backgroundColor: theme.bgElevated,
                            borderColor: theme.border,
                            color: theme.text,
                          }}
                        />
                      </th>
                    );
                  })}
                  <th className="w-12 p-2 border-l text-center opacity-40" style={{ borderColor: theme.border }} />
                </tr>
              </thead>

              {/* Table Data Rows */}
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className="border-b last:border-b-0 group transition-colors"
                    style={{ borderColor: theme.border }}
                  >
                    {/* Row Index Indicator */}
                    <td 
                      className="p-2 text-center text-[11px] font-mono opacity-50 border-r select-none"
                      style={{ borderColor: theme.border, backgroundColor: theme.bgSecondary }}
                    >
                      {rowIdx + 1}
                    </td>

                    {/* Editable Cells */}
                    {headers.map((_, colIdx) => {
                      const align = alignments[colIdx] || 'left';
                      return (
                        <td 
                          key={colIdx} 
                          className="p-1.5 border-r last:border-r-0"
                          style={{ borderColor: theme.border }}
                        >
                          <input
                            type="text"
                            value={row[colIdx] || ''}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            placeholder="Enter value..."
                            className={`w-full px-2.5 py-1.5 rounded text-xs border border-transparent hover:border-stone-400/40 focus:border-amber-500 outline-none transition-all ${
                              align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                            }`}
                            style={{
                              backgroundColor: 'transparent',
                              color: theme.text,
                            }}
                          />
                        </td>
                      );
                    })}

                    {/* Delete Row Button */}
                    <td 
                      className="p-1 text-center border-l opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ borderColor: theme.border }}
                    >
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(rowIdx)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div 
          className="px-6 py-4 border-t flex items-center justify-between gap-4 shrink-0"
          style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        >
          <div className="text-xs opacity-60 flex items-center gap-3">
            <span>
              <strong>{headers.length}</strong> columns × <strong>{rows.length}</strong> rows
            </span>
            <span>•</span>
            <span className="hidden sm:inline">Alignments configured automatically in Markdown syntax</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-stone-500/10 transition-colors cursor-pointer"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
              style={{
                backgroundColor: theme.accent,
                color: isDark ? '#1c1917' : '#ffffff',
              }}
            >
              <Check className="w-4 h-4" />
              <span>Insert Table into Markdown</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
