-- Performance indexes for hot query paths

CREATE INDEX IF NOT EXISTS "Approval_caseId_idx" ON "Approval"("caseId");
CREATE INDEX IF NOT EXISTS "Approval_approvedById_idx" ON "Approval"("approvedById");
CREATE INDEX IF NOT EXISTS "Approval_status_idx" ON "Approval"("status");
CREATE INDEX IF NOT EXISTS "Approval_targetType_targetId_idx" ON "Approval"("targetType", "targetId");

CREATE INDEX IF NOT EXISTS "Case_salesId_idx" ON "Case"("salesId");
CREATE INDEX IF NOT EXISTS "Case_caretakerId_idx" ON "Case"("caretakerId");
CREATE INDEX IF NOT EXISTS "Case_directorId_idx" ON "Case"("directorId");
CREATE INDEX IF NOT EXISTS "Case_clientId_idx" ON "Case"("clientId");
CREATE INDEX IF NOT EXISTS "Case_productId_idx" ON "Case"("productId");
CREATE INDEX IF NOT EXISTS "Case_sourceId_idx" ON "Case"("sourceId");
CREATE INDEX IF NOT EXISTS "Case_status_idx" ON "Case"("status");
CREATE INDEX IF NOT EXISTS "Case_processStage_idx" ON "Case"("processStage");
CREATE INDEX IF NOT EXISTS "Case_detailedStatus_idx" ON "Case"("detailedStatus");
CREATE INDEX IF NOT EXISTS "Case_archivedAt_idx" ON "Case"("archivedAt");
CREATE INDEX IF NOT EXISTS "Case_createdAt_idx" ON "Case"("createdAt");
CREATE INDEX IF NOT EXISTS "Case_updatedAt_idx" ON "Case"("updatedAt");

CREATE INDEX IF NOT EXISTS "CaseFile_caseId_idx" ON "CaseFile"("caseId");
CREATE INDEX IF NOT EXISTS "CaseFile_status_idx" ON "CaseFile"("status");
CREATE INDEX IF NOT EXISTS "CaseFile_uploadedById_idx" ON "CaseFile"("uploadedById");
CREATE INDEX IF NOT EXISTS "CaseFile_groupId_idx" ON "CaseFile"("groupId");
CREATE INDEX IF NOT EXISTS "CaseFile_deletedAt_idx" ON "CaseFile"("deletedAt");

CREATE INDEX IF NOT EXISTS "CaseMessage_caseId_idx" ON "CaseMessage"("caseId");
CREATE INDEX IF NOT EXISTS "CaseMessage_authorId_idx" ON "CaseMessage"("authorId");
CREATE INDEX IF NOT EXISTS "CaseMessage_createdAt_idx" ON "CaseMessage"("createdAt");

CREATE INDEX IF NOT EXISTS "Client_ownerId_idx" ON "Client"("ownerId");
CREATE INDEX IF NOT EXISTS "Client_caretakerId_idx" ON "Client"("caretakerId");
CREATE INDEX IF NOT EXISTS "Client_sourceId_idx" ON "Client"("sourceId");
CREATE INDEX IF NOT EXISTS "Client_stage_idx" ON "Client"("stage");
CREATE INDEX IF NOT EXISTS "Client_archivedAt_idx" ON "Client"("archivedAt");
CREATE INDEX IF NOT EXISTS "Client_createdAt_idx" ON "Client"("createdAt");

CREATE INDEX IF NOT EXISTS "Lead_assignedSalesId_idx" ON "Lead"("assignedSalesId");
CREATE INDEX IF NOT EXISTS "Lead_sourceId_idx" ON "Lead"("sourceId");
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_priority_idx" ON "Lead"("priority");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "Quote_caseId_idx" ON "Quote"("caseId");
CREATE INDEX IF NOT EXISTS "Quote_status_idx" ON "Quote"("status");
CREATE INDEX IF NOT EXISTS "Quote_createdAt_idx" ON "Quote"("createdAt");
