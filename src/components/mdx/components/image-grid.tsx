"use client";
import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import Image from "next/image";
import type { FC } from "react";
export const IMAGE_GRID_COMPONENT_DESCRIPTOR: JsxComponentDescriptor = {
  name: "ImageGrid",
  kind: "flow",
  props: [
    {
      name: "img_urls",
      type: "expression", // an array of strings
      required: true,
    },
    {
      name: "columns",
      type: "number",
      required: true,
    },
  ],
  hasChildren: false,
  source: "@/components/mdx/components/image-grid",
  defaultExport: true,
  Editor: GenericJsxEditor,
};

export interface ImageGridProps {
  img_urls: string[];
  columns: number;
}

const ImageGridLayout: FC<ImageGridProps> = (props) => {
  const result = mdxPropsValidator(IMAGE_GRID_COMPONENT_DESCRIPTOR, props);
  if (!result.isValid) return result.errJsx;
  const imgUrls = Array.isArray(props.img_urls) ? props.img_urls : [];
  const columnValue = Number(props.columns);
  const colCount = Math.max(
    1,
    Math.min(Number.isFinite(columnValue) ? columnValue : 3, 6),
  );

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
    >
      {imgUrls.map((url, idx) => (
        <Image
          key={idx}
          src={url}
          alt=""
          className="h-full w-full rounded-lg object-cover"
          loading="lazy"
        />
      ))}
    </div>
  );
};

export const ImageGridDefinition: MdxComponentDefinition<ImageGridProps> = {
  id: "ImageGrid",
  label: "图片网格",
  category: "media",
  descriptor: IMAGE_GRID_COMPONENT_DESCRIPTOR,
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

export default ImageGridLayout;
