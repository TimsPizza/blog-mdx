"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Category } from "@/lib/api";
import { Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface SearchFilterProps {
  categories: Category[];
  category: string;
  search: string;
  sort: string;
  onCategoryChange: (category: string) => void;
  onReset: () => void;
  onSearch: (search: string) => void;
  onSortChange: (sort: string) => void;
}

export function SearchFilter({
  categories,
  category,
  search,
  sort,
  onCategoryChange,
  onReset,
  onSearch,
  onSortChange,
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState(search);

  useEffect(() => {
    setSearchQuery(search);
  }, [search]);

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-end">
      <div className="flex-1 space-y-2">
        <label className="text-muted-foreground text-sm font-medium">
          Search for Posts
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter keywords to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearch(searchQuery);
            }}
          />
          <Button
            aria-label="Search posts"
            onClick={() => onSearch(searchQuery)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="w-[180px] space-y-2">
          <label className="text-muted-foreground text-sm font-medium">
            Sort By
          </label>
          <select
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
          >
            <option value="date">Publish Time - Newest</option>
            <option value="date-asc">Publish Time - Oldest</option>
            <option value="views">Views - Highest</option>
            <option value="views-asc">Views - Lowest</option>
          </select>
        </div>

        <div className="w-[180px] space-y-2">
          <label className="text-muted-foreground text-sm font-medium">
            Category
          </label>
          <select
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          className="mt-auto"
          onClick={() => {
            setSearchQuery("");
            onReset();
          }}
        >
          <Filter className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
