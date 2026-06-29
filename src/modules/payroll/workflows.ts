import { prisma } from "@/modules/db/prisma";
import { calculatePayRunGrossCents, enrichPayRun } from "./summary";
import type { Cents } from "@/modules/shared/money";

export type DraftPayrollInput = {
  workspaceId: string;
  personId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  hoursWorked?: number;
  reimbursementsCents?: Cents;
  paygCents?: Cents;
  superCents?: Cents;
  notes?: string;
  overrideReason?: string;
};

function parseDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date;
}

function buildLineItemsFromPerson(input: {
  person: {
    payrollBasis: "SALARY" | "HOURLY" | null;
    salaryPerPayPeriodCents: number | null;
    hourlyRateCents: number | null;
  };
  hoursWorked?: number;
}) {
  if (input.person.payrollBasis === "SALARY") {
    if (!input.person.salaryPerPayPeriodCents) {
      throw new Error("Salary employees need a salary amount before a pay run can be created.");
    }

    return [
      {
        kind: "salary" as const,
        description: "Salary",
        amountCents: input.person.salaryPerPayPeriodCents
      }
    ];
  }

  if (input.person.payrollBasis === "HOURLY") {
    if (!input.person.hourlyRateCents) {
      throw new Error("Hourly employees need an hourly rate before a pay run can be created.");
    }
    if (typeof input.hoursWorked !== "number" || input.hoursWorked <= 0) {
      throw new Error("Hourly employees need hours worked for the pay run.");
    }

    return [
      {
        kind: "hourly" as const,
        description: `${input.hoursWorked} hours`,
        quantityHours: input.hoursWorked,
        rateCents: input.person.hourlyRateCents,
        amountCents: Math.round(input.person.hourlyRateCents * input.hoursWorked)
      }
    ];
  }

  throw new Error("Employee payroll basis must be configured before creating a pay run.");
}

export function buildTestSubmissionPayload(payRun: {
  id: string;
  workspaceId: string;
  personId?: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  grossCents: Cents;
  reimbursementsCents: Cents;
  paygCents: Cents;
  superCents: Cents;
  status?: string;
  submissionStatus?: string;
  lineItems?: Array<{
    kind: string;
    description: string;
    quantityHours?: number;
    rateCents?: Cents;
    amountCents: Cents;
  }>;
}) {
  return {
    mode: "non-prod-test",
    type: "STP_PAY_EVENT",
    payRunId: payRun.id,
    workspaceId: payRun.workspaceId,
    personId: payRun.personId ?? null,
    employeeName: payRun.employeeName,
    periodStart: payRun.periodStart,
    periodEnd: payRun.periodEnd,
    payDate: payRun.payDate,
    grossCents: payRun.grossCents,
    reimbursementsCents: payRun.reimbursementsCents,
    paygCents: payRun.paygCents,
    superCents: payRun.superCents,
    status: payRun.status ?? "draft",
    submissionStatus: payRun.submissionStatus ?? "draft",
    lineItems: payRun.lineItems ?? []
  };
}

export async function createDraftPayrollPayRun(input: DraftPayrollInput) {
  const person = await prisma.person.findFirst({
    where: { id: input.personId, workspaceId: input.workspaceId },
    select: {
      id: true,
      name: true,
      payrollEnabled: true,
      payrollBasis: true,
      salaryPerPayPeriodCents: true,
      hourlyRateCents: true,
      superRateBps: true,
      active: true
    }
  });

  if (!person) {
    throw new Error("Employee not found in this company.");
  }
  if (!person.active || !person.payrollEnabled) {
    throw new Error("Employee must be active and payroll-enabled before creating a pay run.");
  }

  const lineItems = buildLineItemsFromPerson({
    person: {
      payrollBasis: person.payrollBasis,
      salaryPerPayPeriodCents: person.salaryPerPayPeriodCents,
      hourlyRateCents: person.hourlyRateCents
    },
    hoursWorked: input.hoursWorked
  });

  const grossCents = calculatePayRunGrossCents({
    id: "preview",
    workspaceId: input.workspaceId,
    personId: person.id,
    employeeName: person.name,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    payDate: input.payDate,
    grossCents: 0,
    reimbursementsCents: input.reimbursementsCents ?? 0,
    paygCents: input.paygCents ?? 0,
    superCents: input.superCents ?? 0,
    finalized: false,
    status: "draft",
    submissionStatus: "draft",
    lineItems
  });

  const autoCalculatedSuperCents = Math.round(grossCents * (person.superRateBps ?? 1100) / 10000);
  const superCents =
    typeof input.superCents === "number" && input.superCents > 0 ? input.superCents : autoCalculatedSuperCents;

  const payRun = await prisma.payRun.create({
    data: {
      workspaceId: input.workspaceId,
      personId: person.id,
      employeeName: person.name,
      periodStart: parseDate(input.periodStart, "Pay period start"),
      periodEnd: parseDate(input.periodEnd, "Pay period end"),
      payDate: parseDate(input.payDate, "Pay date"),
      grossCents,
      reimbursementsCents: input.reimbursementsCents ?? 0,
      paygCents: input.paygCents ?? 0,
      superCents,
      finalized: false,
      status: "DRAFT",
      submissionStatus: "DRAFT",
      overrideReason: input.overrideReason || null,
      notes: input.notes || null,
      lineItems: {
        create: lineItems.map((lineItem) => ({
          ...lineItem,
          kind: lineItem.kind.toUpperCase() as "SALARY" | "HOURLY" | "ALLOWANCE" | "REIMBURSEMENT" | "DEDUCTION"
        }))
      }
    },
    include: {
      lineItems: true
    }
  });

  await prisma.payrollAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      payRunId: payRun.id,
      personId: person.id,
      action: "create_pay_run",
      detail: `Draft pay run created for ${person.name}`
    }
  });

  return payRun;
}

export async function updatePayrollPayRun(input: {
  workspaceId: string;
  payRunId: string;
  payDate: string;
  grossCents: Cents;
  reimbursementsCents?: Cents;
  paygCents?: Cents;
  superCents?: Cents;
  notes?: string;
  overrideReason?: string;
}) {
  const payRun = await prisma.payRun.findFirst({
    where: { id: input.payRunId, workspaceId: input.workspaceId },
    include: { lineItems: true }
  });

  if (!payRun) {
    throw new Error("Pay run not found.");
  }
  if (payRun.finalized || payRun.status === "FINALIZED" || payRun.status === "CORRECTED" || payRun.status === "REVERSED") {
    throw new Error("Finalized pay runs must be corrected instead of edited.");
  }

  const lineItem = payRun.lineItems[0];
  const updatedGrossCents = input.grossCents;
  const updatedLineItems: Array<{
    kind: "salary" | "hourly" | "allowance" | "reimbursement" | "deduction";
    description: string;
    quantityHours?: number | null;
    rateCents?: number | null;
    amountCents: number;
  }> = lineItem
    ? [
        {
          kind: lineItem.kind.toLowerCase() as "salary" | "hourly" | "allowance" | "reimbursement" | "deduction",
          description: lineItem.description,
          quantityHours: lineItem.quantityHours,
          rateCents: lineItem.rateCents,
          amountCents: updatedGrossCents
        }
      ]
    : [
        {
          kind: "salary",
          description: "Adjusted pay",
          amountCents: updatedGrossCents
        }
      ];

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payRun.update({
      where: { id: payRun.id },
      data: {
        payDate: parseDate(input.payDate, "Pay date"),
        grossCents: updatedGrossCents,
        reimbursementsCents: input.reimbursementsCents ?? payRun.reimbursementsCents,
        paygCents: input.paygCents ?? payRun.paygCents,
        superCents: input.superCents ?? payRun.superCents,
        notes: input.notes ?? payRun.notes,
        overrideReason: input.overrideReason ?? payRun.overrideReason,
        status: "DRAFT",
        submissionStatus: "DRAFT"
      }
    });

    await tx.payrollLineItem.deleteMany({
      where: { payRunId: payRun.id }
    });

    await tx.payRun.update({
      where: { id: payRun.id },
      data: {
        lineItems: {
          create: updatedLineItems.map((item) => ({
            kind: item.kind.toUpperCase() as "SALARY" | "HOURLY" | "ALLOWANCE" | "REIMBURSEMENT" | "DEDUCTION",
            description: item.description,
            quantityHours: item.quantityHours ?? null,
            rateCents: item.rateCents ?? null,
            amountCents: item.amountCents
          }))
        }
      }
    });

    await tx.payrollAuditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        payRunId: payRun.id,
        personId: payRun.personId ?? null,
        action: "update_pay_run",
        detail: `Pay run updated for ${payRun.employeeName}`
      }
    });

    return tx.payRun.findFirstOrThrow({
      where: { id: payRun.id },
      include: { lineItems: true }
    });
  });

  return updated;
}

export async function markPayrollPayRunReady(input: { workspaceId: string; payRunId: string }) {
  const payRun = await prisma.payRun.findFirst({
    where: { id: input.payRunId, workspaceId: input.workspaceId }
  });

  if (!payRun) {
    throw new Error("Pay run not found.");
  }
  if (payRun.status !== "DRAFT") {
    throw new Error("Only draft pay runs can be moved to review.");
  }

  const updated = await prisma.payRun.update({
    where: { id: payRun.id },
    data: {
      status: "READY_FOR_REVIEW",
      submissionStatus: "VALIDATED"
    }
  });

  await prisma.payrollAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      payRunId: payRun.id,
      personId: payRun.personId ?? null,
      action: "mark_ready_for_review",
      detail: `Pay run marked ready for review for ${payRun.employeeName}`
    }
  });

  return updated;
}

export async function finalizePayrollPayRun(input: { workspaceId: string; payRunId: string }) {
  const payRun = await prisma.payRun.findFirst({
    where: { id: input.payRunId, workspaceId: input.workspaceId },
    include: {
      lineItems: true
    }
  });

  if (!payRun) {
    throw new Error("Pay run not found.");
  }

  const validated = enrichPayRun({
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
    status: payRun.status.toLowerCase() as "draft" | "ready_for_review" | "finalized" | "corrected" | "reversed",
    submissionStatus: payRun.submissionStatus.toLowerCase() as "draft" | "validated" | "queued" | "sent" | "accepted" | "rejected",
    overrideReason: payRun.overrideReason ?? undefined,
    notes: payRun.notes ?? undefined,
    lineItems: payRun.lineItems.map((lineItem) => ({
      kind: lineItem.kind.toLowerCase() as "salary" | "hourly" | "allowance" | "reimbursement" | "deduction",
      description: lineItem.description,
      quantityHours: lineItem.quantityHours ?? undefined,
      rateCents: lineItem.rateCents ?? undefined,
      amountCents: lineItem.amountCents
    }))
  });

  const blocker = validated.issues.find((issue) => issue.severity === "blocker");
  if (blocker) {
    throw new Error(blocker.message);
  }

  const updated = await prisma.payRun.update({
    where: { id: payRun.id },
    data: {
      finalized: true,
      status: "FINALIZED",
      submissionStatus: "VALIDATED"
    }
  });

  if (payRun.correctsPayRunId) {
    await prisma.payRun.update({
      where: { id: payRun.correctsPayRunId },
      data: {
        status: "CORRECTED"
      }
    });
  }

  await prisma.payrollAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      payRunId: payRun.id,
      personId: payRun.personId ?? null,
      action: "finalize_pay_run",
      detail: `Pay run finalized for ${payRun.employeeName}`
    }
  });

  return updated;
}

export async function createPayrollCorrection(input: { workspaceId: string; payRunId: string; reason?: string }) {
  const payRun = await prisma.payRun.findFirst({
    where: { id: input.payRunId, workspaceId: input.workspaceId },
    include: { lineItems: true }
  });

  if (!payRun) {
    throw new Error("Pay run not found.");
  }

  const correction = await prisma.payRun.create({
    data: {
      workspaceId: input.workspaceId,
      personId: payRun.personId,
      employeeName: payRun.employeeName,
      periodStart: payRun.periodStart,
      periodEnd: payRun.periodEnd,
      payDate: payRun.payDate,
      grossCents: payRun.grossCents,
      reimbursementsCents: payRun.reimbursementsCents,
      paygCents: payRun.paygCents,
      superCents: payRun.superCents,
      finalized: false,
      status: "DRAFT",
      submissionStatus: "DRAFT",
      correctsPayRunId: payRun.id,
      overrideReason: input.reason ?? `Correction for ${payRun.employeeName}`,
      notes: payRun.notes,
      lineItems: {
        create: payRun.lineItems.map((lineItem) => ({
          kind: lineItem.kind,
          description: lineItem.description,
          quantityHours: lineItem.quantityHours,
          rateCents: lineItem.rateCents,
          amountCents: lineItem.amountCents
        }))
      }
    },
    include: {
      lineItems: true
    }
  });

  await prisma.payRun.update({
    where: { id: payRun.id },
    data: {
      status: "CORRECTED"
    }
  });

  await prisma.payrollAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      payRunId: correction.id,
      personId: payRun.personId ?? null,
      action: "create_correction",
      detail: `Correction draft created for ${payRun.employeeName}`
    }
  });

  return correction;
}

export async function createPayrollReversal(input: { workspaceId: string; payRunId: string; reason?: string }) {
  const payRun = await prisma.payRun.findFirst({
    where: { id: input.payRunId, workspaceId: input.workspaceId },
    include: { lineItems: true }
  });

  if (!payRun) {
    throw new Error("Pay run not found.");
  }

  const reversal = await prisma.payRun.create({
    data: {
      workspaceId: input.workspaceId,
      personId: payRun.personId,
      employeeName: `${payRun.employeeName} reversal`,
      periodStart: payRun.periodStart,
      periodEnd: payRun.periodEnd,
      payDate: payRun.payDate,
      grossCents: payRun.grossCents,
      reimbursementsCents: payRun.reimbursementsCents,
      paygCents: payRun.paygCents,
      superCents: payRun.superCents,
      finalized: true,
      status: "REVERSED",
      submissionStatus: "DRAFT",
      reversedByPayRunId: payRun.id,
      overrideReason: input.reason ?? `Reversal for ${payRun.employeeName}`,
      notes: payRun.notes,
      lineItems: {
        create: payRun.lineItems.map((lineItem) => ({
          kind: lineItem.kind,
          description: lineItem.description,
          quantityHours: lineItem.quantityHours,
          rateCents: lineItem.rateCents,
          amountCents: lineItem.amountCents
        }))
      }
    },
    include: {
      lineItems: true
    }
  });

  await prisma.payRun.update({
    where: { id: payRun.id },
    data: {
      status: "REVERSED",
      reversedByPayRunId: reversal.id
    }
  });

  await prisma.payrollAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      payRunId: reversal.id,
      personId: payRun.personId ?? null,
      action: "create_reversal",
      detail: `Reversal created for ${payRun.employeeName}`
    }
  });

  return reversal;
}

export async function createTestPayrollSubmission(input: { workspaceId: string; payRunId: string }) {
  const payRun = await prisma.payRun.findFirst({
    where: { id: input.payRunId, workspaceId: input.workspaceId },
    include: {
      lineItems: true
    }
  });

  if (!payRun) {
    throw new Error("Pay run not found.");
  }
  if (!payRun.finalized || payRun.status !== "FINALIZED") {
    throw new Error("Finalize the pay run before creating a submission.");
  }

  const payload = buildTestSubmissionPayload({
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
    status: payRun.status.toLowerCase(),
    submissionStatus: payRun.submissionStatus.toLowerCase(),
    lineItems: payRun.lineItems.map((lineItem) => ({
      kind: lineItem.kind.toLowerCase(),
      description: lineItem.description,
      quantityHours: lineItem.quantityHours ?? undefined,
      rateCents: lineItem.rateCents ?? undefined,
      amountCents: lineItem.amountCents
    }))
  });

  const submission = await prisma.payrollSubmission.create({
    data: {
      workspaceId: input.workspaceId,
      payRunId: payRun.id,
      type: "STP_PAY_EVENT",
      status: "ACCEPTED",
      payloadJson: payload,
      responseJson: {
        message: "Test environment accepted the payload."
      },
      externalReference: `test-${payRun.id}`,
      submittedAt: new Date()
    }
  });

  await prisma.payRun.update({
    where: { id: payRun.id },
    data: {
      submissionStatus: "ACCEPTED",
      submissionReference: submission.externalReference
    }
  });

  await prisma.payrollAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      payRunId: payRun.id,
      personId: payRun.personId ?? null,
      action: "submit_test_stp",
      detail: `Non-prod submission stored for ${payRun.employeeName}`
    }
  });

  return submission;
}
