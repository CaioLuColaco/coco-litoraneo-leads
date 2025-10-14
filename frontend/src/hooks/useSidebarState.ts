import { useEffect, useState } from 'react';

interface UseSidebarStateOptions {
  storageKeyBase?: string;
  userId?: string | number | null | undefined;
}

export function useSidebarState(options: UseSidebarStateOptions = {}) {
  const { storageKeyBase = 'sidebar:state', userId } = options;
  const key = userId ? `${storageKeyBase}:${userId}` : storageKeyBase;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.isCollapsed === 'boolean') setIsCollapsed(parsed.isCollapsed);
      }
    } catch (_) {
      // ignore
    }
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ isCollapsed }));
    } catch (_) {
      // ignore
    }
  }, [key, isCollapsed]);

  const openMobile = () => setIsMobileOpen(true);
  const closeMobile = () => setIsMobileOpen(false);
  const toggleCollapsed = () => setIsCollapsed(prev => !prev);

  return { isCollapsed, toggleCollapsed, isMobileOpen, openMobile, closeMobile };
}

export default useSidebarState;


