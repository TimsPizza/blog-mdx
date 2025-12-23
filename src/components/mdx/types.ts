import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import type { ComponentType } from "react";

export type MdxComponentId =
  | "CodeBlock"
  | "ExternalLink"
  | "Image"
  | "ImageGrid"
  | "VideoPlayer"
  | "AudioPlayer"
  | "BlockQuote"
  | "Heading"
  | "Table";

export type MdxComponentCategory = "media" | "data" | "layout" | "text";

/**
 * Definition for a custom MDX component that can plug into both MDXEditor (via JsxComponentDescriptor)
 * and the site renderer. Keep this lean and serializable-friendly.
 */
export interface MdxComponentDefinition<Props = Record<string, unknown>> {
  id: MdxComponentId;
  label: string;
  category: MdxComponentCategory;
  descriptor: JsxComponentDescriptor;
  Renderer: ComponentType<Props>;
  PreviewComponent?: ComponentType<Props>;
  defaultProps?: Partial<Props>;
  normalizeProps?: (input: Record<string, unknown>) => Props;
}

export type MdxComponentRegistry = Partial<
  Record<MdxComponentId, MdxComponentDefinition>
>;
