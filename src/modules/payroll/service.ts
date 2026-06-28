import { prisma } from "@/modules/db/prisma";
import { getWorkspaceAccess } from "@/modules/auth/service";
import { quarterDateRange, type ReportingQuarter } from "@/modules/shared/quarter";
import type { PayRun } from "@/modules/shared/types";
import { resolveWorkspaceQuarter } from "@/modules/quarters/service";

export type PayRunWorkspace = {
  workspaceId: string;
  workspaceName: string;
  quarter: ReportingQuarter;
  payRuns: PayRun[];
};

export async function getPayrollWorkspace(quarterId?: string): Promise<PayRunWorkspace> {
  const access = await getWorkspaceAccess();
  const { selectedQuarter } = await resolveWorkspaceQuarter(access.workspaceId, quarterId);
  const range = quarterDateRange(selectedQuarter);

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
    quarter: selectedQuarter,
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
