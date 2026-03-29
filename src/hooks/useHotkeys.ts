import { useEffect } from 'react';

type HotkeyMap = Record<string, () => void>;

export const useHotkeys = (bindings: HotkeyMap) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (meta && key === 'k' && bindings['mod+k']) {
        event.preventDefault();
        bindings['mod+k']();
      }

      if (key === 'n' && !meta && bindings.n) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();
        const editable = target?.getAttribute('contenteditable') === 'true';
        if (tag === 'input' || tag === 'textarea' || editable) return;
        event.preventDefault();
        bindings.n();
      }

      if (meta && key === 'f' && bindings['mod+f']) {
        event.preventDefault();
        bindings['mod+f']();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindings]);
};
