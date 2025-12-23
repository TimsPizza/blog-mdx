"use client";
import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import type { FC } from "react";

type TableCellValue = string | number;

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

const alignmentClass = (alignment: "left" | "center" | "right") => {
  switch (alignment) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
};

export const TABLE_COMPONENT_DESCRIPTOR: JsxComponentDescriptor = {
  name: "Table",
  kind: "flow",
  props: [
    {
      name: "headers",
      type: "expression",
      required: true,
    },
    {
      name: "rows",
      type: "expression",
      required: true,
    },
    {
      name: "caption",
      type: "string",
    },
    {
      name: "align",
      type: "expression",
    },
  ],
  hasChildren: false,
  source: "@/components/mdx/components/mdx-table",
  defaultExport: true,
  Editor: GenericJsxEditor,
};

export interface MdxTableProps {
  headers: TableCellValue[];
  rows: TableCellValue[][];
  caption?: string;
  align?: Array<"left" | "center" | "right">;
}

const MdxTable: FC<MdxTableProps> = (props) => {
  const result = mdxPropsValidator(TABLE_COMPONENT_DESCRIPTOR, props);
  if (!result.isValid) return result.errJsx;
  const headers = Array.isArray(props.headers) ? props.headers : [];
  const rows = Array.isArray(props.rows) ? props.rows : [];
  const align = Array.isArray(props.align) ? props.align : [];
  const { caption } = props;
  const maxRowCells = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnCount = Math.max(headers.length, maxRowCells);
  const normalizedHeaders =
    headers.length > 0
      ? headers
      : Array.from({ length: columnCount }, (_, idx) => `Column ${idx + 1}`);
  const alignments =
    align && align.length > 0
      ? align
      : Array.from({ length: columnCount }, () => "left" as const);

  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption ? (
          <caption className="text-muted-foreground mb-2 text-left text-xs tracking-wide uppercase">
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr className="border-b">
            {normalizedHeaders.map((header, idx) => (
              <th
                key={idx}
                className={`px-3 py-2 ${alignmentClass(alignments[idx])} font-semibold`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b last:border-b-0">
              {Array.from({ length: columnCount }, (_, cellIdx) => {
                const cellValue = row[cellIdx] ?? "";
                return (
                  <td
                    key={cellIdx}
                    className={`px-3 py-2 ${alignmentClass(alignments[cellIdx])}`}
                  >
                    {cellValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const TableDefinition: MdxComponentDefinition<MdxTableProps> = {
  id: "Table",
  label: "表格",
  category: "data",
  descriptor: TABLE_COMPONENT_DESCRIPTOR,
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

export default MdxTable;
