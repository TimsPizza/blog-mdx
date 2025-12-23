import { mdxComponentRenderers } from "@/components/mdx/mdx-component-registry";
import {
  generateHeadingId,
  stripMarkdown,
} from "@/components/mdx/heading-utils";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";
import { isValidElement } from "react";

interface MdxRenderedProps {
  mdxSourceString: string;
}

const flattenText = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenText(node.props.children);
  }
  return "";
};

const createHeading = (Tag: "h2" | "h3") => {
  return function Heading({ children }: { children: ReactNode }) {
    const rawText = flattenText(children);
    const text = stripMarkdown(rawText);
    const id = generateHeadingId(text);
    return <Tag id={id}>{children}</Tag>;
  };
};

const mdxComponents = {
  ...mdxComponentRenderers,
  h2: createHeading("h2"),
  h3: createHeading("h3"),
};

export function MdxRendered({ mdxSourceString }: MdxRenderedProps) {
  return <MDXRemote source={mdxSourceString} components={mdxComponents} />;
}
