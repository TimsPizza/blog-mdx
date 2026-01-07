"use client";

import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef, useState } from "react";

type MdxCodeBlockProps = ComponentPropsWithoutRef<"pre">;

const COPY_RESET_DELAY_MS = 1200;

const copyToClipboard = async (value: string) => {
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  return success;
};

export function MdxCodeBlock({
  className,
  children,
  ...props
}: MdxCodeBlockProps) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const codeElement = preRef.current?.querySelector("code");
    const text = codeElement?.textContent ?? preRef.current?.textContent ?? "";
    try {
      const success = await copyToClipboard(text);
      if (!success) return;
      setCopied(true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, COPY_RESET_DELAY_MS);
    } catch (error) {
      console.error("Failed to copy code", error);
    }
  };

  return (
    <div className="group relative not-prose">
      <button
        type="button"
        className="bg-background/80 text-foreground absolute right-2 top-2 rounded-md border px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre ref={preRef} {...props} className={cn("mdx-code-block", className)}>
        {children}
      </pre>
    </div>
  );
}
