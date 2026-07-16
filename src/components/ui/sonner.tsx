"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-lg)",
          "--success-bg": "oklch(0.60 0.16 155 / 0.10)",
          "--success-text": "var(--success)",
          "--error-bg": "oklch(0.58 0.22 25 / 0.08)",
          "--error-text": "var(--danger)",
          "--width": "380px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:shadow-lg " +
            "group-[.toaster]:backdrop-blur-xl group-[.toaster]:font-sans group-[.toaster]:text-sm " +
            "group-[.toaster]:px-4 group-[.toaster]:py-3",
          title: "group-[.toaster]:text-sm group-[.toaster]:font-medium",
          description: "group-[.toaster]:text-xs group-[.toaster]:opacity-70",
          actionButton: "group-[.toaster]:text-xs group-[.toaster]:font-medium",
          cancelButton: "group-[.toaster]:text-xs group-[.toaster]:opacity-60",
        },
        style: {
          animation: "toast-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
