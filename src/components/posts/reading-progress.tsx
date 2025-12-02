"use client";

import { motion } from "motion/react";
import { RefObject, useEffect, useState } from "react";

interface ReadingProgressProps {
  articleRef: RefObject<HTMLDivElement | null>;
}

export function ReadingProgress({ articleRef }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const target = articleRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const total = rect.height - viewportHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress((scrolled / total) * 100);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [articleRef]);

  return (
    <motion.div
      className="reading-progress bg-primary fixed top-0 left-0 z-50 h-1"
      style={{ transformOrigin: "0% 50%" }}
      animate={{ width: `${progress}%` }}
      transition={{ type: "tween", duration: 0.12 }}
    />
  );
}
