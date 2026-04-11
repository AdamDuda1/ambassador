"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const btnClass =
  "inline-flex h-10 items-center justify-center !rounded-none [border-radius:0!important] border border-white/10 bg-muted px-4 font-body text-sm text-white transition-colors hover:bg-muted/80";
const btnDisabledClass =
  "inline-flex h-10 items-center justify-center !rounded-none [border-radius:0!important] border border-white/10 bg-muted px-4 font-body text-sm text-white/30 pointer-events-none";

export function Pagination({
  totalCount,
  pageSize,
  labels,
}: {
  totalCount: number;
  pageSize: number;
  labels: { previous: string; next: string; page: string };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <div className="font-body text-sm text-secondary">
        {labels.page} {currentPage} / {totalPages}
      </div>
      <div className="flex gap-2">
        {currentPage > 1 ? (
          <Link href={buildHref(currentPage - 1)} className={btnClass}>
            {labels.previous}
          </Link>
        ) : (
          <span className={btnDisabledClass}>{labels.previous}</span>
        )}
        {currentPage < totalPages ? (
          <Link href={buildHref(currentPage + 1)} className={btnClass}>
            {labels.next}
          </Link>
        ) : (
          <span className={btnDisabledClass}>{labels.next}</span>
        )}
      </div>
    </div>
  );
}
