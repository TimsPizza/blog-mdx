"use client";
import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import Image from "next/image";
import type { FC } from "react";

export const IMAGE_GRID_COMPONENT_DESCRIPTOR: Omit<
  JsxComponentDescriptor,
  "Editor"
> = {
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
};

export interface ImageGridProps {
  img_urls: string[];
  columns: number;
}

export const ImageGridLayout: FC<ImageGridProps> = (props) => {
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
          width={100}
          height={100}
          className="h-full w-full rounded-lg object-cover"
          loading="lazy"
        />
      ))}
    </div>
  );
};

export default ImageGridLayout;
