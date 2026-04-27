/**
 * Shared API DTOs — strict types for client-side fetching.
 *
 * These are lightweight DTO shapes (subset of Prisma models) used by both
 * UI components and API routes. They are intentionally NOT auto-generated
 * from Prisma to keep API payloads stable when DB schema evolves.
 *
 * For full Prisma model types use `import type { Lead } from "@prisma/client"`.
 */

import type {
  LeadStatus,
  LeadPriority,
  CaseStatus,
  SaleProcessStage,
  SaleDetailedStatus,
  ContractorStage,
  Role,
  UserStatus,
  ApprovalStatus,
  QuoteStatus,
  FileStatus,
  ChecklistItemStatus,
  MessageType,
} from "@prisma/client"

// ─── Re-exports ───
export type {
  LeadStatus,
  LeadPriority,
  CaseStatus,
  SaleProcessStage,
  SaleDetailedStatus,
  ContractorStage,
  Role,
  UserStatus,
  ApprovalStatus,
  QuoteStatus,
  FileStatus,
  ChecklistItemStatus,
  MessageType,
}

// ─── User ───
export interface UserDTO {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  avatarUrl?: string | null
}

export interface UserMiniDTO {
  id: string
  name: string
  role?: Role
}

// ─── Contact / Client ───
export interface ContactDTO {
  id: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  isMain: boolean
}

export interface ClientMiniDTO {
  id: string
  companyName: string
  industry?: string | null
}

export interface ClientDTO extends ClientMiniDTO {
  nip: string | null
  industry: string | null
  website: string | null
  hasWebsite: boolean
  address: string | null
  description: string | null
  stage: ContractorStage
  ownerId: string | null
  caretakerId: string | null
  archivedAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  contacts?: ContactDTO[]
  source?: { name: string } | null
  caretaker?: UserMiniDTO | null
  owner?: UserMiniDTO | null
}

// ─── Lead ───
export interface LeadDTO {
  id: string
  companyName: string
  nip: string | null
  industry: string | null
  website?: string | null
  contactPerson: string
  position?: string | null
  phone: string
  email: string | null
  status: LeadStatus
  priority: LeadPriority | null
  notes: string | null
  needs: string | null
  nextStep: string | null
  nextStepDate: string | Date | null
  meetingDate: string | Date | null
  source: string | null
  sourceId: string | null
  assignedSalesId: string | null
  assignedSales?: UserMiniDTO | null
  createdAt: string | Date
  updatedAt: string | Date
}

// ─── Case ───
export interface CaseFileDTO {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  status: FileStatus
  uploadedAt: string | Date
}

export interface CaseChecklistDTO {
  id: string
  label: string
  status: ChecklistItemStatus
  isRequired: boolean
  isCritical: boolean
  isBlocking: boolean
  assignedToId: string | null
  completedAt: string | Date | null
}

export interface CaseMessageDTO {
  id: string
  content: string
  type: MessageType
  createdAt: string | Date
  authorId: string | null
  author?: UserMiniDTO | null
}

export interface ApprovalDTO {
  id: string
  status: ApprovalStatus
  approverId?: string | null
  approver?: UserMiniDTO | null
  approvedBy?: UserMiniDTO | null
  targetType?: string
  reason?: string | null
  comment?: string | null
  createdAt: string | Date
  decidedAt?: string | Date | null
}

export interface QuoteDTO {
  id: string
  status: QuoteStatus
  scope?: string | null
  price?: number | null
  notes?: string | null
  total: number | null
  createdAt: string | Date
  updatedAt: string | Date
}

export interface CaseDTO {
  id: string
  title: string
  serviceName: string | null
  status: CaseStatus
  processStage: SaleProcessStage
  detailedStatus: SaleDetailedStatus
  clientId: string
  productId: string | null
  salesId: string | null
  caretakerId: string | null
  contractSignedAt: string | Date | null
  executionStartAt: string | Date | null
  executionEndAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  archivedAt: string | Date | null
  client?: ClientMiniDTO
  salesperson?: UserMiniDTO | null
  caretaker?: UserMiniDTO | null
  files?: CaseFileDTO[]
  checklist?: CaseChecklistDTO[]
  messages?: CaseMessageDTO[]
  approvals?: ApprovalDTO[]
  quotes?: QuoteDTO[]
}

// ─── Dashboard ───
export interface DashboardCaseSummary {
  id: string
  title: string
  client?: ClientMiniDTO
  processStage?: SaleProcessStage
  detailedStatus?: SaleDetailedStatus
  status?: CaseStatus
  createdAt?: string | Date
  surveyDeadline?: string | Date | null
}

export interface DashboardActivity {
  id: string
  type: string
  content?: string
  createdAt: string | Date
  case?: { title: string; id?: string }
  author?: UserMiniDTO | null
}

export interface DashboardTaskItem {
  id: string
  label: string
  status?: ChecklistItemStatus
  case?: {
    id: string
    title: string
    client?: ClientMiniDTO
  }
}

export interface DashboardData {
  newLeads: number
  activeCasesCount: number
  myExecutionCount: number
  pendingCases: DashboardCaseSummary[]
  casesForApproval: DashboardCaseSummary[]
  casesWithMissing: Array<DashboardCaseSummary & { files?: { fileName: string; status: FileStatus }[] }>
  upcomingDeadlines: DashboardCaseSummary[]
  recentActivity: DashboardActivity[]
  unreadNotifications: number
  mySales: DashboardCaseSummary[]
  myApprovals: DashboardCaseSummary[]
  myMissing: DashboardCaseSummary[]
  myTasks: DashboardTaskItem[]
  myClients: ClientDTO[]
  toFix: DashboardCaseSummary[]
  userId: string
}
