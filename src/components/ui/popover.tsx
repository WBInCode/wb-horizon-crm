"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  onOpenChange: () => {},
})

function Popover({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { open, onOpenChange } = React.useContext(PopoverContext)

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="dialog"
      data-slot="popover-trigger"
      className={className}
      onClick={() => onOpenChange(!open)}
    >
      {children}
    </button>
  )
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  const { open, onOpenChange } = React.useContext(PopoverContext)

  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("[data-slot=popover-content]") && !target.closest("[data-slot=popover-trigger]")) {
        onOpenChange(false)
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }

    document.addEventListener("click", handleClickOutside, true)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("click", handleClickOutside, true)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onOpenChange])

  if (!open) return null

  const alignClass = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  }[align]

  return (
    <div
      data-slot="popover-content"
      role="dialog"
      className={cn(
        "absolute z-50 mt-[var(--offset)]",
        alignClass,
        "w-72 rounded-xl p-4 text-sm outline-none",
        "bg-popover/95 supports-backdrop-filter:backdrop-blur-xl",
        "shadow-[0_16px_48px_-12px_oklch(0.16_0.015_55/0.16),0_4px_16px_-4px_oklch(0.16_0.015_55/0.06)]",
        "ring-1 ring-foreground/8",
        "animate-[dropdown-in_240ms_cubic-bezier(0.16,1,0.3,1)_both]",
        className,
      )}
      style={{
        "--offset": `${sideOffset}px`,
        animationDuration: "240ms",
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
