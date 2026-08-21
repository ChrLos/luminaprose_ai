import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * useFocusTrap Hook
 * Traps Tab and Shift+Tab key navigation within a modal dialog or drawer container.
 * Automatically focuses the first focusable element when opened, and returns focus on close.
 * Handles Escape key dismissal safely.
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isOpen: boolean,
  onDismiss?: () => void,
  autoFocusElementRef?: React.RefObject<HTMLElement | null>
) {
  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore later
    if (document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    const container = containerRef.current;
    if (!container) return;

    // Auto-focus specified element or first focusable child
    const timer = setTimeout(() => {
      if (autoFocusElementRef?.current) {
        autoFocusElementRef.current.focus();
      } else {
        const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          container.focus();
        }
      }
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onDismiss) {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => {
        return el.offsetParent !== null && window.getComputedStyle(el).visibility !== 'hidden';
      });

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        try {
          previousActiveElementRef.current.focus();
        } catch {
          // Ignore focus errors
        }
      }
    };
  }, [isOpen, onDismiss, autoFocusElementRef]);

  return containerRef;
}
