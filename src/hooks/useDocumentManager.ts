import { useState, useEffect, useCallback, useMemo } from 'react';
import { DocumentItem, APP_STORAGE_KEYS } from '../types';
import { SAMPLE_DOCUMENTS } from '../utils/samples';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

// List of all legacy and current storage keys for document persistence
const DOCUMENT_STORAGE_KEYS = [
  APP_STORAGE_KEYS.DOCUMENTS,
  APP_STORAGE_KEYS.DOCUMENTS_V2,
  'lumina_markdown_documents',
  'lumina_markdown_documents_v2',
  'lumina_markdown_documents_v1',
  'lumina_documents',
  'lumina_docs',
  'markdown_documents',
  'lumina_notes',
  'notes',
  'documents',
];

const SNAPSHOT_KEYS = [
  'lumina_markdown_snapshots_v1',
  'lumina_markdown_snapshots',
  'lumina_snapshots',
  'snapshots',
];

/**
 * Deep exhaustive loader that retrieves documents across all current & legacy keys,
 * as well as recovering user drafts from saved snapshots and any JSON stored in localStorage.
 */
export function loadSavedDocuments(): DocumentItem[] {
  const documentMap = new Map<string, DocumentItem>();
  const sampleTitles = new Set(SAMPLE_DOCUMENTS.map((s) => s.title.trim().toLowerCase()));
  const sampleContents = new Set(SAMPLE_DOCUMENTS.map((s) => s.content.trim()));

  const addDoc = (doc: unknown) => {
    if (!doc || typeof doc !== 'object') return;
    const d = doc as Record<string, unknown>;
    const title = typeof d.title === 'string' ? d.title.trim() : '';
    const content = typeof d.content === 'string' ? d.content : '';
    const id = typeof d.id === 'string' ? d.id : 'doc-' + Math.random().toString(36).substring(2, 9);
    const updatedAt = typeof d.updatedAt === 'number' ? d.updatedAt : Date.now();
    const isDeleted = Boolean(d.isDeleted);
    const deletedAt = typeof d.deletedAt === 'number' ? d.deletedAt : undefined;

    if (!title && !content) return;

    // Check expiration for deleted documents
    if (isDeleted && deletedAt && Date.now() - deletedAt > FOURTEEN_DAYS_MS) {
      return;
    }

    const docItem: DocumentItem = {
      id,
      title: title || 'Untitled Document',
      content: content || '# Untitled Document\n\n',
      updatedAt,
      isDeleted: isDeleted || undefined,
      deletedAt,
      tags: Array.isArray(d.tags) ? (d.tags.filter((t) => typeof t === 'string') as string[]) : undefined,
    };

    // Use unique identifier by ID or content hash
    const key = docItem.id || docItem.title + ':' + docItem.content.substring(0, 40);
    if (!documentMap.has(key)) {
      documentMap.set(key, docItem);
    }
  };

  try {
    // 1. Scan all known document keys
    for (const key of DOCUMENT_STORAGE_KEYS) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach(addDoc);
          } else if (parsed && typeof parsed === 'object') {
            addDoc(parsed);
          }
        } catch {
          // Continue
        }
      }
    }

    // 2. Scan snapshots for user notes
    for (const key of SNAPSHOT_KEYS) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            for (const snap of parsed) {
              if (snap && typeof snap === 'object' && snap.content) {
                const isSample = sampleContents.has(snap.content.trim()) || sampleTitles.has((snap.title || '').trim().toLowerCase());
                if (!isSample) {
                  // Found user snapshot! Add it as a restorable document if not already present
                  const existingDocWithContent = Array.from(documentMap.values()).some((d) => d.content.trim() === snap.content.trim());
                  if (!existingDocWithContent) {
                    addDoc({
                      id: snap.docId || 'doc-' + snap.timestamp || 'doc-recovered-' + Math.random().toString(36).substring(2, 7),
                      title: snap.title || (snap.label ? `Recovered: ${snap.label}` : 'Recovered Document'),
                      content: snap.content,
                      updatedAt: snap.timestamp || Date.now(),
                    });
                  }
                }
              }
            }
          }
        } catch {
          // Continue
        }
      }
    }

    // 3. Scan all remaining localStorage keys for any Markdown documents
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (DOCUMENT_STORAGE_KEYS.includes(key) || SNAPSHOT_KEYS.includes(key)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (raw && (raw.startsWith('[') || raw.startsWith('{'))) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.title && parsed[0]?.content) {
            parsed.forEach(addDoc);
          } else if (parsed && typeof parsed === 'object' && parsed.title && parsed.content) {
            addDoc(parsed);
          }
        }
      } catch {
        // Ignore
      }
    }
  } catch (e) {
    console.warn('Failed to parse documents from localStorage:', e);
  }

  const allDocs = Array.from(documentMap.values());

  // If user documents were found, return them (non-sample documents first)
  if (allDocs.length > 0) {
    const userDocs = allDocs.filter(
      (d) => !sampleTitles.has(d.title.trim().toLowerCase()) && !sampleContents.has(d.content.trim())
    );
    const sampleDocs = allDocs.filter(
      (d) => sampleTitles.has(d.title.trim().toLowerCase()) || sampleContents.has(d.content.trim())
    );

    // If user has created documents, place them on top and keep samples available
    const combined = [...userDocs, ...sampleDocs];
    return combined.length > 0 ? combined : SAMPLE_DOCUMENTS;
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

  // Sync documents to localStorage (writes to both current and fallback keys for maximum safety)
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

  // Permanent deletion
  const permanentDeleteDocument = useCallback((docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  // Empty Recycle Bin completely
  const emptyTrash = useCallback(() => {
    setDocuments((prev) => prev.filter((d) => !d.isDeleted));
  }, []);

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

  // Force re-scan of localStorage to pull any external/recovered notes
  const rescanStorage = useCallback(() => {
    const freshDocs = loadSavedDocuments();
    setDocuments(freshDocs);
    if (freshDocs.length > 0 && !freshDocs.some((d) => d.id === activeDocId)) {
      setActiveDocId(freshDocs[0].id);
    }
  }, [activeDocId]);

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
