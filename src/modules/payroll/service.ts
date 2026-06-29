import { prisma } from "@/modules/db/prisma";
import { getWorkspaceAccess } from "@/modules/auth/service";
import { quarterDateRange, type ReportingQuarter } from "@/modules/shared/quarter";
import type { PayRun, Person } from "@/modules/shared/types";
import { resolveWorkspaceQuarter } from "@/modules/quarters/service";

export type PayRunWorkspace = {
  workspaceId: string;
  workspaceName: string;
  quarter: ReportingQuarter;
  payRuns: PayRun[];
  employees: PayrollEmployee[];
  submissions: PayrollSubmissionRow[];
  auditEvents: PayrollAuditEventRow[];
};

export type PayrollEmployee = Person & {
  employmentStatus: "active" | "inactive";
};

export type PayrollSubmissionRow = {
  id: string;
  workspaceId: string;
  payRunId?: string;
  type: "stp_pay_event" | "stp_finalisation" | "stp_update" | "super_export";
  status: "draft" | "validated" | "queued" | "sent" | "accepted" | "rejected";
  payloadJson: unknown;
  responseJson?: unknown;
  errorMessage?: string;
  externalReference?: string;
  submittedAt?: string;
  createdAt: string;
};

export type PayrollAuditEventRow = {
  id: string;
  workspaceId: string;
  payRunId?: string;
  personId?: string;
  action: string;
  detail?: string;
  createdByUserId?: string;
  createdAt: string;
};

export async function getPayrollWorkspace(quarterId?: string): Promise<PayRunWorkspace> {
  const access = await getWorkspaceAccess();
  const { selectedQuarter } = await resolveWorkspaceQuarter(access.workspaceId, quarterId);
  const range = quarterDateRange(selectedQuarter);

  const workspace = await prisma.workspace.findUnique({
    where: { id: access.workspaceId },
    include: {
      people: {
        orderBy: [{ createdAt: "asc" }]
      },
      payRuns: {
        where: {
          periodStart: {
            gte: range.start,
            lt: range.exclusiveEnd
          }
        },
        orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
        include: {
          person: true,
          lineItems: {
            orderBy: [{ createdAt: "asc" }]
          }
        }
      },
      payrollSubmissions: {
        orderBy: [{ createdAt: "desc" }],
        take: 20
      },
      payrollAuditEvents: {
        orderBy: [{ createdAt: "desc" }],
        take: 30
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
    employees: workspace.people.map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email ?? "",
      role: person.personType === "ACCOUNTANT" ? "accountant" : person.personType === "DIRECTOR" ? "director" : "employee",
      payrollEnabled: person.payrollEnabled,
      payrollBasis: person.payrollBasis ? (person.payrollBasis === "SALARY" ? "salary" : "hourly") : undefined,
      hourlyRateCents: person.hourlyRateCents ?? undefined,
      salaryPerPayPeriodCents: person.salaryPerPayPeriodCents ?? undefined,
      ordinaryHoursPerPayPeriod: person.ordinaryHoursPerPayPeriod ?? undefined,
      superRateBps: person.superRateBps ?? undefined,
      tfnLast4: person.tfnLast4 ?? undefined,
      employmentStartDate: person.employmentStartDate?.toISOString().slice(0, 10),
      employmentEndDate: person.employmentEndDate?.toISOString().slice(0, 10),
      bankAccountName: person.bankAccountName ?? undefined,
      bankAccountBsb: person.bankAccountBsb ?? undefined,
      bankAccountNumber: person.bankAccountNumber ?? undefined,
      notes: person.notes ?? undefined,
      active: person.active,
      employmentStatus: person.active ? "active" : "inactive"
    })),
    payRuns: workspace.payRuns.map((payRun) => ({
      id: payRun.id,
      workspaceId: payRun.workspaceId,
      personId: payRun.personId ?? undefined,
      employeeName: payRun.employeeName,
      periodStart: payRun.periodStart.toISOString().slice(0, 10),
      periodEnd: payRun.periodEnd.toISOString().slice(0, 10),
      payDate: payRun.payDate.toISOString().slice(0, 10),
      grossCents: payRun.grossCents,
      reimbursementsCents: payRun.reimbursementsCents,
      paygCents: payRun.paygCents,
      superCents: payRun.superCents,
      finalized: payRun.finalized,
      status: payRun.status.toLowerCase() as PayRun["status"],
      submissionStatus: payRun.submissionStatus.toLowerCase() as PayRun["submissionStatus"],
      submissionReference: payRun.submissionReference ?? undefined,
      correctsPayRunId: payRun.correctsPayRunId ?? undefined,
      reversedByPayRunId: payRun.reversedByPayRunId ?? undefined,
      overrideReason: payRun.overrideReason ?? undefined,
      notes: payRun.notes ?? undefined,
      lineItems: payRun.lineItems.map((lineItem) => ({
        id: lineItem.id,
        kind: lineItem.kind.toLowerCase() as "salary" | "hourly" | "allowance" | "reimbursement" | "deduction",
        description: lineItem.description,
        quantityHours: lineItem.quantityHours ?? undefined,
        rateCents: lineItem.rateCents ?? undefined,
        amountCents: lineItem.amountCents
      }))
    })),
    submissions: workspace.payrollSubmissions.map((submission) => ({
      id: submission.id,
      workspaceId: submission.workspaceId,
      payRunId: submission.payRunId ?? undefined,
      type: submission.type.toLowerCase() as PayrollSubmissionRow["type"],
      status: submission.status.toLowerCase() as PayrollSubmissionRow["status"],
      payloadJson: submission.payloadJson,
      responseJson: submission.responseJson ?? undefined,
      errorMessage: submission.errorMessage ?? undefined,
      externalReference: submission.externalReference ?? undefined,
      submittedAt: submission.submittedAt?.toISOString(),
      createdAt: submission.createdAt.toISOString()
    })),
    auditEvents: workspace.payrollAuditEvents.map((event) => ({
      id: event.id,
      workspaceId: event.workspaceId,
      payRunId: event.payRunId ?? undefined,
      personId: event.personId ?? undefined,
      action: event.action,
      detail: event.detail ?? undefined,
      createdByUserId: event.createdByUserId ?? undefined,
      createdAt: event.createdAt.toISOString()
    }))
  };
}
