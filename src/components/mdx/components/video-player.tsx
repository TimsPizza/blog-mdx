import { mdxPropsValidator } from "@/components/mdx/prop-validate";
import { GenericJsxEditor } from "@mdxeditor/editor";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";
import type { FC } from "react";
import type { MdxComponentDefinition } from "@/components/mdx/types";

const coerceBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
};

export const VIDEO_PLAYER_COMPONENT_DESCRIPTOR: JsxComponentDescriptor = {
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
  Editor: GenericJsxEditor,
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

const VideoPlayer: FC<VideoPlayerProps> = (props) => {
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

export const VideoPlayerDefinition: MdxComponentDefinition<VideoPlayerProps> = {
  id: "VideoPlayer",
  label: "视频播放器",
  category: "media",
  descriptor: VIDEO_PLAYER_COMPONENT_DESCRIPTOR,
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

export default VideoPlayer;
