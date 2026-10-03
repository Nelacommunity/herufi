"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface UIValue {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openSearch = useCallback(() => { setMenuOpen(false); setSearchOpen(true); }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // ⌘K / Ctrl+K and "/" open search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  const value = useMemo(() => ({ searchOpen, openSearch, closeSearch, menuOpen, openMenu, closeMenu }), [searchOpen, openSearch, closeSearch, menuOpen, openMenu, closeMenu]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}
