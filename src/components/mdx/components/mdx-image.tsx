"use client";
import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import type { FC } from "react";

export const IMAGE_COMPONENT_DESCRIPTOR: JsxComponentDescriptor = {
  name: "Image",
  kind: "flow",
  props: [
    {
      name: "src",
      type: "string",
      required: true,
    },
    {
      name: "alt",
      type: "string",
    },
    {
      name: "caption",
      type: "string",
    },
    {
      name: "width",
      type: "number",
    },
    {
      name: "height",
      type: "number",
    },
  ],
  hasChildren: false,
  source: "@/components/mdx/components/mdx-image",
  defaultExport: true,
  Editor: GenericJsxEditor,
};

export interface MdxImageProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

const MdxImage: FC<MdxImageProps> = (props) => {
  const result = mdxPropsValidator(IMAGE_COMPONENT_DESCRIPTOR, props);
  if (!result.isValid) return result.errJsx;
  const { src, alt, caption, width, height } = props;
  const sizeProps =
    typeof width === "number" && typeof height === "number"
      ? { width, height }
      : undefined;

  return (
    <figure className="my-4 flex flex-col gap-2">
      <img
        src={src}
        alt={alt ?? ""}
        className="h-auto w-full rounded-lg object-cover"
        loading="lazy"
        {...sizeProps}
      />
      {caption ? (
        <figcaption className="text-muted-foreground text-center text-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

export const ImageDefinition: MdxComponentDefinition<MdxImageProps> = {
  id: "Image",
  label: "图片",
  category: "media",
  descriptor: IMAGE_COMPONENT_DESCRIPTOR,
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

export default MdxImage;
