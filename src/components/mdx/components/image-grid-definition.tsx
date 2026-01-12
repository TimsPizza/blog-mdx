"use client";

import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import {
  ImageGridLayout,
  type ImageGridProps,
  IMAGE_GRID_COMPONENT_DESCRIPTOR,
} from "./image-grid";
import { ImageGridJsxEditor } from "./image-grid-editor";

const IMAGE_GRID_EDITOR_DESCRIPTOR: JsxComponentDescriptor = {
  ...IMAGE_GRID_COMPONENT_DESCRIPTOR,
  Editor: ImageGridJsxEditor,
};

export const ImageGridDefinition: MdxComponentDefinition<ImageGridProps> = {
  id: "ImageGrid",
  label: "图片网格",
  category: "media",
  descriptor: IMAGE_GRID_EDITOR_DESCRIPTOR,
  Renderer: ImageGridLayout,
  defaultProps: {
    columns: 3,
    img_urls: [],
  },
  normalizeProps: (input: Record<string, unknown>) => {
    const img_urls = Array.isArray(input.img_urls)
      ? (input.img_urls as string[])
      : [];
    const columns = Number(input.columns) || 3;
    return { img_urls, columns };
  },
};
