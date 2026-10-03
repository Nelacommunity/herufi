import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,border-color,transform,box-shadow,opacity] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

const variants = {
  primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_1px_0_rgb(255_255_255/0.08)_inset]",
  secondary: "bg-surface text-foreground border border-border-strong hover:border-foreground",
  soft: "bg-surface-2 text-foreground hover:bg-surface-3",
  ghost: "text-foreground hover:bg-surface-2",
  outline: "border border-current text-foreground hover:bg-foreground hover:text-background",
  link: "rounded-none px-0 h-auto text-foreground underline-offset-4 hover:underline",
  danger: "bg-sale text-white hover:opacity-90",
  inverse: "bg-white text-neutral-950 hover:bg-white/90",
};

const sizes = {
  xs: "h-8 px-3 text-xs",
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px]",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8",
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonVariants({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], variant !== "link" && sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonVariants({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="absolute" />}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
    </button>
  );
});
