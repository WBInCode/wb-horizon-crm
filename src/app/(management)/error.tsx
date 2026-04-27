"use client"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary {...props} scope="Zarząd" homeHref="/management" homeLabel="Powrót do panelu" />
}
