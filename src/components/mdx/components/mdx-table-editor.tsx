"use client";

import { Input } from "@/components/ui/input";
import { type JsxEditorProps, useMdastNodeUpdater } from "@mdxeditor/editor";
import { useMemo } from "react";

type MdxJsxAttribute = {
  type: "mdxJsxAttribute";
  name: string;
  value?:
    | string
    | { type: "mdxJsxAttributeValueExpression"; value: string }
    | null;
};

const isMdxJsxAttribute = (value: unknown): value is MdxJsxAttribute =>
  Boolean(value) &&
  typeof value === "object" &&
  (value as { type?: string }).type === "mdxJsxAttribute";

const getAttributeValue = (
  attributes: unknown[],
  name: string,
): string | undefined => {
  const attr = attributes.find(
    (item) => isMdxJsxAttribute(item) && item.name === name,
  ) as MdxJsxAttribute | undefined;
  if (!attr) return undefined;
  if (typeof attr.value === "string") return attr.value;
  if (
    attr.value &&
    typeof attr.value === "object" &&
    attr.value.type === "mdxJsxAttributeValueExpression"
  ) {
    return attr.value.value;
  }
  return undefined;
};

const parseStringArray = (value: string | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // fall through to best-effort parsing
  }
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter((item) => item.length > 0);
};

const parseRows = (value: string | undefined): string[][] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((row) =>
        Array.isArray(row) ? row.map((cell) => String(cell)) : [],
      );
    }
  } catch {
    // fall through to best-effort parsing
  }
  return [];
};

const parseAlign = (
  value: string | undefined,
): Array<"left" | "center" | "right"> => {
  const arr = parseStringArray(value);
  return arr.map((item) =>
    item === "center" || item === "right" ? item : "left",
  );
};

const toExpressionValue = (value: unknown) =>
  JSON.stringify(value ?? []).replace(/\u2028|\u2029/g, "");

export function MdxTableJsxEditor({ mdastNode }: JsxEditorProps) {
  const updateMdastNode = useMdastNodeUpdater();
  const attributes = useMemo(() => {
    return Array.isArray(mdastNode.attributes) ? mdastNode.attributes : [];
  }, [mdastNode.attributes]);

  const headers = useMemo(
    () => parseStringArray(getAttributeValue(attributes, "headers")),
    [attributes],
  );
  const rows = useMemo(
    () => parseRows(getAttributeValue(attributes, "rows")),
    [attributes],
  );
  const align = useMemo(
    () => parseAlign(getAttributeValue(attributes, "align")),
    [attributes],
  );
  const caption = useMemo(
    () => getAttributeValue(attributes, "caption") ?? "",
    [attributes],
  );
  const hasAlign = useMemo(
    () =>
      attributes.some(
        (attr) => isMdxJsxAttribute(attr) && attr.name === "align",
      ),
    [attributes],
  );
  const hasCaption = useMemo(
    () =>
      attributes.some(
        (attr) => isMdxJsxAttribute(attr) && attr.name === "caption",
      ),
    [attributes],
  );

  const maxRowCells = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const columnCount = Math.max(headers.length, maxRowCells, 1);

  const normalizedHeaders = useMemo(
    () =>
      Array.from({ length: columnCount }, (_, idx) => headers[idx] ?? ""),
    [columnCount, headers],
  );
  const normalizedRows = useMemo(
    () =>
      rows.map((row) =>
        Array.from({ length: columnCount }, (_, idx) => row[idx] ?? ""),
      ),
    [columnCount, rows],
  );
  const normalizedAlign = useMemo(
    () =>
      align.length > 0
        ? Array.from(
            { length: columnCount },
            (_, idx) => align[idx] ?? "left",
          )
        : [],
    [align, columnCount],
  );

  const commit = (
    nextHeaders: string[],
    nextRows: string[][],
    nextAlign: Array<"left" | "center" | "right">,
  ) => {
    const updatedAttributes: MdxJsxAttribute[] = [
      {
        type: "mdxJsxAttribute",
        name: "headers",
        value: {
          type: "mdxJsxAttributeValueExpression",
          value: toExpressionValue(nextHeaders),
        },
      },
      {
        type: "mdxJsxAttribute",
        name: "rows",
        value: {
          type: "mdxJsxAttributeValueExpression",
          value: toExpressionValue(nextRows),
        },
      },
    ];

    if (hasCaption || caption.trim()) {
      updatedAttributes.push({
        type: "mdxJsxAttribute",
        name: "caption",
        value: caption,
      });
    }

    if (hasAlign && nextAlign.length > 0) {
      updatedAttributes.push({
        type: "mdxJsxAttribute",
        name: "align",
        value: {
          type: "mdxJsxAttributeValueExpression",
          value: toExpressionValue(nextAlign),
        },
      });
    }

    updateMdastNode({ attributes: updatedAttributes });
  };

  const updateHeader = (index: number, value: string) => {
    const nextHeaders = [...normalizedHeaders];
    nextHeaders[index] = value;
    commit(nextHeaders, normalizedRows, normalizedAlign);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = normalizedRows.map((row) => [...row]);
    if (!nextRows[rowIndex]) {
      nextRows[rowIndex] = Array.from(
        { length: columnCount },
        () => "",
      );
    }
    nextRows[rowIndex][colIndex] = value;
    commit(normalizedHeaders, nextRows, normalizedAlign);
  };

  const addRowTop = () => {
    const nextRows = [
      Array.from({ length: columnCount }, () => ""),
      ...normalizedRows,
    ];
    commit(normalizedHeaders, nextRows, normalizedAlign);
  };

  const addRowBottom = () => {
    const nextRows = [
      ...normalizedRows,
      Array.from({ length: columnCount }, () => ""),
    ];
    commit(normalizedHeaders, nextRows, normalizedAlign);
  };

  const addColumnLeft = () => {
    const nextHeaders = ["", ...normalizedHeaders];
    const nextRows = normalizedRows.map((row) => ["", ...row]);
    const nextAlign =
      normalizedAlign.length > 0 ? ["left", ...normalizedAlign] : [];
    commit(nextHeaders, nextRows, nextAlign);
  };

  const addColumnRight = () => {
    const nextHeaders = [...normalizedHeaders, ""];
    const nextRows = normalizedRows.map((row) => [...row, ""]);
    const nextAlign =
      normalizedAlign.length > 0 ? [...normalizedAlign, "left"] : [];
    commit(nextHeaders, nextRows, nextAlign);
  };

  return (
    <div className="relative w-full rounded-md border border-dashed p-3">
      <button
        type="button"
        onClick={addRowTop}
        className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border bg-background px-2 py-0.5 text-xs"
        aria-label="在顶部新增行"
      >
        +
      </button>
      <button
        type="button"
        onClick={addRowBottom}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border bg-background px-2 py-0.5 text-xs"
        aria-label="在底部新增行"
      >
        +
      </button>
      <button
        type="button"
        onClick={addColumnLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border bg-background px-2 py-0.5 text-xs"
        aria-label="在左侧新增列"
      >
        +
      </button>
      <button
        type="button"
        onClick={addColumnRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full border bg-background px-2 py-0.5 text-xs"
        aria-label="在右侧新增列"
      >
        +
      </button>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {normalizedHeaders.map((header, colIdx) => (
          <Input
            key={`header-${colIdx}`}
            value={header}
            onChange={(event) => updateHeader(colIdx, event.target.value)}
            placeholder={`Column ${colIdx + 1}`}
            className="bg-muted/40 text-sm font-medium"
          />
        ))}

        {normalizedRows.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <Input
              key={`cell-${rowIdx}-${colIdx}`}
              value={cell}
              onChange={(event) =>
                updateCell(rowIdx, colIdx, event.target.value)
              }
              placeholder={`R${rowIdx + 1}C${colIdx + 1}`}
              className="text-sm"
            />
          )),
        )}
      </div>
    </div>
  );
}

export default MdxTableJsxEditor;
