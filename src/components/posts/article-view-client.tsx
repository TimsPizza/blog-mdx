"use client";

import { AnimatedListItem } from "@/components/animations/animated-section";
import { Container } from "@/components/craft";
import { TableOfContents } from "@/components/posts/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { stripMarkdown } from "@/components/mdx/heading-utils";
import { type Post } from "@/lib/api";
import { Calendar, Clock } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useRef } from "react";
import { ReadingProgress } from "./reading-progress";

interface ArticleViewClientProps {
  post: Post;
  contentSource: string;
  author?: {
    name: string;
  } | null;
  category?: {
    name: string;
  } | null;
  media?: {
    source_url: string;
  } | null;
  children: ReactNode;
}

export function ArticleViewClient({
  post,
  contentSource,
  category,
  media,
  children,
}: ArticleViewClientProps) {
  const articleRef = useRef<HTMLDivElement | null>(null);

  // estimate reading time
  const readingTime = Math.ceil(stripMarkdown(contentSource).length / 300);

  const date = new Date(post.date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <ReadingProgress articleRef={articleRef} />
      <div ref={articleRef} className="relative">
        <article className="prose lg:prose-lg xl:prose-xl 2xl:prose-2xl prose-headings:text-foreground/90 prose-p:text-foreground/80 relative mx-auto">
          <Container className="mb-12 space-y-8">
            <AnimatedListItem>
              <header className="not-prose">
                <h1
                  className="text-foreground mb-4 text-4xl font-bold tracking-tight"
                  dangerouslySetInnerHTML={{
                    __html: post.title?.rendered || "Untitled",
                  }}
                />
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {category && (
                    <Badge variant="outline" className="rounded-full">
                      {category.name}
                    </Badge>
                  )}
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{date}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{` ${readingTime} minute(s)`}</span>
                  </div>
                </div>
              </header>
            </AnimatedListItem>

            {media?.source_url && (
              <AnimatedListItem>
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <Image
                    src={media.source_url}
                    alt={post.title?.rendered || "No Image"}
                    className="object-cover"
                    fill
                    priority
                  />
                </div>
              </AnimatedListItem>
            )}

            <AnimatedListItem>
              <div id="article-content" className="reading-prose">
                {children}
              </div>
            </AnimatedListItem>
          </Container>
        </article>

        <TableOfContents
          className="hidden md:!fixed"
          content={contentSource}
        />
      </div>
    </>
  );
}
