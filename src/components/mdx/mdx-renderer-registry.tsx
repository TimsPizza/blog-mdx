import { AudioPlayer } from "@/components/mdx/components/audio-player";
import { ImageGridLayout } from "@/components/mdx/components/image-grid";
import { MdxImage } from "@/components/mdx/components/mdx-image";
import { MdxTable } from "@/components/mdx/components/mdx-table";
import { VideoPlayer } from "@/components/mdx/components/video-player";

export const mdxComponentRenderers = {
  Image: MdxImage,
  ImageGrid: ImageGridLayout,
  AudioPlayer: AudioPlayer,
  VideoPlayer: VideoPlayer,
  Table: MdxTable,
} as const;
