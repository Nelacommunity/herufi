import { Factory, ShieldCheck, Smartphone, Truck } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

const icons = [Factory, Truck, Smartphone, ShieldCheck];

export function ValueProps({ t }: { t: Dictionary }) {
  return (
    <section className="border-y border-border">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
        {t.home.values.map(({ title, text }, i) => {
          const Icon = icons[i];
          return (
            <div key={title} className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Icon className="h-6 w-6 shrink-0 stroke-[1.5]" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-muted">{text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
