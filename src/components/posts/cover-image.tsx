"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

type CoverImageProps = {
  src: string;
  alt: string;
  containerClassName?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
};

export function CoverImage({
  src,
  alt,
  containerClassName,
  imageClassName,
  width,
  height,
  fill,
  sizes,
  priority,
}: CoverImageProps) {
  const [bgColor, setBgColor] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    if (!src) return;
    setBgColor(null);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      if (canceled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setBgColor(`rgb(${255 - r}, ${255 - g}, ${255 - b})`);
      } catch {
        setBgColor(null);
      }
    };
    img.onerror = () => {
      if (!canceled) setBgColor(null);
    };

    return () => {
      canceled = true;
    };
  }, [src]);

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center",
        containerClassName,
      )}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </div>
  );
}
