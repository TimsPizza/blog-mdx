"use client";

import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import {
  IMAGE_COMPONENT_DESCRIPTOR,
  MdxImage,
  type MdxImageProps,
} from "./mdx-image";

const IMAGE_EDITOR_DESCRIPTOR: JsxComponentDescriptor = {
  ...IMAGE_COMPONENT_DESCRIPTOR,
  Editor: GenericJsxEditor,
};

export const ImageDefinition: MdxComponentDefinition<MdxImageProps> = {
  id: "Image",
  label: "Image",
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
