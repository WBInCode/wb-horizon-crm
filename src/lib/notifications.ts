import { prisma } from "@/lib/prisma"

type NotificationType =
  | "CASE_ASSIGNED"
  | "NEW_MESSAGE"
  | "CHECKLIST_MISSING"
  | "CASE_FOR_APPROVAL"
  | "CASE_RETURNED"
  | "CARETAKER_CHANGED"
  | "MEETING_CREATED"
  | "STAGE_CHANGED"

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link: link || null,
    },
  })
}

// PDF A.4.3 — zwraca wszystkich uczestników procesu (case)
// Pomija przekazanego `excludeUserId` (nie wysyłaj notif do siebie)
export async function getProcessParticipants(
  caseId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      salesId: true,
      caretakerId: true,
      directorId: true,
      client: { select: { ownerId: true, caretakerId: true } },
      meetings: {
        where: { assignedToId: { not: null } },
        select: { assignedToId: true },
        distinct: ["assignedToId"],
      },
    },
  })
  if (!c) return []

  const ids = new Set<string>()
  if (c.salesId) ids.add(c.salesId)
  if (c.caretakerId) ids.add(c.caretakerId)
  if (c.directorId) ids.add(c.directorId)
  if (c.client?.ownerId) ids.add(c.client.ownerId)
  if (c.client?.caretakerId) ids.add(c.client.caretakerId)
  for (const m of c.meetings) {
    if (m.assignedToId) ids.add(m.assignedToId)
  }
  if (excludeUserId) ids.delete(excludeUserId)
  return Array.from(ids)
}

// Bulk helper: wyślij notif do wszystkich uczestników procesu
export async function notifyProcessParticipants(
  caseId: string,
  excludeUserId: string,
  type: NotificationType,
  title: string,
  message: string,
) {
  const ids = await getProcessParticipants(caseId, excludeUserId)
  await Promise.all(
    ids.map((uid) => createNotification(uid, type, title, message, `/cases/${caseId}`)),
  )
}

export async function notifyCaseAssigned(caretakerId: string, caseId: string, caseTitle: string) {
  return createNotification(
    caretakerId,
    "CASE_ASSIGNED",
    "Nowa sprzedaż przydzielona",
    `Przydzielono Ci sprzedaż: ${caseTitle}`,
    `/cases/${caseId}`
  )
}

export async function notifyNewMessage(userId: string, caseId: string, senderName: string) {
  return createNotification(
    userId,
    "NEW_MESSAGE",
    "Nowa wiadomość",
    `${senderName} wysłał(a) wiadomość`,
    `/cases/${caseId}`
  )
}

export async function notifyCaseForApproval(directorId: string, caseId: string, caseTitle: string) {
  return createNotification(
    directorId,
    "CASE_FOR_APPROVAL",
    "Sprzedaż do zatwierdzenia",
    `Sprzedaż "${caseTitle}" oczekuje na Twoją akceptację`,
    `/cases/${caseId}`
  )
}

export async function notifyCaseReturned(caretakerId: string, caseId: string, caseTitle: string) {
  return createNotification(
    caretakerId,
    "CASE_RETURNED",
    "Sprzedaż do poprawy",
    `Sprzedaż "${caseTitle}" została zwrócona do poprawy`,
    `/cases/${caseId}`
  )
}

export async function notifyCaretakerChanged(userId: string, caseId: string, newCaretakerName: string) {
  return createNotification(
    userId,
    "CARETAKER_CHANGED",
    "Zmiana opiekuna",
    `Opiekun sprzedaży został zmieniony na: ${newCaretakerName}`,
    `/cases/${caseId}`
  )
}
