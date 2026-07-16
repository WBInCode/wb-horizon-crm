/**
 * GET /api/hub/modules — włączone moduły instancji z Huba (Faza 6).
 * `modules: null` = tryb standalone (brak integracji / przed pierwszym SSO)
 * — nawigacja pokazuje wszystko.
 */

import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getEnabledModules } from "@/lib/hub"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const modules = await getEnabledModules()
  return NextResponse.json({ modules })
}
