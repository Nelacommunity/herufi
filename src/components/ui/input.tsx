import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-border-strong bg-surface px-4 text-[15px] text-foreground placeholder:text-subtle transition-[border-color,box-shadow] duration-150 outline-none hover:border-muted focus:border-foreground focus:ring-4 focus:ring-ring disabled:opacity-60 aria-[invalid=true]:border-sale";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(field, "h-12", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(field, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(field, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
});

export function Label({ htmlFor, children, className, optional }: { htmlFor?: string; children: ReactNode; className?: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}>
      {children}
      {optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
    </label>
  );
}

export function Field({ label, htmlFor, error, hint, optional, children, className }: {
  label: string; htmlFor: string; error?: string; hint?: string; optional?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} optional={optional}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-sale">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ className, label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("group flex cursor-pointer items-center gap-3 text-[15px]", className)}>
      <span className="relative grid h-5 w-5 shrink-0 place-items-center">
        <input type="checkbox" className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-border-strong bg-surface transition-colors checked:border-foreground checked:bg-foreground focus-visible:outline-2" {...props} />
        <svg className="pointer-events-none absolute inset-0 h-5 w-5 scale-50 p-1 text-background opacity-0 transition-all peer-checked:scale-100 peer-checked:opacity-100" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex-1">{label}</span>
    </label>
  );
}
