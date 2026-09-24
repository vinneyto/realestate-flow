import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_12px_45px_-30px_rgba(0,0,0,.28)]", className)} {...props} />; }
