"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Audyt F1: aktywacja dark mode — paleta `.dark` w globals.css istniała,
 * ale nic nie dodawało klasy do <html>. next-themes zarządza klasą + localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
