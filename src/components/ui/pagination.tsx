"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  getPageHref: (page: number) => string;
  onPageChange: (page: number) => void;
}

export function Pagination({
  totalPages,
  currentPage,
  getPageHref,
  onPageChange,
}: PaginationProps) {
  const handlePageClick = (
    event: MouseEvent<HTMLAnchorElement>,
    page: number,
  ) => {
    event.preventDefault();
    onPageChange(page);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {currentPage <= 1 ? (
        <Button variant="outline" size="icon" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" size="icon" asChild>
          <Link
            href={getPageHref(currentPage - 1)}
            scroll={false}
            onClick={(event) => handlePageClick(event, currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
      )}

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isActive = page === currentPage;
          const isEllipsis =
            page !== 1 &&
            page !== totalPages &&
            (page < currentPage - 1 || page > currentPage + 1);

          if (isEllipsis) {
            return page === currentPage - 2 || page === currentPage + 2 ? (
              <span key={page} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : null;
          }

          return (
            <Button
              key={page}
              variant={isActive ? "default" : "outline"}
              size="icon"
              asChild
            >
              <Link
                href={getPageHref(page)}
                scroll={false}
                onClick={(event) => handlePageClick(event, page)}
              >
                {page}
              </Link>
            </Button>
          );
        })}
      </div>

      {currentPage >= totalPages ? (
        <Button variant="outline" size="icon" disabled>
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" size="icon" asChild>
          <Link
            href={getPageHref(currentPage + 1)}
            scroll={false}
            onClick={(event) => handlePageClick(event, currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
