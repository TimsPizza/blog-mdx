"use client";

import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { MdxComponentDefinition } from "@/components/mdx/types";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import { GenericJsxEditor } from "@mdxeditor/editor";
import type { FC } from "react";

const coerceBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
};

export const AUDIO_PLAYER_COMPONENT_DESCRIPTOR: JsxComponentDescriptor = {
  name: "AudioPlayer",
  kind: "flow",
  props: [
    {
      name: "src",
      type: "string",
      required: true,
    },
    {
      name: "title",
      type: "string",
    },
    {
      name: "autoPlay",
      type: "expression",
    },
    {
      name: "loop",
      type: "expression",
    },
    {
      name: "controls",
      type: "expression",
    },
  ],
  hasChildren: false,
  source: "@/components/mdx/components/audio-player",
  defaultExport: true,
  Editor: GenericJsxEditor,
};

export interface AudioPlayerProps {
  src: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
}

const AudioPlayer: FC<AudioPlayerProps> = (props) => {
  const result = mdxPropsValidator(AUDIO_PLAYER_COMPONENT_DESCRIPTOR, props);
  if (!result.isValid) return result.errJsx;
  const { src, title, autoPlay, loop, controls } = props;

  return (
    <div className="my-4 flex flex-col gap-2">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <audio
        src={src}
        className="w-full"
        controls={controls ?? true}
        autoPlay={autoPlay ?? false}
        loop={loop ?? false}
      />
    </div>
  );
};

export const AudioPlayerDefinition: MdxComponentDefinition<AudioPlayerProps> = {
  id: "AudioPlayer",
  label: "音频播放器",
  category: "media",
  descriptor: AUDIO_PLAYER_COMPONENT_DESCRIPTOR,
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

export default AudioPlayer;
