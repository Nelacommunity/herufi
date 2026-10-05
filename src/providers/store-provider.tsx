"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { CartLine, ProductSummary, ProductVariant, QuoteLine } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

// v2: prices moved to TZS, so carts saved before that are discarded.
const CART_KEY = "herufi:cart:v2";
const WISHLIST_KEY = "herufi:wishlist:v1";
const SYNCED_KEY = "herufi:synced-user";
const VIEWED_KEY = "herufi:viewed:v1";

type SessionUser = Pick<User, "id" | "email"> & { name: string | null };

interface StoreValue {
  ready: boolean;
  user: SessionUser | null;
  isAdmin: boolean;
  authReady: boolean;
  lines: CartLine[];
  activeLines: CartLine[];
  savedLines: CartLine[];
  itemCount: number;
  subtotal: number;
  bump: number;
  wishlist: string[];
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: ProductSummary, variant: ProductVariant | null, quantity?: number, opts?: { openDrawer?: boolean }) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeLine: (productId: string, variantId: string | null) => void;
  setSavedForLater: (productId: string, variantId: string | null, saved: boolean) => void;
  clearCart: () => void;
  applyQuote: (lines: QuoteLine[]) => void;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string, name?: string) => void;
  trackView: (productId: string) => void;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const sameLine = (l: CartLine, productId: string, variantId: string | null) => l.productId === productId && l.variantId === variantId;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) */
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToLine(r: any): CartLine | null {
  const p = r.product;
  if (!p) return null;
  const v = r.variant;
  const image = (p.images ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url ?? null;
  return {
    productId: r.product_id,
    variantId: r.variant_id,
    quantity: r.quantity,
    savedForLater: r.saved_for_later,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    image,
    unitPrice: Number(p.price) + Number(v?.additional_price ?? 0),
    compareAtPrice: p.compare_at_price == null ? null : Number(p.compare_at_price) + Number(v?.additional_price ?? 0),
    variantLabel: v ? `${v.name}: ${v.value}` : null,
    maxQuantity: Math.min(99, Number(v ? v.stock_quantity : p.stock_quantity)),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function StoreProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
  const [ready, setReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const userRef = useRef<SessionUser | null>(null);

  // Hydrate from local storage.
  useEffect(() => {
    // One-time hydration from browser storage (an external system) after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(read<CartLine[]>(CART_KEY, []));
    setWishlist(read<string[]>(WISHLIST_KEY, []));
    setReady(true);
  }, []);

  useEffect(() => { if (ready) write(CART_KEY, lines); }, [lines, ready]);
  useEffect(() => { if (ready) write(WISHLIST_KEY, wishlist); }, [wishlist, ready]);

  const loadRemote = useCallback(async (u: SessionUser) => {
    const syncedUser = read<string | null>(SYNCED_KEY, null);
    // Merge whatever was collected as a guest into the account the first time we see this user.
    if (syncedUser !== u.id) {
      const local = read<CartLine[]>(CART_KEY, []).filter((l) => !l.savedForLater);
      const localWish = read<string[]>(WISHLIST_KEY, []);
      await Promise.all([
        local.length ? supabase.rpc("cart_merge", { items: local.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })) }) : null,
        localWish.length ? supabase.rpc("wishlist_merge", { product_ids: localWish }) : null,
      ]);
      write(SYNCED_KEY, u.id);
    }
    const [cart, wish, profile] = await Promise.all([
      supabase
        .from("cart_items")
        .select("product_id, variant_id, quantity, saved_for_later, product:products(name, slug, brand, price, compare_at_price, stock_quantity, images:product_images(image_url, sort_order)), variant:product_variants(name, value, additional_price, stock_quantity)")
        .order("created_at"),
      supabase.from("wishlist_items").select("product_id").order("created_at", { ascending: false }),
      supabase.from("profiles").select("role").eq("user_id", u.id).maybeSingle(),
    ]);
    setIsAdmin(profile.data?.role === "admin" || profile.data?.role === "super_admin");
    if (!cart.error) setLines((cart.data ?? []).map(rowToLine).filter((l): l is CartLine => Boolean(l)));
    if (!wish.error) setWishlist((wish.data ?? []).map((w) => w.product_id as string));
  }, [supabase]);

  // Auth state
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const toSession = (u: User | null): SessionUser | null =>
      u ? { id: u.id, email: u.email, name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? null } : null;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const u = toSession(data.user);
      userRef.current = u;
      setUser(u);
      setAuthReady(true);
      if (u) loadRemote(u);
      else write(SYNCED_KEY, null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = toSession(session?.user ?? null);
      if (event === "SIGNED_IN" && u && userRef.current?.id !== u.id) {
        userRef.current = u;
        setUser(u);
        loadRemote(u);
      } else if (event === "SIGNED_OUT") {
        userRef.current = null;
        setUser(null);
        setIsAdmin(false);
        setLines([]);
        setWishlist([]);
        write(SYNCED_KEY, null);
      } else if (event === "USER_UPDATED" && u) {
        userRef.current = u;
        setUser(u);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [ready, supabase, loadRemote]);

  const remote = useCallback(
    async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
      if (!userRef.current) return;
      const { error } = await fn();
      if (error) toast.error(tRef.current.cart.saveError, { description: error.message });
    },
    [],
  );

  const linesRef = useRef<CartLine[]>([]);
  const wishlistRef = useRef<string[]>([]);
  const commitLines = useCallback((next: CartLine[]) => {
    linesRef.current = next;
    setLines(next);
  }, []);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { wishlistRef.current = wishlist; }, [wishlist]);

  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    const line = linesRef.current.find((l) => sameLine(l, productId, variantId));
    if (!line) return;
    const q = Math.min(Math.max(0, quantity), line.maxQuantity || 99);
    commitLines(q > 0
      ? linesRef.current.map((l) => (l === line ? { ...l, quantity: q } : l))
      : linesRef.current.filter((l) => l !== line));
    remote(() => supabase.rpc("cart_set_item", { p_product_id: productId, p_variant_id: variantId, p_quantity: q, p_saved_for_later: line.savedForLater }));
  }, [commitLines, remote, supabase]);

  const addToCart = useCallback<StoreValue["addToCart"]>((product, variant, quantity = 1, opts) => {
    const max = Math.min(99, variant ? variant.stock_quantity : product.stock_quantity);
    if (max <= 0) {
      toast.error(tRef.current.cart.soldOut, { description: fmt(tRef.current.cart.soldOutDesc, { name: product.name }) });
      return;
    }
    const existing = linesRef.current.find((l) => sameLine(l, product.id, variant?.id ?? null));
    const nextQty = Math.min(max, (existing && !existing.savedForLater ? existing.quantity : 0) + quantity);
    const extra = variant?.additional_price ?? 0;
    const line: CartLine = {
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity: nextQty,
      savedForLater: false,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      image: product.images[0]?.image_url ?? null,
      unitPrice: product.price + extra,
      compareAtPrice: product.compare_at_price ? product.compare_at_price + extra : null,
      variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
      maxQuantity: max,
    };
    commitLines(existing ? linesRef.current.map((l) => (l === existing ? line : l)) : [...linesRef.current, line]);
    setBump((b) => b + 1);
    remote(() => supabase.rpc("cart_set_item", { p_product_id: product.id, p_variant_id: variant?.id ?? null, p_quantity: nextQty, p_saved_for_later: false }));
    if (opts?.openDrawer) setCartOpen(true);
    else
      toast.success(tRef.current.cart.added, {
        description: `${product.name}${variant ? ` · ${variant.value}` : ""}`,
        action: { label: tRef.current.cart.viewBag, onClick: () => setCartOpen(true) },
      });
  }, [commitLines, remote, supabase]);

  const removeLine = useCallback((productId: string, variantId: string | null) => {
    commitLines(linesRef.current.filter((l) => !sameLine(l, productId, variantId)));
    remote(() => supabase.rpc("cart_set_item", { p_product_id: productId, p_variant_id: variantId, p_quantity: 0 }));
  }, [commitLines, remote, supabase]);

  const setSavedForLater = useCallback((productId: string, variantId: string | null, saved: boolean) => {
    const line = linesRef.current.find((l) => sameLine(l, productId, variantId));
    if (!line) return;
    commitLines(linesRef.current.map((l) => (l === line ? { ...l, savedForLater: saved } : l)));
    remote(() => supabase.rpc("cart_set_item", { p_product_id: productId, p_variant_id: variantId, p_quantity: line.quantity, p_saved_for_later: saved }));
  }, [commitLines, remote, supabase]);

  /** Local only: the server clears purchased lines inside place_order. */
  const clearCart = useCallback(() => commitLines(linesRef.current.filter((l) => l.savedForLater)), [commitLines]);

  const applyQuote = useCallback((quoteLines: QuoteLine[]) => {
    let changed = false;
    const next = linesRef.current.map((l) => {
      const q = quoteLines.find((ql) => ql.product_id === l.productId && (ql.variant_id ?? null) === l.variantId);
      if (!q) return l;
      const unitPrice = Number(q.unit_price);
      const maxQuantity = Math.min(99, Number(q.available));
      if (unitPrice === l.unitPrice && maxQuantity === l.maxQuantity) return l;
      changed = true;
      return { ...l, unitPrice, maxQuantity };
    });
    if (changed) commitLines(next);
  }, [commitLines]);

  const toggleWishlist = useCallback((productId: string, name?: string) => {
    const saved = !wishlistRef.current.includes(productId);
    const next = saved ? [productId, ...wishlistRef.current] : wishlistRef.current.filter((id) => id !== productId);
    wishlistRef.current = next;
    setWishlist(next);
    if (saved) toast.success(tRef.current.product.savedToWishlist, name ? { description: name } : undefined);
    remote(() => supabase.rpc("wishlist_set", { p_product_id: productId, p_saved: saved }));
  }, [remote, supabase]);

  const trackView = useCallback((productId: string) => {
    const viewed = read<string[]>(VIEWED_KEY, []).filter((id) => id !== productId);
    write(VIEWED_KEY, [productId, ...viewed].slice(0, 16));
    if (userRef.current) {
      supabase.from("product_views").upsert({ user_id: userRef.current.id, product_id: productId, viewed_at: new Date().toISOString() }).then(() => {});
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    write(CART_KEY, []);
    write(WISHLIST_KEY, []);
  }, [supabase]);

  const value = useMemo<StoreValue>(() => {
    const activeLines = lines.filter((l) => !l.savedForLater);
    return {
      ready,
      user,
      isAdmin,
      authReady,
      lines,
      activeLines,
      savedLines: lines.filter((l) => l.savedForLater),
      itemCount: activeLines.reduce((n, l) => n + l.quantity, 0),
      subtotal: activeLines.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
      bump,
      wishlist,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      addToCart,
      setQuantity,
      removeLine,
      setSavedForLater,
      clearCart,
      applyQuote,
      isWishlisted: (id) => wishlist.includes(id),
      toggleWishlist,
      trackView,
      signOut,
    };
  }, [ready, user, isAdmin, authReady, lines, bump, wishlist, cartOpen, addToCart, setQuantity, removeLine, setSavedForLater, clearCart, applyQuote, toggleWishlist, trackView, signOut]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function readRecentlyViewed(): string[] {
  return read<string[]>(VIEWED_KEY, []);
}
