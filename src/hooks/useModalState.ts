import { useState, useCallback } from 'react';
import { DocumentSnapshot } from '../types';

export function useModalState() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAmbientSoundOpen, setIsAmbientSoundOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTableBuilderOpen, setIsTableBuilderOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
  const [isTypographyDrawerOpen, setIsTypographyDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [selectedSnapshotForDiff, setSelectedSnapshotForDiff] = useState<DocumentSnapshot | null>(null);

  // Mermaid Zoom Modal state (for preview clicks)
  const [mermaidModalData, setMermaidModalData] = useState<{
    isOpen: boolean;
    code: string;
    svgHtml: string;
  }>({
    isOpen: false,
    code: '',
    svgHtml: '',
  });

  const openDiffModal = useCallback((snapshot: DocumentSnapshot) => {
    setSelectedSnapshotForDiff(snapshot);
    setIsDiffModalOpen(true);
  }, []);

  const closeDiffModal = useCallback(() => {
    setIsDiffModalOpen(false);
    setSelectedSnapshotForDiff(null);
  }, []);

  const openMermaidModal = useCallback((code: string, svgHtml: string) => {
    setMermaidModalData({
      isOpen: true,
      code,
      svgHtml,
    });
  }, []);

  const closeMermaidModal = useCallback(() => {
    setMermaidModalData((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    isExportOpen,
    setIsExportOpen,
    isAmbientSoundOpen,
    setIsAmbientSoundOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isTableBuilderOpen,
    setIsTableBuilderOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isChangelogOpen,
    setIsChangelogOpen,
    isDocManagerOpen,
    setIsDocManagerOpen,
    isTypographyDrawerOpen,
    setIsTypographyDrawerOpen,
    isHistoryDrawerOpen,
    setIsHistoryDrawerOpen,
    isDiffModalOpen,
    selectedSnapshotForDiff,
    openDiffModal,
    closeDiffModal,
    mermaidModalData,
    openMermaidModal,
    closeMermaidModal,
  };
}
