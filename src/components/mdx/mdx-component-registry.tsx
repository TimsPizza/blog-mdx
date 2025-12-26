"use client";

import { AudioPlayerDefinition } from "@/components/mdx/components/audio-player-definition";
import { ImageGridDefinition } from "@/components/mdx/components/image-grid-definition";
import { ImageDefinition } from "@/components/mdx/components/mdx-image-definition";
import { TableDefinition } from "@/components/mdx/components/mdx-table-definition";
import { VideoPlayerDefinition } from "@/components/mdx/components/video-player-definition";
import type { JsxComponentDescriptor } from "@mdxeditor/editor";

/**
 * Registry of all custom MDX components for the editor.
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
