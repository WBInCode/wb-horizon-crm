"use client"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary {...props} scope="Panel klienta" homeHref="/client" homeLabel="Powrót do panelu" />
}
