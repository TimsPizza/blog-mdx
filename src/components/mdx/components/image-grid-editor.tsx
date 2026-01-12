"use client";

import { Textarea } from "@/components/ui/textarea";
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

const parseImageUrls = (value: string | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item : String(item)))
        .map((item) => item.trim())
        .map((item) => (item === "placeholder" ? "" : item));
    }
  } catch {
    // fall through to best-effort parsing
  }
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  if (!trimmed) return [];
  return trimmed
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .map((item) => (item === "placeholder" ? "" : item));
};

const parseColumns = (value: string | undefined): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 3;
  return Math.max(1, Math.min(num, 6));
};

const toExpressionValue = (value: unknown) =>
  JSON.stringify(value ?? []).replace(/\u2028|\u2029/g, "");

export function ImageGridJsxEditor({ mdastNode }: JsxEditorProps) {
  const updateMdastNode = useMdastNodeUpdater();
  const attributes = useMemo(() => {
    return Array.isArray(mdastNode.attributes) ? mdastNode.attributes : [];
  }, [mdastNode.attributes]);

  const imgUrls = useMemo(
    () => parseImageUrls(getAttributeValue(attributes, "img_urls")),
    [attributes],
  );
  const columns = useMemo(
    () => parseColumns(getAttributeValue(attributes, "columns")),
    [attributes],
  );

  const commit = (nextUrls: string[], nextColumns: number) => {
    const updatedAttributes: MdxJsxAttribute[] = [
      {
        type: "mdxJsxAttribute",
        name: "img_urls",
        value: {
          type: "mdxJsxAttributeValueExpression",
          value: toExpressionValue(nextUrls),
        },
      },
      {
        type: "mdxJsxAttribute",
        name: "columns",
        value: String(nextColumns),
      },
    ];
    updateMdastNode({ attributes: updatedAttributes });
  };

  const handleUrlChange = (index: number, value: string) => {
    const next = [...imgUrls];
    next[index] = value;
    commit(next, columns);
  };

  const handleRemove = (index: number) => {
    const next = [...imgUrls];
    next.splice(index, 1);
    commit(next, columns);
  };

  const handleAdd = () => {
    commit([...imgUrls, ""], columns);
  };

  const handleColumnChange = (value: number) => {
    commit(imgUrls, value);
  };

  const handleReorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...imgUrls];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved ?? "");
    commit(next, columns);
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border border-dashed p-3">
      <div className="text-foreground flex items-center gap-3 px-1">
        <span className="text-foreground/80 text-sm font-medium">Columns:</span>
        <input
          type="number"
          min={1}
          max={6}
          value={columns}
          onChange={(event) => {
            handleColumnChange(Number(event.target.value));
          }}
          className="bg-background w-8 rounded-md border text-center"
        />

        <button
          type="button"
          onClick={handleAdd}
          className="text-foreground/80 ml-auto rounded-md border px-2 py-1 text-xs"
        >
          添加图片
        </button>
      </div>

      {imgUrls.length === 0 && (
        <div className="text-foreground/60 text-xs">还没有图片，请添加。</div>
      )}

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {imgUrls.map((url, index) => (
          <div
            key={`${index}-${url}`}
            className="bg-background flex flex-col gap-2 rounded-md border p-2"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const fromIndex = Number(
                event.dataTransfer.getData("text/plain"),
              );
              if (!Number.isFinite(fromIndex)) return;
              handleReorder(fromIndex, index);
            }}
          >
            <div className="space-y-1">
              <span className="text-foreground/70 text-xs">URL</span>
              <Textarea
                value={url}
                onChange={(event) => {
                  handleUrlChange(index, event.target.value);
                }}
                rows={1}
                placeholder="https://..."
                className="min-h-8"
              />
            </div>

            <div className="bg-muted/30 relative overflow-hidden rounded-md border border-dashed">
              {url ? (
                <img
                  src={url}
                  alt=""
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="text-foreground/50 flex h-28 items-center justify-center text-xs">
                  预览区
                </div>
              )}
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", String(index));
                  event.dataTransfer.effectAllowed = "move";
                }}
                className="bg-background/80 text-foreground/70 absolute top-2 right-2 cursor-grab rounded-md border px-2 py-1 text-xs active:cursor-grabbing"
                aria-label={`拖动调整第 ${index + 1} 张图片`}
              >
                ⠿
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-foreground/70 self-end rounded-md border px-2 py-1 text-xs"
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageGridJsxEditor;
