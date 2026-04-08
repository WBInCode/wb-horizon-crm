import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "CLIENT") {
      return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })
    }

    const client = await prisma.client.findFirst({
      where: { ownerId: user.id },
      select: {
        id: true,
        companyName: true,
        nip: true,
        industry: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Brak przypisanej firmy" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
