"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import * as React from "react";

type PageRevealProps = {
  children: React.ReactNode;
  className?: string;
};

const DEFAULT_THRESHOLD = 0.01;
const DEFAULT_ROOT_MARGIN = "0px 0px -10% 0px";

export function PageReveal({ children, className }: PageRevealProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = Array.from(container.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );

    container.classList.add("reveal-ready");

    elements.forEach((el, index) => {
      el.classList.add("reveal-item");
      el.style.setProperty("--reveal-delay", `${index * 60}ms`);
    });

    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("reveal-visible"));
      return () => {
        container.classList.remove("reveal-ready");
        elements.forEach((el) => {
          el.classList.remove("reveal-item", "reveal-visible");
          el.style.removeProperty("--reveal-delay");
        });
      };
    }

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
      container.classList.remove("reveal-ready");
      elements.forEach((el) => {
        el.classList.remove("reveal-item", "reveal-visible");
        el.style.removeProperty("--reveal-delay");
      });
    };
  }, [pathname]);

  return (
    <div ref={containerRef} className={cn("reveal-scope", className)}>
      {children}
    </div>
  );
}
