"use client"

import { useEffect, useState } from "react"

/** Debounce wartości — np. pola wyszukiwania (audyt: request na każdy znak). */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])

  return debounced
}
