import Link from "next/link";

const ADMIN_LINKS = [
  { href: "/admin/article", label: "Articles" },
  { href: "/admin/category", label: "Categories" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/subscribers", label: "Subscribers" },
];

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Jump to admin tools.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ADMIN_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border-border bg-card text-card-foreground hover:bg-accent/5 rounded-lg border p-4 transition"
          >
            <div className="text-sm font-medium">{item.label}</div>
            <div className="text-muted-foreground mt-2 text-xs">
              {item.href}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
