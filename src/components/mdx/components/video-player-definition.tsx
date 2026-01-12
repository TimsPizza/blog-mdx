"use client";

import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import {
  VIDEO_PLAYER_COMPONENT_DESCRIPTOR,
  VideoPlayer,
  type VideoPlayerProps,
} from "./video-player";

const VIDEO_PLAYER_EDITOR_DESCRIPTOR: JsxComponentDescriptor = {
  ...VIDEO_PLAYER_COMPONENT_DESCRIPTOR,
  Editor: GenericJsxEditor,
};

const coerceBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
};

export const VideoPlayerDefinition: MdxComponentDefinition<VideoPlayerProps> = {
  id: "VideoPlayer",
  label: "video player",
  category: "media",
  descriptor: VIDEO_PLAYER_EDITOR_DESCRIPTOR,
  Renderer: VideoPlayer,
  defaultProps: {
    controls: true,
  },
  normalizeProps: (input: Record<string, unknown>) => {
    const src = typeof input.src === "string" ? input.src : "";
    const title = typeof input.title === "string" ? input.title : "";
    const poster = typeof input.poster === "string" ? input.poster : "";
    return {
      src,
      title,
      poster,
      autoPlay: coerceBoolean(input.autoPlay, false),
      loop: coerceBoolean(input.loop, false),
      controls: coerceBoolean(input.controls, true),
      muted: coerceBoolean(input.muted, false),
    };
  },
};
