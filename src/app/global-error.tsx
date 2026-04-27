"use client"

// Globalny error boundary — łapie błędy w `app/layout.tsx` (gdy zwykłe error.tsx nie zadziała).
// Musi sam renderować <html> i <body>.
import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error)
  }, [error])

  return (
    <html lang="pl">
      <body style={{
        margin: 0,
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#FAF7F2",
        color: "#1A1A1A",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}>
        <div style={{
          maxWidth: 500,
          background: "#FFFFFF",
          border: "1px solid #E5E0D8",
          borderRadius: 16,
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#9A9A9A", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            CRITICAL ERROR
          </div>
          <h1 style={{ fontSize: 24, margin: 0, marginBottom: 12 }}>Aplikacja przestała odpowiadać.</h1>
          <p style={{ fontSize: 14, color: "#6B6B6B", marginBottom: 20 }}>
            Wystąpił krytyczny błąd na poziomie głównego layoutu. Spróbuj odświeżyć stronę.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "#9A9A9A", marginBottom: 20 }}>
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#0F8A5F",
              color: "white",
              border: 0,
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Odśwież
          </button>
        </div>
      </body>
    </html>
  )
}
