"use client";

import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import type { FC } from "react";

export const AUDIO_PLAYER_COMPONENT_DESCRIPTOR: Omit<
  JsxComponentDescriptor,
  "Editor"
> = {
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
};

export interface AudioPlayerProps {
  src: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export const AudioPlayer: FC<AudioPlayerProps> = (props) => {
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

export default AudioPlayer;
