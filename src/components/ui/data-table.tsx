"use client"

/**
 * DataTable (audyt F3) — generyczna tabela na TanStack Table:
 * sortowanie kolumn (aria-sort), paginacja client-side, klikalne wiersze,
 * skeleton ładowania i konfigurowalny stan pusty. Server-side pagination
 * można dodać przez `manualPagination` w przyszłości.
 */

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/ui/skeleton"

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  loading?: boolean
  /** Węzeł renderowany gdy brak danych (np. <EmptyState/>). */
  empty?: React.ReactNode
  onRowClick?: (row: TData) => void
  /** Styl wiersza (np. podświetlenie zaznaczenia). */
  rowStyle?: (row: TData) => React.CSSProperties | undefined
  pageSize?: number
  /** Ukryj paginację (krótkie listy). */
  hidePagination?: boolean
}

export function DataTable<TData>({
  columns,
  data,
  loading = false,
  empty,
  onRowClick,
  rowStyle,
  pageSize = 25,
  hidePagination = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const pageCount = table.getPageCount()
  const { pageIndex } = table.getState().pagination

  if (loading) return <TableSkeleton rows={Math.min(pageSize, 8)} />

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-x-auto" style={{ borderColor: "var(--line-subtle)" }}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                      }
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-[var(--content-strong)] transition-colors -ml-1 px-1 py-0.5 rounded"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Sortuj po: ${String(header.column.columnDef.header)}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="w-3 h-3" aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  {empty ?? (
                    <p className="text-center py-8 text-sm" style={{ color: "var(--content-muted)" }}>
                      Brak danych
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer hover:bg-[var(--surface-2)]" : undefined}
                  style={rowStyle?.(row.original)}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!hidePagination && pageCount > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: "var(--content-muted)" }}>
            {table.getFilteredRowModel().rows.length} rekordów · strona {pageIndex + 1} z {pageCount}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Poprzednia strona"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Następna strona"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { ColumnDef }
