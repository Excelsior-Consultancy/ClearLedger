-- Add persisted reporting quarters and point each workspace at an active quarter.
ALTER TABLE "Workspace"
ADD COLUMN "activeQuarterId" TEXT;

CREATE TABLE "ReportingQuarter" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportingQuarter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportingQuarter_workspaceId_idx" ON "ReportingQuarter"("workspaceId");
CREATE INDEX "ReportingQuarter_workspaceId_startDate_idx" ON "ReportingQuarter"("workspaceId", "startDate");

ALTER TABLE "ReportingQuarter"
ADD CONSTRAINT "ReportingQuarter_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Workspace"
ADD CONSTRAINT "Workspace_activeQuarterId_fkey"
FOREIGN KEY ("activeQuarterId") REFERENCES "ReportingQuarter"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
