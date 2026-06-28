import { prisma } from "@/modules/db/prisma";
import { getWorkspaceAccess } from "@/modules/auth/service";
import { type ReportingQuarter } from "@/modules/shared/quarter";
import type { PayRun } from "@/modules/shared/types";
import { resolveWorkspaceQuarter } from "@/modules/quarters/service";

export type PayRunWorkspace = {
  workspaceId: string;
  workspaceName: string;
  quarter: ReportingQuarter;
  payRuns: PayRun[];
};

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }
  return date;
}

function currentQuarterDateRange(quarter: ReportingQuarter) {
  const start = parseDateInput(quarter.startDate);
  const inclusiveEnd = parseDateInput(quarter.endDate);
  if (!start || !inclusiveEnd) {
    throw new Error("Current payroll quarter configuration is invalid.");
  }

  return {
    start,
    exclusiveEnd: new Date(inclusiveEnd.getTime() + 24 * 60 * 60 * 1000)
  };
}

export async function getPayrollWorkspace(quarterId?: string): Promise<PayRunWorkspace> {
  const access = await getWorkspaceAccess();
  const { selectedQuarter } = quarterId
    ? await resolveWorkspaceQuarter(access.workspaceId, quarterId)
    : await resolveWorkspaceQuarter(access.workspaceId);
  const range = currentQuarterDateRange({
    label: selectedQuarter.label,
    startDate: selectedQuarter.startDate,
    endDate: selectedQuarter.endDate,
    locked: selectedQuarter.locked || !selectedQuarter.active
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: access.workspaceId },
    include: {
      payRuns: {
        where: {
          periodStart: {
            gte: range.start,
            lt: range.exclusiveEnd
          }
        },
        orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!workspace) {
    throw new Error("Complete company setup before viewing payroll.");
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    quarter: {
      label: selectedQuarter.label,
      startDate: selectedQuarter.startDate,
      endDate: selectedQuarter.endDate,
      locked: selectedQuarter.locked || !selectedQuarter.active
    },
    payRuns: workspace.payRuns.map((payRun) => ({
      id: payRun.id,
      workspaceId: payRun.workspaceId,
      employeeName: payRun.employeeName,
      periodStart: payRun.periodStart.toISOString().slice(0, 10),
      periodEnd: payRun.periodEnd.toISOString().slice(0, 10),
      payDate: payRun.payDate.toISOString().slice(0, 10),
      grossCents: payRun.grossCents,
      reimbursementsCents: payRun.reimbursementsCents,
      paygCents: payRun.paygCents,
      superCents: payRun.superCents,
      finalized: payRun.finalized,
      overrideReason: payRun.overrideReason ?? undefined
    }))
  };
}
