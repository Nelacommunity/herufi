"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type Listener = (imageUrl: string) => void;
type Ctx = { show: (imageUrl: string) => void; subscribe: (fn: Listener) => () => void };
const VariantImageContext = createContext<Ctx>({ show: () => {}, subscribe: () => () => {} });

/**
 * Lets the purchase panel tell the gallery "show this photo" when a variant (e.g. a colour) is chosen.
 * The gallery keeps every photo, with the cover first; it just moves to the variant's photo.
 */
export function VariantImageProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const show = useCallback((url: string) => listeners.current.forEach((fn) => fn(url)), []);
  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);
  const value = useMemo(() => ({ show, subscribe }), [show, subscribe]);
  return <VariantImageContext.Provider value={value}>{children}</VariantImageContext.Provider>;
}

export const useVariantImage = () => useContext(VariantImageContext);
