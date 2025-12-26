"use client";

import type { MdxComponentDefinition } from "@/components/mdx/types";
import { GenericJsxEditor } from "@mdxeditor/editor";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import {
  MdxImage,
  type MdxImageProps,
  IMAGE_COMPONENT_DESCRIPTOR,
} from "./mdx-image";

const IMAGE_EDITOR_DESCRIPTOR: JsxComponentDescriptor = {
  ...IMAGE_COMPONENT_DESCRIPTOR,
  Editor: GenericJsxEditor,
};

export const ImageDefinition: MdxComponentDefinition<MdxImageProps> = {
  id: "Image",
  label: "图片",
  category: "media",
  descriptor: IMAGE_EDITOR_DESCRIPTOR,
  Renderer: MdxImage,
  defaultProps: {
    alt: "",
    caption: "",
  },
  normalizeProps: (input: Record<string, unknown>) => {
    const src = typeof input.src === "string" ? input.src : "";
    const alt = typeof input.alt === "string" ? input.alt : "";
    const caption = typeof input.caption === "string" ? input.caption : "";
    const width = Number.isFinite(Number(input.width))
      ? Number(input.width)
      : undefined;
    const height = Number.isFinite(Number(input.height))
      ? Number(input.height)
      : undefined;
    return { src, alt, caption, width, height };
  },
};
