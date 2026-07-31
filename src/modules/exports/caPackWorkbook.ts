import * as XLSX from "xlsx";
import type { Cents } from "@/modules/shared/money";

export type CaPackWorkbookCategoryTotal = {
  categoryId: string;
  categoryName: string;
  grossCents: Cents;
  gstCents: Cents;
  netCents: Cents;
};

export type CaPackWorkbookQuarterInput = {
  id: string;
  label: string;
  income: { grossCents: Cents; gstCents: Cents; netCents: Cents };
  expenseCategories: CaPackWorkbookCategoryTotal[];
  netGstCents: Cents;
  paygWithholdingCents: Cents;
  wagesCents: Cents;
  superCents: Cents;
  blockers: string[];
  warnings: string[];
};

export type CaPackWorkbookInput = {
  workspaceName: string;
  financialYearLabel: string;
  generatedAt: Date;
  activeExpenseCategories: Array<{ id: string; name: string }>;
  quarters: CaPackWorkbookQuarterInput[];
};

type SheetCell = string | number | null;
type SheetRow = SheetCell[];

function toDollars(cents: Cents): number {
  return Math.round(cents) / 100;
}

function setCell(row: SheetRow, col: number, value: SheetCell) {
  while (row.length < col) {
    row.push(null);
  }
  row[col] = value;
}

function quarterColStart(quarterIndex: number): number {
  return 1 + quarterIndex * 4; // col 0 = row label; each quarter block is 3 cols + 1 spacer
}

function writeQuarterTriplet(
  row: SheetRow,
  quarterIndex: number,
  grossCents: Cents,
  gstCents: Cents,
  netCents: Cents
) {
  const start = quarterColStart(quarterIndex);
  setCell(row, start, toDollars(grossCents));
  setCell(row, start + 1, toDollars(gstCents));
  setCell(row, start + 2, toDollars(netCents));
}

function writeQuarterSingle(row: SheetRow, quarterIndex: number, subColumn: 0 | 1, valueCents: Cents) {
  const start = quarterColStart(quarterIndex);
  setCell(row, start + subColumn, toDollars(valueCents));
}

function buildBasCalcSheet(input: CaPackWorkbookInput): XLSX.WorkSheet {
  const rows: SheetRow[] = [];
  const merges: XLSX.Range[] = [];

  rows.push([`ClearLedger CA Pack — ${input.workspaceName} — ${input.financialYearLabel}`]);
  rows.push([`Generated ${input.generatedAt.toISOString().slice(0, 10)}`]);
  rows.push([]);

  const headerRow: SheetRow = [null];
  const subHeaderRow: SheetRow = [null];
  input.quarters.forEach((quarter, index) => {
    const start = quarterColStart(index);
    setCell(headerRow, start, quarter.label);
    setCell(subHeaderRow, start, "Gross");
    setCell(subHeaderRow, start + 1, "GST");
    setCell(subHeaderRow, start + 2, "Net");
    merges.push({ s: { r: 3, c: start }, e: { r: 3, c: start + 2 } });
  });
  rows.push(headerRow);
  rows.push(subHeaderRow);

  const totalIncomeRow: SheetRow = ["Total Income"];
  input.quarters.forEach((quarter, index) => {
    writeQuarterTriplet(totalIncomeRow, index, quarter.income.grossCents, quarter.income.gstCents, quarter.income.netCents);
  });
  rows.push(totalIncomeRow);

  rows.push([]);
  rows.push(["Expenses"]);

  const categoryNameById = new Map<string, string>();
  input.activeExpenseCategories.forEach((category) => categoryNameById.set(category.id, category.name));
  input.quarters.forEach((quarter) => {
    quarter.expenseCategories.forEach((total) => {
      if (!categoryNameById.has(total.categoryId)) {
        categoryNameById.set(total.categoryId, total.categoryName);
      }
    });
  });

  const sortedCategoryIds = Array.from(categoryNameById.keys()).sort((left, right) =>
    (categoryNameById.get(left) ?? "").localeCompare(categoryNameById.get(right) ?? "")
  );

  const totalExpenseGross = input.quarters.map(() => 0);
  const totalExpenseGst = input.quarters.map(() => 0);
  const totalExpenseNet = input.quarters.map(() => 0);

  sortedCategoryIds.forEach((categoryId) => {
    const row: SheetRow = [categoryNameById.get(categoryId) ?? categoryId];
    input.quarters.forEach((quarter, index) => {
      const total = quarter.expenseCategories.find((entry) => entry.categoryId === categoryId);
      const gross = total?.grossCents ?? 0;
      const gst = total?.gstCents ?? 0;
      const net = total?.netCents ?? 0;
      totalExpenseGross[index] += gross;
      totalExpenseGst[index] += gst;
      totalExpenseNet[index] += net;
      writeQuarterTriplet(row, index, gross, gst, net);
    });
    rows.push(row);
  });

  const totalExpensesRow: SheetRow = ["Total Expenses"];
  input.quarters.forEach((_, index) => {
    writeQuarterTriplet(totalExpensesRow, index, totalExpenseGross[index], totalExpenseGst[index], totalExpenseNet[index]);
  });
  rows.push(totalExpensesRow);

  rows.push([]);

  const netGstRow: SheetRow = ["Net GST"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(netGstRow, index, 1, quarter.netGstCents));
  rows.push(netGstRow);

  const paygRow: SheetRow = ["PAYG withholding (W2)"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(paygRow, index, 0, quarter.paygWithholdingCents));
  rows.push(paygRow);

  const wagesRow: SheetRow = ["Wages (W1)"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(wagesRow, index, 0, quarter.wagesCents));
  rows.push(wagesRow);

  const superRow: SheetRow = ["Superannuation"];
  input.quarters.forEach((quarter, index) => writeQuarterSingle(superRow, index, 0, quarter.superCents));
  rows.push(superRow);
  rows.push(["Superannuation is tracked separately for reporting and is not a BAS label."]);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = merges;
  return sheet;
}

function buildExceptionsSheet(input: CaPackWorkbookInput): XLSX.WorkSheet {
  const rows: SheetRow[] = [["Quarter", "Blockers", "Warnings"]];
  input.quarters.forEach((quarter) => {
    rows.push([
      quarter.label,
      quarter.blockers.length ? quarter.blockers.join("; ") : "None",
      quarter.warnings.length ? quarter.warnings.join("; ") : "None"
    ]);
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildCaPackWorkbook(input: CaPackWorkbookInput): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildBasCalcSheet(input), "BAS Calc");
  XLSX.utils.book_append_sheet(workbook, buildExceptionsSheet(input), "Exceptions and notes");
  return workbook;
}
