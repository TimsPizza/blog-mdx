"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

type PageRevealProps = {
  children: React.ReactNode;
  className?: string;
};

const DEFAULT_THRESHOLD = 0.15;
const DEFAULT_ROOT_MARGIN = "0px 0px -10% 0px";

export function PageReveal({ children, className }: PageRevealProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );

    elements.forEach((el, index) => {
      el.classList.add("reveal-item");
      el.style.setProperty("--reveal-delay", `${index * 60}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.classList.add("reveal-visible");
          observer.unobserve(target);
        });
      },
      { threshold: DEFAULT_THRESHOLD, rootMargin: DEFAULT_ROOT_MARGIN },
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      elements.forEach((el) => {
        el.classList.remove("reveal-item", "reveal-visible");
        el.style.removeProperty("--reveal-delay");
      });
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("reveal-scope", className)}>
      {children}
    </div>
  );
}
