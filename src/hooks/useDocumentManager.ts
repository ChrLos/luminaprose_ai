import { useState, useEffect, useCallback, useMemo } from 'react';
import { DocumentItem, APP_STORAGE_KEYS } from '../types';
import { SAMPLE_DOCUMENTS } from '../utils/samples';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SNAPSHOTS_STORAGE_KEY = 'lumina_markdown_snapshots_v1';

// Legacy keys for one-time backwards compatibility migration
const OBSOLETE_KEYS = [
  'lumina_markdown_documents_v1',
  'lumina_documents',
  'lumina_docs',
  'markdown_documents',
  'lumina_notes',
  'notes',
  'documents',
];

/**
 * Remove obsolete legacy storage keys so old deleted notes do not linger
 */
function cleanupLegacyKeys() {
  try {
    for (const key of OBSOLETE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Remove snapshots belonging to permanently deleted documents
 */
function cleanupSnapshotsForDocs(docIds: string[]) {
  if (!docIds.length) return;
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const idSet = new Set(docIds);
        const filtered = parsed.filter((s: any) => s && !idSet.has(s.docId));
        localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(filtered));
      }
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Robust document loader that loads the single authoritative document store
 * with graceful migration for legacy users.
 */
export function loadSavedDocuments(): DocumentItem[] {
  try {
    // 1. Primary Source of Truth: APP_STORAGE_KEYS.DOCUMENTS ('lumina_markdown_documents')
    const primary = localStorage.getItem(APP_STORAGE_KEYS.DOCUMENTS);
    if (primary) {
      const parsed = JSON.parse(primary);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        // Auto-purge items in Recycle Bin older than 14 days
        const valid = parsed.filter(
          (d) => d && typeof d === 'object' && !(d.isDeleted && d.deletedAt && now - d.deletedAt > FOURTEEN_DAYS_MS)
        );
        return valid.length > 0 ? valid : SAMPLE_DOCUMENTS;
      }
    }

    // 2. Secondary fallback check: APP_STORAGE_KEYS.DOCUMENTS_V2
    const secondary = localStorage.getItem(APP_STORAGE_KEYS.DOCUMENTS_V2);
    if (secondary) {
      const parsed = JSON.parse(secondary);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const now = Date.now();
        const valid = parsed.filter(
          (d) => d && typeof d === 'object' && !(d.isDeleted && d.deletedAt && now - d.deletedAt > FOURTEEN_DAYS_MS)
        );
        if (valid.length > 0) {
          localStorage.setItem(APP_STORAGE_KEYS.DOCUMENTS, JSON.stringify(valid));
          return valid;
        }
      }
    }

    // 3. One-time legacy migration if primary has never been initialized
    for (const key of OBSOLETE_KEYS) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasDocs = parsed.some((d) => d && typeof d === 'object' && ('content' in d || 'title' in d));
            if (hasDocs) {
              const now = Date.now();
              const valid = parsed.filter(
                (d) => d && typeof d === 'object' && !(d.isDeleted && d.deletedAt && now - d.deletedAt > FOURTEEN_DAYS_MS)
              );
              if (valid.length > 0) {
                localStorage.setItem(APP_STORAGE_KEYS.DOCUMENTS, JSON.stringify(valid));
                localStorage.setItem(APP_STORAGE_KEYS.DOCUMENTS_V2, JSON.stringify(valid));
                cleanupLegacyKeys();
                return valid;
              }
            }
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse documents from localStorage:', e);
  }

  return SAMPLE_DOCUMENTS;
}

export function useDocumentManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>(() => loadSavedDocuments());

  const activeDocuments = useMemo(() => {
    return documents.filter((d) => !d.isDeleted);
  }, [documents]);

  const trashedDocuments = useMemo(() => {
    return documents.filter((d) => Boolean(d.isDeleted));
  }, [documents]);

  const [activeDocId, setActiveDocId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEYS.ACTIVE_DOC_ID);
      if (saved) return saved;
    } catch (e) {
      console.warn('Failed to parse activeDocId from localStorage:', e);
    }
    return 'sample-essay';
  });

  // Sync documents to localStorage (writes to both current and fallback keys for safety)
  useEffect(() => {
    try {
      const now = Date.now();
      const cleaned = documents.filter(
        (d) => !(d.isDeleted && d.deletedAt && now - d.deletedAt > FOURTEEN_DAYS_MS)
      );
      const json = JSON.stringify(cleaned);
      localStorage.setItem(APP_STORAGE_KEYS.DOCUMENTS, json);
      localStorage.setItem(APP_STORAGE_KEYS.DOCUMENTS_V2, json);
    } catch (e) {
      console.warn('Failed to save documents to localStorage:', e);
    }
  }, [documents]);

  // Sync activeDocId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(APP_STORAGE_KEYS.ACTIVE_DOC_ID, activeDocId);
    } catch (e) {
      console.warn('Failed to save activeDocId to localStorage:', e);
    }
  }, [activeDocId]);

  // Ensure activeDocId always points to a valid active (non-deleted) document
  useEffect(() => {
    if (activeDocuments.length > 0 && !activeDocuments.some((d) => d.id === activeDocId)) {
      setActiveDocId(activeDocuments[0].id);
    } else if (activeDocuments.length === 0 && documents.length === 0) {
      const fresh: DocumentItem = {
        id: 'doc-' + Date.now(),
        title: 'Untitled Document',
        content: '# Untitled Document\n\nStart writing...',
        updatedAt: Date.now(),
      };
      setDocuments([fresh]);
      setActiveDocId(fresh.id);
    }
  }, [activeDocuments, documents.length, activeDocId]);

  const activeDoc = activeDocuments.find((d) => d.id === activeDocId) || activeDocuments[0] || {
    id: 'doc-fallback',
    title: 'Untitled Document',
    content: '# Untitled Document\n\nStart writing...',
    updatedAt: Date.now(),
  };

  const updateActiveContent = useCallback((newContent: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocId ? { ...doc, content: newContent, updatedAt: Date.now() } : doc
      )
    );
  }, [activeDocId]);

  const updateActiveTitle = useCallback((newTitle: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocId ? { ...doc, title: newTitle, updatedAt: Date.now() } : doc
      )
    );
  }, [activeDocId]);

  const createDocument = useCallback((initialTitle?: string, initialContent?: string) => {
    const newDoc: DocumentItem = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: initialTitle || 'Untitled Document',
      content: initialContent || '# Untitled Document\n\nBegin drafting your thoughts here...\n',
      updatedAt: Date.now(),
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    return newDoc;
  }, []);

  const duplicateDocument = useCallback((docId: string) => {
    const target = documents.find((d) => d.id === docId);
    if (!target) return;
    const duplicated: DocumentItem = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: `${target.title} (Copy)`,
      content: target.content,
      updatedAt: Date.now(),
      tags: target.tags ? [...target.tags] : undefined,
    };
    setDocuments((prev) => [duplicated, ...prev]);
    setActiveDocId(duplicated.id);
  }, [documents]);

  // Soft delete: move to Recycle Bin with 14-day expiration
  const deleteDocument = useCallback((docId: string) => {
    setDocuments((prev) => {
      const updated = prev.map((d) =>
        d.id === docId ? { ...d, isDeleted: true, deletedAt: Date.now() } : d
      );
      return updated;
    });
  }, []);

  // Restore document from Recycle Bin
  const restoreDocument = useCallback((docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, isDeleted: false, deletedAt: undefined } : d
      )
    );
    setActiveDocId(docId);
  }, []);

  // Permanent deletion (purges document, snapshots, and clears legacy copies)
  const permanentDeleteDocument = useCallback((docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    cleanupSnapshotsForDocs([docId]);
    cleanupLegacyKeys();
  }, []);

  // Empty Recycle Bin completely
  const emptyTrash = useCallback(() => {
    const idsToPurge = trashedDocuments.map((d) => d.id);
    setDocuments((prev) => prev.filter((d) => !d.isDeleted));
    cleanupSnapshotsForDocs(idsToPurge);
    cleanupLegacyKeys();
  }, [trashedDocuments]);

  const renameDocument = useCallback((docId: string, newTitle: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, title: newTitle.trim() || 'Untitled', updatedAt: Date.now() } : doc
      )
    );
  }, []);

  const importDocuments = useCallback((newDocs: DocumentItem[], replaceExisting: boolean = false) => {
    if (replaceExisting) {
      setDocuments(newDocs);
      if (newDocs.length > 0) setActiveDocId(newDocs[0].id);
    } else {
      setDocuments((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const nonDuplicate = newDocs.map((d) =>
          existingIds.has(d.id) ? { ...d, id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7) } : d
        );
        return [...nonDuplicate, ...prev];
      });
      if (newDocs.length > 0) setActiveDocId(newDocs[0].id);
    }
  }, []);

  // Scan storage: only searches for unmigrated legacy notes and never resurrects deleted documents or snapshots
  const rescanStorage = useCallback((): number => {
    let recoveredCount = 0;
    try {
      const foundDocs: DocumentItem[] = [];
      const existingIds = new Set(documents.map((d) => d.id));
      const existingSignatures = new Set(
        documents.map((d) => `${d.title.trim().toLowerCase()}::${d.content.trim()}`)
      );

      for (const key of OBSOLETE_KEYS) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item && typeof item === 'object' && (item.title || item.content)) {
                  const title = typeof item.title === 'string' ? item.title.trim() : 'Recovered Document';
                  const content = typeof item.content === 'string' ? item.content : '';
                  const id = typeof item.id === 'string' ? item.id : 'doc-' + Math.random().toString(36).substring(2, 9);
                  const sig = `${title.toLowerCase()}::${content.trim()}`;

                  // Only import if not already present in active or trash
                  if (!existingIds.has(id) && !existingSignatures.has(sig)) {
                    foundDocs.push({
                      id,
                      title,
                      content,
                      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
                      tags: Array.isArray(item.tags) ? item.tags : undefined,
                    });
                    existingIds.add(id);
                    existingSignatures.add(sig);
                    recoveredCount++;
                  }
                }
              }
            }
            // Once inspected, clean up the obsolete key
            localStorage.removeItem(key);
          } catch {
            // Ignore
          }
        }
      }

      if (foundDocs.length > 0) {
        setDocuments((prev) => [...foundDocs, ...prev]);
      }
      cleanupLegacyKeys();
    } catch (e) {
      console.warn('Error during storage scan:', e);
    }
    return recoveredCount;
  }, [documents]);

  return {
    documents,
    activeDocuments,
    trashedDocuments,
    activeDoc,
    activeDocId,
    setActiveDocId,
    updateActiveContent,
    updateActiveTitle,
    createDocument,
    duplicateDocument,
    deleteDocument,
    restoreDocument,
    permanentDeleteDocument,
    emptyTrash,
    renameDocument,
    importDocuments,
    rescanStorage,
  };
}
