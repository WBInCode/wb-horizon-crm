"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const SHEET_SIDES = ["top", "right", "bottom", "left"] as const
type SheetSide = (typeof SHEET_SIDES)[number]

interface SheetContextValue {
  open: boolean
  side: SheetSide
  onOpenChange: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  side: "right",
  onOpenChange: () => {},
})

function Sheet({
  open,
  onOpenChange,
  side = "right",
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: SheetSide
  children: React.ReactNode
}) {
  return (
    <SheetContext.Provider value={{ open, side, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

const sideAnimation = {
  top: {
    container: "top-0 left-0 right-0 h-auto max-h-[85vh]",
    motion: {
      from: "-translate-y-full",
      to: "translate-y-0",
    },
  },
  bottom: {
    container: "bottom-0 left-0 right-0 h-auto max-h-[85vh]",
    motion: {
      from: "translate-y-full",
      to: "translate-y-0",
    },
  },
  left: {
    container: "left-0 top-0 bottom-0 w-full max-w-sm sm:max-w-md",
    motion: {
      from: "-translate-x-full",
      to: "translate-x-0",
    },
  },
  right: {
    container: "right-0 top-0 bottom-0 w-full max-w-sm sm:max-w-md",
    motion: {
      from: "translate-x-full",
      to: "translate-x-0",
    },
  },
} as const

function SheetOverlay() {
  const { open, onOpenChange } = React.useContext(SheetContext)

  if (!open) return null

  return (
    <div
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 isolate z-50",
        "bg-surface-0/40 supports-backdrop-filter:backdrop-blur-sm",
        "animate-[overlay-in_320ms_cubic-bezier(0.16,1,0.3,1)_both]",
      )}
      onClick={() => onOpenChange(false)}
      style={{ animationDuration: "320ms" }}
    />
  )
}

function SheetContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, side } = React.useContext(SheetContext)
  const s = sideAnimation[side]

  if (!open) return null

  return (
    <div>
      <SheetOverlay />
      <div
        data-slot="sheet-content"
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-50 outline-none",
          s.container,
          "bg-popover/95 supports-backdrop-filter:backdrop-blur-2xl",
          "shadow-[0_24px_80px_-16px_oklch(0.16_0.015_55/0.24),0_8px_24px_-8px_oklch(0.16_0.015_55/0.10)]",
          "ring-1 ring-foreground/6",
          side === "top" || side === "bottom" ? "rounded-b-2xl" : "rounded-l-2xl",
          side === "left" ? "rounded-l-2xl" : side === "right" ? "rounded-r-2xl" : "",
          "p-6",
          "flex flex-col gap-4 overflow-y-auto",
          `animate-[sheet-in-${side}_400ms_cubic-bezier(0.16,1,0.3,1)_both]`,
          className,
        )}
        style={{ animationDuration: "400ms" }}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { onOpenChange } = React.useContext(SheetContext)

  return (
    <div className={cn("flex items-start justify-between gap-4", className)} {...props}>
      <div className="flex flex-col gap-1.5">{props.children}</div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 opacity-40 hover:opacity-100 transition-opacity -mr-1.5 -mt-1.5"
        onClick={() => onOpenChange(false)}
      >
        <XIcon className="w-4 h-4" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn(
        "font-heading text-lg font-semibold leading-tight tracking-tight",
        className,
      )}
      style={{ color: "var(--content-strong)" }}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-sm", className)}
      style={{ color: "var(--content-muted)" }}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-foreground/5 px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      style={{ background: "var(--surface-2)" }}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
}
export type { SheetSide }
