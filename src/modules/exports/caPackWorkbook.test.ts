import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildCaPackWorkbook, type CaPackWorkbookInput } from "./caPackWorkbook";

function sampleInput(overrides: Partial<CaPackWorkbookInput> = {}): CaPackWorkbookInput {
  return {
    workspaceName: "Excelsior Consulting",
    financialYearLabel: "FY2025-26",
    generatedAt: new Date("2026-07-31T00:00:00.000Z"),
    activeExpenseCategories: [
      { id: "cat-software", name: "Software Licence" },
      { id: "cat-travel", name: "Travel Expenses" }
    ],
    quarters: [
      {
        id: "2025-07-01",
        label: "Q1 FY2025-26",
        income: { grossCents: 7863900, gstCents: 714900, netCents: 7149000 },
        expenseCategories: [
          { categoryId: "cat-software", categoryName: "Software Licence", grossCents: 55000, gstCents: 5000, netCents: 50000 }
        ],
        netGstCents: 675670,
        paygWithholdingCents: 120000,
        wagesCents: 1500000,
        superCents: 150000,
        blockers: [],
        warnings: ["1 expenses are missing receipt links."]
      }
    ],
    ...overrides
  };
}

describe("buildCaPackWorkbook", () => {
  it("builds a BAS Calc sheet and an Exceptions and notes sheet", () => {
    const workbook = buildCaPackWorkbook(sampleInput());

    expect(workbook.SheetNames).toEqual(["BAS Calc", "Exceptions and notes"]);
  });

  it("writes quarter headers and Gross/GST/Net sub-headers per quarter block", () => {
    const workbook = buildCaPackWorkbook(sampleInput());
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const headerRow = rows.find((row) => row.includes("Q1 FY2025-26"));
    expect(headerRow).toBeDefined();
    const subHeaderRowIndex = rows.indexOf(headerRow!) + 1;
    expect(rows[subHeaderRowIndex]).toEqual(expect.arrayContaining(["Gross", "GST", "Net"]));
  });

  it("includes a category row for a currently-active category with zero expenses that quarter", () => {
    const workbook = buildCaPackWorkbook(sampleInput());
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const travelRow = rows.find((row) => row[0] === "Travel Expenses");
    expect(travelRow).toBeDefined();
    expect(travelRow!.slice(1, 4)).toEqual([0, 0, 0]);
  });

  it("includes a category row for a category referenced only by a past, now-inactive category id", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        activeExpenseCategories: [{ id: "cat-software", name: "Software Licence" }],
        quarters: [
          {
            ...sampleInput().quarters[0],
            expenseCategories: [
              { categoryId: "cat-software", categoryName: "Software Licence", grossCents: 55000, gstCents: 5000, netCents: 50000 },
              { categoryId: "cat-old", categoryName: "Discontinued Category", grossCents: 11000, gstCents: 1000, netCents: 10000 }
            ]
          }
        ]
      })
    );
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    expect(rows.some((row) => row[0] === "Discontinued Category")).toBe(true);
  });

  it("sums category rows into Total Expenses", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        activeExpenseCategories: [
          { id: "cat-a", name: "A" },
          { id: "cat-b", name: "B" }
        ],
        quarters: [
          {
            ...sampleInput().quarters[0],
            expenseCategories: [
              { categoryId: "cat-a", categoryName: "A", grossCents: 10000, gstCents: 1000, netCents: 9000 },
              { categoryId: "cat-b", categoryName: "B", grossCents: 20000, gstCents: 2000, netCents: 18000 }
            ]
          }
        ]
      })
    );
    const sheet = workbook.Sheets["BAS Calc"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const totalRow = rows.find((row) => row[0] === "Total Expenses");
    expect(totalRow!.slice(1, 4)).toEqual([300, 30, 270]);
  });

  it("renders 'None' for a quarter with no blockers or warnings on the Exceptions sheet", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        quarters: [{ ...sampleInput().quarters[0], blockers: [], warnings: [] }]
      })
    );
    const sheet = workbook.Sheets["Exceptions and notes"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const dataRow = rows.find((row) => row[0] === "Q1 FY2025-26");
    expect(dataRow).toEqual(["Q1 FY2025-26", "None", "None"]);
  });

  it("joins multiple blockers and warnings with a semicolon on the Exceptions sheet", () => {
    const workbook = buildCaPackWorkbook(
      sampleInput({
        quarters: [
          {
            ...sampleInput().quarters[0],
            blockers: ["2 reporting blockers must be fixed."],
            warnings: ["1 expenses are missing receipt links.", "3 invoices are unpaid."]
          }
        ]
      })
    );
    const sheet = workbook.Sheets["Exceptions and notes"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1 });

    const dataRow = rows.find((row) => row[0] === "Q1 FY2025-26");
    expect(dataRow![1]).toBe("2 reporting blockers must be fixed.");
    expect(dataRow![2]).toBe("1 expenses are missing receipt links.; 3 invoices are unpaid.");
  });
});
