import { NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * Stan zadan cyklicznych.
 *
 * Powstalo z konkretnej wpadki: okres przechowywania archiwum byl skonfigurowany,
 * trasa czyszczaca istniala, sekret byl ustawiony — i nic tego nie wolalo przez
 * caly czas dzialania systemu. Bez podgladu taka cisza wyglada dokladnie tak samo
 * jak poprawna praca.
 */
export async function GET() {
  try {
    const user = await requirePermission("admin.archive")
    if (!user) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 })

    const zadania = await prisma.scheduledJob.findMany({ orderBy: { name: "asc" } })

    return NextResponse.json(
      zadania.map((z) => ({
        nazwa: z.name,
        ostatniPrzebieg: z.lastRunAt,
        nastepnyPrzebieg: z.nextRunAt,
        wTrakcie: z.lockedAt !== null,
        liczbaPrzebiegow: z.runCount,
        ostatniWynik: z.lastResult ? JSON.parse(z.lastResult) : null,
        ostatniBlad: z.lastError,
      })),
    )
  } catch (error) {
    logger.error("GET harmonogram failed", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
