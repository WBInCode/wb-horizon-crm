import { cn } from "@/lib/utils"

/** Placeholder ładowania — animacja shimmer z klasy .skeleton (globals.css). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("skeleton rounded-lg", className)} {...props} />
}

/** Skeleton tabeli — nagłówek + n wierszy. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="border rounded-lg p-4 space-y-3" style={{ borderColor: "var(--line-subtle)" }}>
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" style={{ opacity: 1 - i * 0.09 }} />
      ))}
    </div>
  )
}

/** Skeleton strony-listy: nagłówek + filtry + tabela. */
export function ListPageSkeleton() {
  return (
    <div className="p-6 space-y-6" role="status" aria-label="Ładowanie">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <TableSkeleton />
    </div>
  )
}
