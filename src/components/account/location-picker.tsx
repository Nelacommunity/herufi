"use client";

import { useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

type Pin = { lat: number; lng: number; accuracy?: number };

/**
 * "Use my current location": asks the browser for GPS coordinates and submits them with the
 * surrounding form as `latitude` / `longitude`. Optional; the typed address is always required.
 */
export function LocationPicker({ defaultLat, defaultLng }: { defaultLat?: number | null; defaultLng?: number | null }) {
  const { t } = useI18n();
  const l = t.location;
  const [pin, setPin] = useState<Pin | null>(defaultLat != null && defaultLng != null ? { lat: defaultLat, lng: defaultLng } : null);
  const [state, setState] = useState<"idle" | "locating" | "denied" | "failed">("idle");

  function locate() {
    if (!("geolocation" in navigator)) return setState("failed");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)), accuracy: Math.round(pos.coords.accuracy) });
        setState("idle");
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border p-4">
      <input type="hidden" name="latitude" value={pin?.lat ?? ""} />
      <input type="hidden" name="longitude" value={pin?.lng ?? ""} />
      {pin ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-success" />
          <span className="font-medium">{l.pinned}</span>
          {pin.accuracy != null && <span className="text-muted">{fmt(l.accuracy, { m: pin.accuracy })}</span>}
          <a href={`https://www.google.com/maps?q=${pin.lat},${pin.lng}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">{l.view}</a>
          <button type="button" onClick={() => setPin(null)} className="text-muted underline underline-offset-4 hover:text-foreground">{l.remove}</button>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={locate} disabled={state === "locating"}>
          {state === "locating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {state === "locating" ? l.locating : l.use}
        </Button>
      )}
      <p className={state === "denied" || state === "failed" ? "mt-2 text-sm text-sale" : "mt-2 text-xs text-muted"} role={state === "denied" || state === "failed" ? "alert" : undefined}>
        {state === "denied" ? l.denied : state === "failed" ? l.failed : l.hint}
      </p>
    </div>
  );
}
