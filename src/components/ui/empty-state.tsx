import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: {
  icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center animate-fade-up", className)}>
      {icon && (
        <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-surface-2 text-foreground [&_svg]:h-8 [&_svg]:w-8 [&_svg]:stroke-[1.5]">
          {icon}
        </div>
      )}
      <h2 className="font-display text-3xl tracking-tight sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-pretty text-muted">{description}</p>}
      {action && <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
