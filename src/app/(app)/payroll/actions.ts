"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";
import { assertQuarterEditable } from "@/modules/shared/quarterGuard";
import { quarterStartForDate, toIsoDate } from "@/modules/shared/quarter";
import {
  createPayrollCorrection,
  createPayrollReversal,
  createDraftPayrollPayRun,
  createTestPayrollSubmission,
  finalizePayrollPayRun,
  markPayrollPayRunReady,
  updatePayrollPayRun
} from "@/modules/payroll/workflows";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parseMoney(formData: FormData, key: string): number {
  const raw = text(formData, key);
  if (!raw) return 0;
  const normalized = raw.replaceAll(",", "").replace("$", "");
  const dollars = Number(normalized);
  if (!Number.isFinite(dollars)) {
    return 0;
  }
  return Math.round(dollars * 100);
}

function parseNumber(formData: FormData, key: string): number | undefined {
  const raw = text(formData, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

async function getQuarterIdForPayRun(workspaceId: string, periodStart: Date) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { financialYearStartMonth: true }
  });

  const fiscalYearStartMonth = workspace?.financialYearStartMonth ?? 7;
  return toIsoDate(quarterStartForDate(periodStart, fiscalYearStartMonth));
}

function redirectToPayroll(params: { quarterId: string; payRunId?: string; saved?: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("quarterId", params.quarterId);
  if (params.payRunId) {
    searchParams.set("payRunId", params.payRunId);
  }
  if (params.saved) {
    searchParams.set("saved", params.saved);
  }
  redirect(`/payroll?${searchParams.toString()}`);
}

export async function addPayRun(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/payroll?error=permission");
  }
  await assertQuarterEditable(access.workspaceId);

  const result = await createDraftPayrollPayRun({
    workspaceId: access.workspaceId,
    personId: text(formData, "personId"),
    periodStart: text(formData, "periodStart"),
    periodEnd: text(formData, "periodEnd"),
    payDate: text(formData, "payDate"),
    hoursWorked: parseNumber(formData, "hoursWorked"),
    reimbursementsCents: parseMoney(formData, "reimbursementsAmount"),
    paygCents: parseMoney(formData, "paygAmount"),
    superCents: parseMoney(formData, "superAmount"),
    notes: text(formData, "notes") || undefined,
    overrideReason: text(formData, "overrideReason") || undefined
  });

  const quarterId = await getQuarterIdForPayRun(access.workspaceId, result.periodStart);
  revalidatePath("/");
  revalidatePath("/payroll");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToPayroll({ quarterId, payRunId: result.id, saved: result.id });
}

export async function finalizePayRun(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/payroll?error=permission");
  }
  await assertQuarterEditable(access.workspaceId);

  const payRunId = text(formData, "payRunId");
  const payRun = await finalizePayrollPayRun({
    workspaceId: access.workspaceId,
    payRunId
  });

  const quarterId = await getQuarterIdForPayRun(access.workspaceId, payRun.periodStart);

  revalidatePath("/");
  revalidatePath("/payroll");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToPayroll({ quarterId, payRunId, saved: "finalized" });
}

export async function updatePayRun(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/payroll?error=permission");
  }
  await assertQuarterEditable(access.workspaceId);

  const payRunId = text(formData, "payRunId");
  const result = await updatePayrollPayRun({
    workspaceId: access.workspaceId,
    payRunId,
    payDate: text(formData, "payDate"),
    grossCents: parseMoney(formData, "grossAmount"),
    reimbursementsCents: parseMoney(formData, "reimbursementsAmount"),
    paygCents: parseMoney(formData, "paygAmount"),
    superCents: parseMoney(formData, "superAmount"),
    notes: text(formData, "notes") || undefined,
    overrideReason: text(formData, "overrideReason") || undefined
  });

  const quarterId = await getQuarterIdForPayRun(access.workspaceId, result.periodStart);

  revalidatePath("/");
  revalidatePath("/payroll");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToPayroll({ quarterId, payRunId, saved: "updated" });
}

export async function markReadyForReview(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/payroll?error=permission");
  }
  await assertQuarterEditable(access.workspaceId);

  const payRunId = text(formData, "payRunId");
  const result = await markPayrollPayRunReady({
    workspaceId: access.workspaceId,
    payRunId
  });

  const quarterId = await getQuarterIdForPayRun(access.workspaceId, result.periodStart);

  revalidatePath("/");
  revalidatePath("/payroll");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToPayroll({ quarterId, payRunId, saved: "ready" });
}

export async function createCorrection(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/payroll?error=permission");
  }
  await assertQuarterEditable(access.workspaceId);

  const payRunId = text(formData, "payRunId");
  const result = await createPayrollCorrection({
    workspaceId: access.workspaceId,
    payRunId,
    reason: text(formData, "reason") || undefined
  });

  const quarterId = await getQuarterIdForPayRun(access.workspaceId, result.periodStart);

  revalidatePath("/");
  revalidatePath("/payroll");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToPayroll({ quarterId, payRunId: result.id, saved: "correction" });
}

export async function createReversal(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/payroll?error=permission");
  }
  await assertQuarterEditable(access.workspaceId);

  const payRunId = text(formData, "payRunId");
  const result = await createPayrollReversal({
    workspaceId: access.workspaceId,
    payRunId,
    reason: text(formData, "reason") || undefined
  });

  const quarterId = await getQuarterIdForPayRun(access.workspaceId, result.periodStart);

  revalidatePath("/");
  revalidatePath("/payroll");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToPayroll({ quarterId, payRunId: result.id, saved: "reversal" });
}

export async function submitTestPayroll(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/payroll?error=permission");
  }

  const payRunId = text(formData, "payRunId");
  await createTestPayrollSubmission({
    workspaceId: access.workspaceId,
    payRunId
  });

  const payRun = await prisma.payRun.findFirst({
    where: { id: payRunId, workspaceId: access.workspaceId },
    select: { periodStart: true }
  });
  const quarterId = payRun ? await getQuarterIdForPayRun(access.workspaceId, payRun.periodStart) : undefined;

  revalidatePath("/");
  revalidatePath("/payroll");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  if (quarterId) {
    redirectToPayroll({ quarterId, payRunId, saved: "submitted" });
  }
  redirect("/payroll?saved=submitted");
}
