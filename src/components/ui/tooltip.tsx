"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function TooltipProvider({ children, delayDuration = 400 }: {
  children: React.ReactNode
  delayDuration?: number
}) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  )
}

interface TooltipContextValue {
  delayDuration: number
}

const TooltipContext = React.createContext<TooltipContextValue>({
  delayDuration: 400,
})

function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const { delayDuration } = React.useContext(TooltipContext)

  const show = React.useCallback(() => {
    timerRef.current = setTimeout(() => setOpen(true), delayDuration)
  }, [delayDuration])

  const hide = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(false)
  }, [])

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
    }
  }, [open])

  const trigger = React.Children.toArray(children).find(
    (c) => React.isValidElement(c) && (c as React.ReactElement<unknown>).type === TooltipTrigger
  ) as React.ReactElement | undefined

  const content = React.Children.toArray(children).find(
    (c) => React.isValidElement(c) && (c as React.ReactElement<unknown>).type === TooltipContent
  ) as React.ReactElement<{ children?: React.ReactNode }> | undefined

  if (!trigger || !content) return <>{children}</>

  return (
    <div
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      {open && (
        <div
          data-slot="tooltip-content"
          role="tooltip"
          className={cn(
            "fixed z-[100] px-2.5 py-1.5 text-xs font-medium",
            "rounded-lg shadow-lg outline-none",
            "max-w-xs break-words",
            "animate-[slide-up-in_200ms_cubic-bezier(0.16,1,0.3,1)_both]",
            "pointer-events-none select-none",
          )}
          style={{
            left: position.x,
            top: position.y,
            transform: "translate(-50%, -100%)",
            background: "var(--sidebar)",
            color: "var(--sidebar-foreground)",
            border: "1px solid var(--sidebar-border)",
            animationDuration: "200ms",
          }}
        >
          {(content as React.ReactElement<{ children?: React.ReactNode }>).props.children}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--sidebar)",
            }}
          />
        </div>
      )}
    </div>
  )
}

function TooltipTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function TooltipContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
