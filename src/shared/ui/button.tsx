import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
const styles = cva("inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-50", { variants: { variant: { default: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-85", outline: "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]", ghost: "border-transparent hover:bg-[var(--accent)]" } }, defaultVariants: { variant: "default" } });
export default function Button({ className, variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles>) { return <button className={cn(styles({ variant }), className)} {...props} />; }
