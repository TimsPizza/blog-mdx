"use client";
import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import Image from "next/image";
import type { FC } from "react";

export const IMAGE_COMPONENT_DESCRIPTOR: Omit<
  JsxComponentDescriptor,
  "Editor"
> = {
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
};

export interface MdxImageProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export const MdxImage: FC<MdxImageProps> = (props) => {
  const result = mdxPropsValidator(IMAGE_COMPONENT_DESCRIPTOR, props);
  if (!result.isValid) return result.errJsx;
  const { src, alt, caption, width, height } = props;
  const sizeProps =
    typeof width === "number" && typeof height === "number"
      ? { width, height }
      : undefined;

  return (
    <figure className="my-4 flex flex-col gap-2">
      <Image
        src={src}
        alt={alt ?? ""}
        width={400}
        height={300}
        className="rounded-lg object-contain"
        loading="lazy"
        // {...sizeProps}
      />
      {caption ? (
        <figcaption className="text-muted-foreground text-center text-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

export default MdxImage;
