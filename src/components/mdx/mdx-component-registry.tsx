import { AudioPlayerDefinition } from "@/components/mdx/components/audio-player";
import { ImageGridDefinition } from "@/components/mdx/components/image-grid";
import { ImageDefinition } from "@/components/mdx/components/mdx-image";
import { TableDefinition } from "@/components/mdx/components/mdx-table";
import { VideoPlayerDefinition } from "@/components/mdx/components/video-player";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";

/**
 * Registry of all custom MDX components for both editor and renderer.
 * Add new components here and export helpers for MDXEditor integration.
 */
export const MDX_COMPONENT_REGISTRY = {
  Image: ImageDefinition,
  ImageGrid: ImageGridDefinition,
  AudioPlayer: AudioPlayerDefinition,
  VideoPlayer: VideoPlayerDefinition,
  Table: TableDefinition,
} as const;

export type MdxComponentRegistry = typeof MDX_COMPONENT_REGISTRY;
type RegistryEntry = MdxComponentRegistry[keyof MdxComponentRegistry];

const registryEntries: RegistryEntry[] = Object.values(MDX_COMPONENT_REGISTRY);

export const AVAILABLE_MDX_COMPONENTS: JsxComponentDescriptor[] =
  registryEntries.map((entry) => entry.descriptor);

export const mdxComponentRenderers = Object.fromEntries(
  registryEntries.map((entry) => [entry.id, entry.Renderer]),
) as Record<string, RegistryEntry["Renderer"]>;
