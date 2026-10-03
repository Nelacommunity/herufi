"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const { t } = useI18n();
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => null);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <button onClick={toggle} className={cn("inline-flex items-center gap-2 rounded-full transition-colors hover:bg-surface-2", withLabel ? "h-10 px-3 text-sm" : "grid h-10 w-10 place-items-center", className)} aria-label={dark ? t.common.switchToLight : t.common.switchToDark}>
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      {withLabel && <span>{dark ? t.common.lightMode : t.common.darkMode}</span>}
    </button>
  );
}
