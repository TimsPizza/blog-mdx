import { stripMarkdown } from "@/components/mdx/heading-utils";
import { CoverImage } from "@/components/posts/cover-image";
import { Badge } from "@/components/ui/badge";
import { type Category, type Post } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";
import Link from "next/link";

interface FeaturedPostCardProps {
  post: Post;
  coverUrl?: string | null;
  category?: Category | null;
  className?: string;
  layout?: "horizontal" | "vertical";
}

export function FeaturedPostCard({
  post,
  coverUrl,
  category,
  className,
  layout = "vertical",
}: FeaturedPostCardProps) {
  const date = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // estimate reading time
  const readingTime = Math.ceil(stripMarkdown(post.content.mdx).length / 300);
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={cn(
        "card-hover group bg-card block overflow-hidden rounded-lg border",
        layout === "horizontal" ? "md:grid md:grid-cols-2" : "space-y-4",
        "paper-shadow",
        className,
      )}
    >
      {coverUrl ? (
        <CoverImage
          src={coverUrl}
          alt={post.title?.rendered || "No Image"}
          fill
          priority
          containerClassName={cn(
            "relative aspect-video overflow-hidden",
            layout === "horizontal" && "md:aspect-auto md:h-full",
          )}
        />
      ) : (
        <div
          className={cn(
            "bg-muted flex aspect-video items-center justify-center",
            layout === "horizontal" && "md:aspect-auto md:h-full",
          )}
        >
          No Image
        </div>
      )}
      <div className="border-accent/10 space-y-4 border-t p-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {category && (
            <Badge variant="outline" className="rounded-full">
              {category.name}
            </Badge>
          )}
        </div>
        <div>
          <h3
            className="group-hover:text-primary mb-2 text-2xl font-medium transition-colors"
            dangerouslySetInnerHTML={{
              __html: post.title?.rendered || "Untitled",
            }}
          />
          <p
            className="text-muted-foreground line-clamp-2"
            dangerouslySetInnerHTML={{
              __html:
                post.excerpt?.rendered.replace(/<[^>]*>/g, "") || "No Excerpt",
            }}
          />
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{` ${readingTime} minute(s)`}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
