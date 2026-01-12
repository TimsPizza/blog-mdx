"use client";

import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import {
  AUDIO_PLAYER_COMPONENT_DESCRIPTOR,
  AudioPlayer,
  type AudioPlayerProps,
} from "./audio-player";

const AUDIO_PLAYER_EDITOR_DESCRIPTOR: JsxComponentDescriptor = {
  ...AUDIO_PLAYER_COMPONENT_DESCRIPTOR,
  Editor: GenericJsxEditor,
};

const coerceBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
};

export const AudioPlayerDefinition: MdxComponentDefinition<AudioPlayerProps> = {
  id: "AudioPlayer",
  label: "audio player",
  category: "media",
  descriptor: AUDIO_PLAYER_EDITOR_DESCRIPTOR,
  Renderer: AudioPlayer,
  defaultProps: {
    controls: true,
  },
  normalizeProps: (input: Record<string, unknown>) => {
    const src = typeof input.src === "string" ? input.src : "";
    const title = typeof input.title === "string" ? input.title : "";
    return {
      src,
      title,
      autoPlay: coerceBoolean(input.autoPlay, false),
      loop: coerceBoolean(input.loop, false),
      controls: coerceBoolean(input.controls, true),
    };
  },
};
