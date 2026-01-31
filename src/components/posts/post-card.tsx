import { Badge } from "@/components/ui/badge";
import { getCategoryById, getFeaturedMediaById, type Post } from "@/lib/api";
import { CoverImage } from "@/components/posts/cover-image";
import { cn } from "@/lib/utils";
import Link from "next/link";

export async function PostCard({ post }: { post: Post }) {
  const media = post.featured_media
    ? await getFeaturedMediaById(post.featured_media).match(
        (value) => value,
        () => null,
      )
    : null;
  const date = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const category = post.categories?.[0]
    ? await getCategoryById(post.categories[0]).match(
        (value) => value,
        () => null,
      )
    : null;

  return (
    <Link
      href={`/posts/${post.slug}`}
      className={cn(
        "group flex flex-col justify-between gap-8 rounded-lg border",
        "bg-card text-card-foreground p-4 shadow-sm transition-all",
        "hover:bg-accent/5 hover:shadow-md",
      )}
    >
      <div className="flex flex-col gap-4">
        {media?.source_url ? (
          <CoverImage
            src={media.source_url}
            alt={post.title?.rendered || "No Image"}
            width={400}
            height={200}
            containerClassName="bg-muted relative h-48 w-full overflow-hidden rounded-md border"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-48 w-full items-center justify-center rounded-md border">
            No Image
          </div>
        )}
        <div>
          <div
            dangerouslySetInnerHTML={{
              __html: post.title?.rendered || "Untitled",
            }}
            className="text-foreground group-hover:text-primary mb-2 text-xl font-medium transition-colors"
          />
          <div
            className="text-muted-foreground text-sm"
            dangerouslySetInnerHTML={{
              __html: post.excerpt?.rendered
                ? post.excerpt.rendered
                    .split(" ")
                    .slice(0, 12)
                    .join(" ")
                    .trim() + "..."
                : "No excerpt available",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="border-border border-t" />
        <div className="text-muted-foreground/80 flex items-center justify-between text-sm">
          {category?.name && (
            <Badge variant="secondary" className="rounded-full">
              {category.name}
            </Badge>
          )}
          <p>{date}</p>
        </div>
      </div>
    </Link>
  );
}
