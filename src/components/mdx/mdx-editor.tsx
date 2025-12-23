import { MDXEditor, jsxPlugin } from "@mdxeditor/editor";
import { AVAILABLE_MDX_COMPONENTS } from "./mdx-component-registry";

interface MdxEditorWithRegistryProps {
  markdown: string;
  onChange: (value: string) => void;
  contentEditableClassName?: string;
  placeholder?: string;
}

// Thin wrapper to wire the registry into MDXEditor instantiation.
export function MdxEditorWithRegistry({
  markdown,
  onChange,
  contentEditableClassName,
  placeholder,
}: MdxEditorWithRegistryProps) {
  return (
    <MDXEditor
      markdown={markdown}
      onChange={onChange}
      contentEditableClassName={contentEditableClassName}
      placeholder={placeholder}
      plugins={[
        jsxPlugin({
          jsxComponentDescriptors: AVAILABLE_MDX_COMPONENTS,
        }),
      ]}
    />
  );
}
