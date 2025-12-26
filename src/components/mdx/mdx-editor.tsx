"use client";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  insertJsx$,
  jsxPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type ExpressionValue,
  type JsxComponentDescriptor,
  type JsxProperties,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { usePublisher } from "@mdxeditor/gurx";
import { useMemo, useState } from "react";
import {
  AVAILABLE_MDX_COMPONENTS,
  MDX_COMPONENT_REGISTRY,
} from "./mdx-component-registry";

type InsertableComponent = {
  name: string;
  label: string;
  kind: "flow" | "text";
  descriptor: JsxComponentDescriptor;
  defaultProps?: Record<string, unknown>;
};

const INSERTABLE_COMPONENTS = Object.values(MDX_COMPONENT_REGISTRY).flatMap(
  (definition): InsertableComponent[] => {
    const name = definition.descriptor.name ?? definition.id;
    if (!name) return [];
    return [
      {
        name,
        label: definition.label,
        kind: definition.descriptor.kind,
        descriptor: definition.descriptor,
        defaultProps: definition.defaultProps,
      },
    ];
  },
);

const buildJsxProps = (entry: InsertableComponent): JsxProperties => {
  const defaults = entry.defaultProps;
  if (!defaults) return {};
  const props: JsxProperties = {};
  for (const prop of entry.descriptor.props) {
    if (!(prop.name in defaults)) continue;
    const raw = defaults[prop.name];
    if (raw === undefined) continue;
    if (prop.type === "string") {
      props[prop.name] = String(raw);
      continue;
    }
    const serialized = JSON.stringify(raw);
    if (serialized === undefined) continue;
    props[prop.name] = {
      type: "expression",
      value: serialized,
    } satisfies ExpressionValue;
  }
  return props;
};

const InsertMdxComponent = () => {
  const insertJsx = usePublisher(insertJsx$);
  const [selectedName, setSelectedName] = useState(
    () => INSERTABLE_COMPONENTS[0]?.name ?? "",
  );
  const selectedComponent = useMemo(
    () => INSERTABLE_COMPONENTS.find((entry) => entry.name === selectedName),
    [selectedName],
  );

  if (INSERTABLE_COMPONENTS.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <select
        className="border-border bg-background h-7 rounded-md border px-2 text-xs"
        value={selectedName}
        onChange={(event) => setSelectedName(event.target.value)}
      >
        {INSERTABLE_COMPONENTS.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="border-border text-foreground h-7 rounded-md border px-2 text-xs"
        onClick={() => {
          if (!selectedComponent) return;
          insertJsx({
            kind: selectedComponent.kind,
            name: selectedComponent.name,
            props: buildJsxProps(selectedComponent),
          });
        }}
      >
        插入
      </button>
    </div>
  );
};

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
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertCodeBlock />
              <InsertTable />
              <InsertThematicBreak />
              <Separator />
              <InsertMdxComponent />
            </>
          ),
        }),
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        thematicBreakPlugin(),
        codeBlockPlugin(),
        codeMirrorPlugin({
          codeBlockLanguages: {
            js: "JavaScript",
            ts: "TypeScript",
            jsx: "JSX",
            tsx: "TSX",
            json: "JSON",
            css: "CSS",
            html: "HTML",
            md: "Markdown",
            bash: "Bash",
            shell: "Shell",
            rust: "Rust",
            python: "Python",
          },
        }),
        markdownShortcutPlugin(),
        jsxPlugin({
          jsxComponentDescriptors: AVAILABLE_MDX_COMPONENTS,
        }),
      ]}
    />
  );
}
