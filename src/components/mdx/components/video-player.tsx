"use client";

import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import type { FC } from "react";

export const VIDEO_PLAYER_COMPONENT_DESCRIPTOR: Omit<
  JsxComponentDescriptor,
  "Editor"
> = {
  name: "VideoPlayer",
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
      name: "poster",
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
    {
      name: "muted",
      type: "expression",
    },
  ],
  hasChildren: false,
  source: "@/components/mdx/components/video-player",
  defaultExport: true,
};

export interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  muted?: boolean;
}

export const VideoPlayer: FC<VideoPlayerProps> = (props) => {
  const result = mdxPropsValidator(VIDEO_PLAYER_COMPONENT_DESCRIPTOR, props);
  if (!result.isValid) return result.errJsx;
  const { src, title, poster, autoPlay, loop, controls, muted } = props;

  return (
    <div className="my-4 flex flex-col gap-2">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <video
        src={src}
        poster={poster}
        className="w-full rounded-lg"
        controls={controls ?? true}
        autoPlay={autoPlay ?? false}
        loop={loop ?? false}
        muted={muted ?? false}
        playsInline
      />
    </div>
  );
};

export default VideoPlayer;
