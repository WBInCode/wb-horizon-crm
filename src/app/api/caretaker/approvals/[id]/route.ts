import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["CARETAKER", "DIRECTOR", "ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!["APPROVED", "REJECTED", "TO_FIX"].includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })

  const approval = await prisma.approval.findUnique({ where: { id } })
  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (approval.approvedById !== user.id && user.role !== "ADMIN")
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 })

  const updated = await prisma.approval.update({
    where: { id },
    data: { status },
  })
  return NextResponse.json(updated)
}
