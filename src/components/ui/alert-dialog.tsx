"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react"

type AlertVariant = "destructive" | "warning" | "info" | "success"

interface AlertDialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: AlertVariant
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({
  open: false,
  onOpenChange: () => {},
  variant: "destructive",
})

function AlertDialog({
  open,
  onOpenChange,
  variant = "destructive",
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: AlertVariant
  children: React.ReactNode
}) {
  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange, variant }}>
      {open && (
        <AlertDialogOverlay>
          <AlertDialogContent>{children}</AlertDialogContent>
        </AlertDialogOverlay>
      )}
    </AlertDialogContext.Provider>
  )
}

function AlertDialogOverlay({ children }: { children: React.ReactNode }) {
  const { onOpenChange } = React.useContext(AlertDialogContext)

  return (
    <div
      data-slot="alert-dialog-overlay"
      className="fixed inset-0 isolate z-50 flex items-center justify-center p-4 sm:p-6"
      style={{
        animation: "overlay-in 280ms cubic-bezier(0.16, 1, 0.3, 1) both",
        background: "oklch(0.13 0.008 260 / 0.40)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      {children}
    </div>
  )
}

const variantIcons = {
  destructive: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  success: CheckCircle2,
}

const variantColors: Record<AlertVariant, { bg: string; icon: string; ring: string }> = {
  destructive: {
    bg: "oklch(0.58 0.22 25 / 0.08)",
    icon: "var(--danger)",
    ring: "oklch(0.58 0.22 25 / 0.15)",
  },
  warning: {
    bg: "oklch(0.72 0.16 80 / 0.10)",
    icon: "var(--warning)",
    ring: "oklch(0.72 0.16 80 / 0.15)",
  },
  info: {
    bg: "var(--brand-muted)",
    icon: "var(--brand)",
    ring: "oklch(0.62 0.17 170 / 0.15)",
  },
  success: {
    bg: "oklch(0.60 0.16 155 / 0.08)",
    icon: "var(--success)",
    ring: "oklch(0.60 0.16 155 / 0.15)",
  },
}

function AlertDialogContent({ children, className, ...props }: React.ComponentProps<"div">) {
  const { variant, onOpenChange } = React.useContext(AlertDialogContext)
  const Icon = variantIcons[variant]
  const colors = variantColors[variant]

  React.useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onOpenChange])

  return (
    <div
      data-slot="alert-dialog-content"
      role="alertdialog"
      aria-modal="true"
      className={cn(
        "relative w-full max-w-md rounded-2xl p-6 outline-none",
        "bg-popover/95 supports-backdrop-filter:backdrop-blur-2xl",
        "shadow-[0_24px_80px_-16px_oklch(0.16_0.015_55/0.24),0_8px_24px_-8px_oklch(0.16_0.015_55/0.08)]",
        "ring-1 ring-foreground/8",
        "animate-[scale-in_320ms_cubic-bezier(0.16,1,0.3,1)_both]",
        className,
      )}
      style={{ animationDuration: "320ms" }}
      {...props}
    >
      <div className="flex gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: colors.bg,
            color: colors.icon,
          }}
        >
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-heading text-base font-semibold leading-tight tracking-tight",
        className,
      )}
      style={{ color: "var(--content-strong)" }}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed", className)}
      style={{ color: "var(--content-muted)" }}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const { onOpenChange } = React.useContext(AlertDialogContext)

  const children = React.Children.toArray(props.children)
  const footerChildren = children.filter(
    (c) => React.isValidElement(c) && (c as React.ReactElement).type !== AlertDialogAction && (c as React.ReactElement).type !== AlertDialogCancel
  )

  const actions = children.filter(
    (c) => React.isValidElement(c) && ((c as React.ReactElement).type === AlertDialogAction || (c as React.ReactElement).type === AlertDialogCancel)
  )

  return (
    <div className={cn("flex flex-col gap-1.5 mt-5 pt-1", className)}>
      <div className="flex items-center justify-end gap-2">
        {actions}
      </div>
      {footerChildren}
    </div>
  )
}

function AlertDialogAction({
  className,
  variant = "destructive",
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & {
  variant?: AlertVariant
  onClick?: (e: React.MouseEvent) => void
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext)
  const dialogVariant = React.useContext(AlertDialogContext).variant

  const resolvedVariant = variant || dialogVariant

  const variantClass = {
    destructive: "bg-[var(--danger)] hover:bg-[var(--danger)]/90",
    warning: "bg-[var(--warning)] hover:bg-[var(--warning)]/90 text-surface-0",
    info: "bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-surface-0",
    success: "bg-[var(--success)] hover:bg-[var(--success)]/90 text-surface-0",
  }[resolvedVariant]

  return (
    <Button
      className={cn(variantClass, "shadow-none", className)}
      onClick={(e) => {
        onClick?.(e)
        onOpenChange(false)
      }}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & {
  onClick?: (e: React.MouseEvent) => void
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext)

  return (
    <Button
      variant="outline"
      className={className}
      onClick={(e) => {
        onClick?.(e)
        onOpenChange(false)
      }}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
}
export type { AlertVariant }
