import { useEffect } from 'react';

interface ShortcutActions {
  onRefresh: () => void;
  onFocusSearch: () => void;
  onToggleTheme: () => void;
  onToggleBookmarks: () => void;
  onExport: () => void;
  onShowHelp: () => void;
  onCategoryFilter: (index: number) => void;
  onClearFilters: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          actions.onShowHelp();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          actions.onRefresh();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          actions.onFocusSearch();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          actions.onToggleTheme();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          actions.onToggleBookmarks();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          actions.onExport();
          break;
        case '0':
          e.preventDefault();
          actions.onClearFilters();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          e.preventDefault();
          actions.onCategoryFilter(parseInt(e.key) - 1);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);
}
