import crypto from "node:crypto";
import { prisma } from "@/modules/db/prisma";
import type { BasReport } from "./report";

export type BasFilingStatus = "draft" | "finalized";
export type BasFilingBasis = "not_configured" | "cash" | "accrual";

export type BasFilingPayload = {
  workspaceId: string;
  quarterId: string;
  quarterLabel: string;
  status: BasFilingStatus;
  basis: BasFilingBasis;
  sourceHash: string;
  report: BasReport;
  lockedAt?: string;
  finalizedAt?: string;
};

function hashPayload(report: BasReport) {
  return crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex");
}

export function createBasFilingPayload(input: {
  workspaceId: string;
  quarterId: string;
  quarterLabel: string;
  report: BasReport;
  status?: BasFilingStatus;
  basis?: BasFilingBasis;
  lockedAt?: Date | null;
  finalizedAt?: Date | null;
}): BasFilingPayload {
  return {
    workspaceId: input.workspaceId,
    quarterId: input.quarterId,
    quarterLabel: input.quarterLabel,
    status: input.status ?? "draft",
    basis: input.basis ?? "not_configured",
    sourceHash: hashPayload(input.report),
    report: input.report,
    lockedAt: input.lockedAt?.toISOString(),
    finalizedAt: input.finalizedAt?.toISOString()
  };
}

export async function getBasFiling(workspaceId: string, quarterId: string) {
  const filing = await prisma.basFiling.findUnique({
    where: {
      workspaceId_quarterId: {
        workspaceId,
        quarterId
      }
    }
  });

  if (!filing) {
    return null;
  }

  return {
    id: filing.id,
    workspaceId: filing.workspaceId,
    quarterId: filing.quarterId,
    quarterLabel: filing.quarterLabel,
    status: filing.status.toLowerCase() as BasFilingStatus,
    basis: filing.basis.toLowerCase() as BasFilingBasis,
    sourceHash: filing.sourceHash,
    report: filing.reportJson as BasReport,
    lockedAt: filing.lockedAt?.toISOString() ?? undefined,
    finalizedAt: filing.finalizedAt?.toISOString() ?? undefined,
    createdAt: filing.createdAt.toISOString(),
    updatedAt: filing.updatedAt.toISOString()
  };
}

export async function upsertBasFiling(input: BasFilingPayload & {
  createdByUserId?: string | null;
  finalizedByUserId?: string | null;
}) {
  const filing = await prisma.basFiling.upsert({
    where: {
      workspaceId_quarterId: {
        workspaceId: input.workspaceId,
        quarterId: input.quarterId
      }
    },
    create: {
      workspaceId: input.workspaceId,
      quarterId: input.quarterId,
      quarterLabel: input.quarterLabel,
      status: input.status.toUpperCase() as "DRAFT" | "FINALIZED",
      basis: input.basis.toUpperCase() as "NOT_CONFIGURED" | "CASH" | "ACCRUAL",
      reportJson: input.report,
      sourceHash: input.sourceHash,
      lockedAt: input.lockedAt ? new Date(input.lockedAt) : null,
      finalizedAt: input.finalizedAt ? new Date(input.finalizedAt) : null,
      createdByUserId: input.createdByUserId ?? null,
      finalizedByUserId: input.finalizedByUserId ?? null
    },
    update: {
      quarterLabel: input.quarterLabel,
      status: input.status.toUpperCase() as "DRAFT" | "FINALIZED",
      basis: input.basis.toUpperCase() as "NOT_CONFIGURED" | "CASH" | "ACCRUAL",
      reportJson: input.report,
      sourceHash: input.sourceHash,
      lockedAt: input.lockedAt ? new Date(input.lockedAt) : null,
      finalizedAt: input.finalizedAt ? new Date(input.finalizedAt) : null,
      createdByUserId: input.createdByUserId ?? null,
      finalizedByUserId: input.finalizedByUserId ?? null
    }
  });

  return {
    id: filing.id,
    workspaceId: filing.workspaceId,
    quarterId: filing.quarterId,
    quarterLabel: filing.quarterLabel,
    status: filing.status.toLowerCase() as BasFilingStatus,
    basis: filing.basis.toLowerCase() as BasFilingBasis,
    sourceHash: filing.sourceHash,
    report: filing.reportJson as BasReport,
    lockedAt: filing.lockedAt?.toISOString() ?? undefined,
    finalizedAt: filing.finalizedAt?.toISOString() ?? undefined,
    createdAt: filing.createdAt.toISOString(),
    updatedAt: filing.updatedAt.toISOString()
  };
}
