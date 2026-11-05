"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ship } from "lucide-react";
import { toast } from "sonner";
import { dispatchBatch, setOrderShipDate } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatShipDate } from "@/lib/shipping";

export function DispatchBatchButton({ date, ready, waiting }: { date: string; ready: number; waiting: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const label = formatShipDate(date, "en-GB", { day: "numeric", month: "short" });
  return (
    <Button size="sm" disabled={pending}
      onClick={() => {
        const roll = waiting ? `\n${waiting} order${waiting === 1 ? " is" : "s are"} not in the warehouse yet and will move to the next batch.` : "";
        if (!window.confirm(`Mark ${ready} packed order${ready === 1 ? "" : "s"} from the ${label} batch as in transit?${roll}`)) return;
        start(async () => {
          const r = await dispatchBatch(date);
          if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error);
        });
      }}>
      <Ship className="h-4 w-4" /> Dispatch {label} batch
    </Button>
  );
}

export function ShipDateSelect({ id, value, options }: { id: string; value: string; options: string[] }) {
  const [current, setCurrent] = useState(value);
  const [pending, start] = useTransition();
  const router = useRouter();
  const choices = options.includes(value) ? options : [value, ...options];
  return (
    <Select aria-label="Shipping batch" value={current} disabled={pending} className="mt-2 h-10 w-full"
      onChange={(e) => {
        const next = e.target.value;
        const prev = current;
        setCurrent(next);
        start(async () => {
          const r = await setOrderShipDate(id, next);
          if (r.ok) { toast.success(r.message); router.refresh(); } else { toast.error(r.error); setCurrent(prev); }
        });
      }}>
      {choices.map((d) => <option key={d} value={d}>{formatShipDate(d, "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</option>)}
    </Select>
  );
}
