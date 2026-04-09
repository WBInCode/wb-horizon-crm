import { prisma } from "@/lib/prisma"

type NotificationType =
  | "CASE_ASSIGNED"
  | "NEW_MESSAGE"
  | "CHECKLIST_MISSING"
  | "CASE_FOR_APPROVAL"
  | "CASE_RETURNED"
  | "CARETAKER_CHANGED"

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
