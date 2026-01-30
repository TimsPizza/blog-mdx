"use client";

import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import {
  MdxTable,
  type MdxTableProps,
  TABLE_COMPONENT_DESCRIPTOR,
} from "./mdx-table";

const TABLE_EDITOR_DESCRIPTOR: JsxComponentDescriptor = {
  ...TABLE_COMPONENT_DESCRIPTOR,
  Editor: GenericJsxEditor,
};

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item)) : [];

const normalizeRows = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell)) : [],
  );
};

const normalizeAlign = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (item === "center" || item === "right") return item;
    return "left";
  });
};

export const TableDefinition: MdxComponentDefinition<MdxTableProps> = {
  id: "Table",
  label: "table",
  category: "data",
  descriptor: TABLE_EDITOR_DESCRIPTOR,
  Renderer: MdxTable,
  defaultProps: {
    headers: ["Column 1", "Column 2"],
    rows: [
      ["Row 1", "Value 1"],
      ["Row 2", "Value 2"],
    ],
  },
  normalizeProps: (input: Record<string, unknown>) => {
    const headers = normalizeStringArray(input.headers);
    const rows = normalizeRows(input.rows);
    const caption = typeof input.caption === "string" ? input.caption : "";
    const align = normalizeAlign(input.align);
    return { headers, rows, caption, align };
  },
};
