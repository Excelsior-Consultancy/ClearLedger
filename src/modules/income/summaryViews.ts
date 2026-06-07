import type { InvoiceRecordRow } from "@/modules/income/invoiceRecords";
import type { Cents } from "@/modules/shared/money";
import { sumMoney } from "@/modules/shared/money";

export type IncomeSummarySourceRecord = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  personName: string;
  grossCents: Cents;
  gstCents: Cents;
  netCents: Cents;
  paymentState: InvoiceRecordRow["paymentState"];
};

export type IncomeSummaryBucket = {
  label: string;
  grossCents: Cents;
  gstCents: Cents;
  netCents: Cents;
  invoiceCount: number;
  sourceRecords: IncomeSummarySourceRecord[];
};

export type IncomeSummaryViews = {
  quarter: IncomeSummaryBucket;
  byMonth: IncomeSummaryBucket[];
  byClient: IncomeSummaryBucket[];
  byPerson: IncomeSummaryBucket[];
  sourceRecords: IncomeSummarySourceRecord[];
};

export function buildIncomeSummaryViews(rows: InvoiceRecordRow[], quarterLabel: string): IncomeSummaryViews {
  const sourceRecords = rows.map(toSourceRecord);

  return {
    quarter: buildBucket(quarterLabel, sourceRecords),
    byMonth: buildBuckets(rows, (row) => monthLabel(row.issueDate)),
    byClient: buildBuckets(rows, (row) => row.clientName),
    byPerson: buildBuckets(rows, (row) => row.personName?.trim() || "Unassigned"),
    sourceRecords
  };
}

function buildBuckets(
  rows: InvoiceRecordRow[],
  labelForRow: (row: InvoiceRecordRow) => string
): IncomeSummaryBucket[] {
  const bucketMap = new Map<string, IncomeSummarySourceRecord[]>();

  for (const row of rows) {
    const label = labelForRow(row);
    const sourceRecord = toSourceRecord(row);
    const current = bucketMap.get(label) ?? [];
    bucketMap.set(label, [...current, sourceRecord]);
  }

  return [...bucketMap.entries()]
    .map(([label, sourceRecords]) => buildBucket(label, sourceRecords))
    .sort((a, b) => b.grossCents - a.grossCents || a.label.localeCompare(b.label));
}

function buildBucket(label: string, sourceRecords: IncomeSummarySourceRecord[]): IncomeSummaryBucket {
  return {
    label,
    grossCents: sumMoney(sourceRecords.map((record) => record.grossCents)),
    gstCents: sumMoney(sourceRecords.map((record) => record.gstCents)),
    netCents: sumMoney(sourceRecords.map((record) => record.netCents)),
    invoiceCount: sourceRecords.length,
    sourceRecords
  };
}

function toSourceRecord(row: InvoiceRecordRow): IncomeSummarySourceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate,
    clientName: row.clientName,
    personName: row.personName?.trim() || "Unassigned",
    grossCents: row.grossCents,
    gstCents: row.gstCents,
    netCents: row.netCents,
    paymentState: row.paymentState
  };
}

function monthLabel(issueDate: string): string {
  const date = new Date(`${issueDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
