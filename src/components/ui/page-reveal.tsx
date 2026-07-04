import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageRevealProps = {
  children: ReactNode;
  className?: string;
};

export function PageReveal({ children, className }: PageRevealProps) {
  return (
    <div className={cn("reveal-scope", className)}>
      {children}
    </div>
  );
}
