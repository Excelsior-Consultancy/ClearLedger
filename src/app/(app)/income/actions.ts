"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvoiceStatus, GstTreatment } from "@prisma/client";
import { canEditCompany, getWorkspaceAccess } from "@/modules/auth/service";
import { prisma } from "@/modules/db/prisma";
import { quarterStartForDate, toIsoDate } from "@/modules/shared/quarter";

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

function parseDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date;
}

function redirectToIncome(quarterId: string, saved?: string, invoiceId?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("quarterId", quarterId);
  if (saved) searchParams.set("saved", saved);
  if (invoiceId) searchParams.set("invoiceId", invoiceId);
  redirect(`/income?${searchParams.toString()}`);
}

async function getQuarterIdForDate(workspaceId: string, date: Date) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { financialYearStartMonth: true }
  });

  const fiscalYearStartMonth = workspace?.financialYearStartMonth ?? 7;
  return toIsoDate(quarterStartForDate(date, fiscalYearStartMonth));
}

export async function addClient(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/income?error=permission");
  }

  const name = text(formData, "name");
  if (!name) {
    throw new Error("Client name is required.");
  }

  const client = await prisma.client.create({
    data: {
      workspaceId: access.workspaceId,
      name,
      email: text(formData, "email") || null,
      abn: text(formData, "abn") || null,
      billingAddress: text(formData, "billingAddress") || null,
      notes: text(formData, "notes") || null
    }
  });

  revalidatePath("/");
  revalidatePath("/income");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  const quarterId = text(formData, "quarterId") || (await getQuarterIdForDate(access.workspaceId, new Date()));
  redirectToIncome(quarterId, "client-created", client.id);
}

export async function createInvoice(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/income?error=permission");
  }

  const issueDate = parseDate(text(formData, "issueDate"), "Issue date");
  const dueDate = parseDate(text(formData, "dueDate"), "Due date");
  const clientId = text(formData, "clientId");
  const invoiceNumber = text(formData, "invoiceNumber");
  const grossCents = parseMoney(formData, "grossAmount");

  if (!invoiceNumber) {
    throw new Error("Invoice number is required.");
  }
  if (grossCents <= 0) {
    throw new Error("Invoice amount must be greater than $0.");
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: access.workspaceId }
  });
  if (!client) {
    throw new Error("Client not found in this company.");
  }

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: access.workspaceId,
      clientId,
      invoiceNumber,
      issueDate,
      dueDate,
      status: InvoiceStatus.ISSUED,
      grossCents,
      gstTreatment: text(formData, "gstTreatment") as GstTreatment,
      evidenceUrl: text(formData, "evidenceUrl") || null,
      notes: text(formData, "notes") || null
    }
  });

  const quarterId = await getQuarterIdForDate(access.workspaceId, issueDate);

  revalidatePath("/");
  revalidatePath("/income");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToIncome(quarterId, "invoice-created", invoice.id);
}

export async function recordInvoicePayment(formData: FormData) {
  const access = await getWorkspaceAccess();
  if (!canEditCompany(access.role)) {
    redirect("/income?error=permission");
  }

  const invoiceId = text(formData, "invoiceId");
  const paymentState = text(formData, "paymentState");
  const paymentDateRaw = text(formData, "paymentDate");
  const paymentDate = paymentDateRaw ? parseDate(paymentDateRaw, "Payment date") : new Date();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: access.workspaceId }
  });
  if (!invoice) {
    throw new Error("Invoice not found in this company.");
  }

  const status =
    paymentState === "paid"
      ? InvoiceStatus.PAID
      : paymentState === "partial"
        ? InvoiceStatus.PARTIALLY_PAID
        : InvoiceStatus.ISSUED;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status,
      paymentDate: status === InvoiceStatus.ISSUED ? null : paymentDate
    }
  });

  const quarterId = await getQuarterIdForDate(access.workspaceId, invoice.issueDate);

  revalidatePath("/");
  revalidatePath("/income");
  revalidatePath("/bas");
  revalidatePath("/ca-pack");
  redirectToIncome(
    text(formData, "quarterId") || quarterId,
    status === InvoiceStatus.PAID ? "invoice-paid" : status === InvoiceStatus.PARTIALLY_PAID ? "invoice-partial" : "invoice-updated",
    invoice.id
  );
}
