"use client";
import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import type { FC } from "react";

type TableCellValue = string | number;

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

export const TABLE_COMPONENT_DESCRIPTOR: Omit<
  JsxComponentDescriptor,
  "Editor"
> = {
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
};

export interface MdxTableProps {
  headers: TableCellValue[];
  rows: TableCellValue[][];
  caption?: string;
  align?: Array<"left" | "center" | "right">;
}

export const MdxTable: FC<MdxTableProps> = (props) => {
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

export default MdxTable;
