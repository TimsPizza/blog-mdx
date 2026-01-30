import { Container, Section } from "@/components/craft";
import { getAllCategories } from "@/lib/api";
import Link from "next/link";

export default async function CategoryIndexPage() {
  const categories = await getAllCategories().match(
    (items) => items,
    () => [],
  );

  return (
    <Section>
      <Container className="space-y-8">
        <div>
          <h1 className="text-foreground/90 mb-4 text-3xl font-medium tracking-tight sm:text-4xl">
            Categories
          </h1>
          <p className="text-muted-foreground text-sm">
            Browse articles by category
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.path}`}
              className="bg-card text-card-foreground hover:border-foreground/30 flex items-center justify-between rounded-lg border px-4 py-3 transition"
            >
              <span className="text-sm font-medium">{category.name}</span>
              <span className="text-muted-foreground text-xs">
                {category.count} {`post(s)`}
              </span>
            </Link>
          ))}
          {categories.length === 0 && (
            <div className="text-muted-foreground text-sm">
              No categories available
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
