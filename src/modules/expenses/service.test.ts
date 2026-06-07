import { beforeEach, describe, expect, it, vi } from "vitest";
import { dollars } from "@/modules/shared/money";

const mockPrisma = vi.hoisted(() => ({
  workspace: {
    findFirst: vi.fn()
  }
}));

vi.mock("@/modules/db/prisma", () => ({
  prisma: mockPrisma
}));

import {
  expenseStatus,
  filterExpenses,
  getExpenseWorkspace,
  mapPrismaGstTreatment,
  normalizeExpenseGstTreatment,
  referenceIntegrityIssues,
  validateExpenseInput
} from "./service";

describe("expense service rules", () => {
  beforeEach(() => {
    mockPrisma.workspace.findFirst.mockReset();
  });

  it("maps persisted GST enum values into the shared validation model", () => {
    expect(mapPrismaGstTreatment("GST_INCLUDED")).toBe("gst-included");
    expect(mapPrismaGstTreatment("GST_FREE")).toBe("gst-free");
    expect(mapPrismaGstTreatment("NO_GST_OVERSEAS")).toBe("no-gst-overseas");
    expect(mapPrismaGstTreatment("MANUAL_OVERRIDE")).toBe("manual-override");
  });

  it("allows missing receipts as warnings while blocking impossible GST", () => {
    const missingReceiptIssues = validateExpenseInput({
      workspaceId: "excelsior",
      date: "2026-06-07",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(110),
      gstTreatment: "GST_INCLUDED"
    });

    expect(missingReceiptIssues).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "missing-receipt" })
    );
    expect(missingReceiptIssues.some((issue) => issue.severity === "blocker")).toBe(false);

    const impossibleGstIssues = validateExpenseInput({
      workspaceId: "excelsior",
      date: "2026-06-07",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(10),
      gstTreatment: "MANUAL_OVERRIDE",
      userEnteredGstCents: dollars(20),
      overrideReason: "Bad import"
    });

    expect(impossibleGstIssues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "gst-impossible" })
    );
  });

  it("sets row status from validation severity", () => {
    expect(expenseStatus({ issues: [], gstCents: 0, netCents: 0 } as never)).toBe("final");
    expect(
      expenseStatus({
        issues: [{ severity: "warning", code: "missing-receipt", message: "Receipt link is missing." }],
        gstCents: 0,
        netCents: 0
      } as never)
    ).toBe("warning");
    expect(
      expenseStatus({
        issues: [{ severity: "blocker", code: "gross-required", message: "Gross amount must be greater than $0." }],
        gstCents: 0,
        netCents: 0
      } as never)
    ).toBe("blocker");
  });

  it("blocks cross-workspace and non-expense reference selections", () => {
    const issues = referenceIntegrityIssues(
      {
        workspaceId: "workspace-a",
        date: "2026-06-07",
        categoryId: "income-category",
        bankAccountId: "foreign-bank",
        grossCents: dollars(110),
        gstTreatment: "GST_INCLUDED"
      },
      {
        category: { id: "income-category", workspaceId: "workspace-a", type: "INCOME", active: true },
        bankAccount: { id: "foreign-bank", workspaceId: "workspace-b", active: true }
      }
    );

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "category-not-expense" })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "bank-workspace-mismatch" })
    );
  });

  it("returns validation blockers for malformed dates, GST treatments, and receipt URLs", () => {
    const issues = validateExpenseInput({
      workspaceId: "excelsior",
      date: "2026-02-31",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(110),
      gstTreatment: "NOT_A_GST_TREATMENT",
      receiptUrl: "javascript:alert(1)"
    });

    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "expense-date-invalid" })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "gst-treatment-invalid" })
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ severity: "blocker", code: "receipt-url-invalid" })
    );
  });

  it("preserves existing GST treatment on non-category edits", () => {
    const input = {
      workspaceId: "excelsior",
      date: "2026-06-07",
      categoryId: "software",
      bankAccountId: "raja",
      grossCents: dollars(110),
      gstTreatment: "GST_INCLUDED",
      receiptUrl: "https://drive.google.com/receipt"
    };

    expect(
      normalizeExpenseGstTreatment(input, {
        category: { defaultGstTreatment: "GST_FREE" },
        applyDefault: false
      }).gstTreatment
    ).toBe("GST_INCLUDED");

    expect(
      normalizeExpenseGstTreatment(input, {
        category: { defaultGstTreatment: "GST_FREE" },
        applyDefault: true
      }).gstTreatment
    ).toBe("GST_FREE");
  });

  it("composes exception, bank account, and category filters", () => {
    const expenses = [
      {
        id: "exp-aws",
        bankAccountId: "raja",
        categoryId: "software",
        gstTreatment: "gst-included",
        issues: [],
        gstCents: dollars(30),
        netCents: dollars(300)
      },
      {
        id: "exp-telstra",
        bankAccountId: "charchit",
        categoryId: "internet",
        gstTreatment: "manual-override",
        issues: [{ severity: "warning", code: "missing-receipt", message: "Receipt link is missing." }],
        gstCents: dollars(15),
        netCents: dollars(205)
      },
      {
        id: "exp-bank",
        bankAccountId: "main",
        categoryId: "bank-fees",
        gstTreatment: "gst-free",
        issues: [{ severity: "warning", code: "missing-receipt", message: "Receipt link is missing." }],
        gstCents: 0,
        netCents: dollars(28)
      }
    ] as never[];

    expect(
      filterExpenses(expenses, {
        filter: "manual-overrides",
        bankAccountId: "charchit",
        categoryId: "internet"
      }).map((expense) => expense.id)
    ).toEqual(["exp-telstra"]);

    expect(
      filterExpenses(expenses, {
        filter: "missing-receipts",
        categoryId: "bank-fees"
      }).map((expense) => expense.id)
    ).toEqual(["exp-bank"]);

    expect(
      filterExpenses(expenses, {
        bankAccountId: "raja",
        categoryId: "software"
      }).map((expense) => expense.id)
    ).toEqual(["exp-aws"]);
  });

  it("builds the workspace view-model summary from filtered visible Q4 expenses", async () => {
    const workspaceId = "workspace-a";
    const bankAccounts = [
      activeBankAccount("raja", "Raja Expenses"),
      activeBankAccount("charchit", "Charchit Expenses"),
      activeBankAccount("main", "Main Business")
    ];
    const categories = [
      activeExpenseCategory("software", "Software", "GST_INCLUDED"),
      activeExpenseCategory("internet", "Internet", "GST_INCLUDED"),
      activeExpenseCategory("bank-fees", "Bank fees", "GST_FREE")
    ];

    mockPrisma.workspace.findFirst
      .mockResolvedValueOnce({ id: workspaceId })
      .mockResolvedValueOnce({
        id: workspaceId,
        name: "Excelsior Consulting",
        bankAccounts,
        categories,
        expenses: [
          expenseRecord({
            id: "exp-aws",
            workspaceId,
            bankAccount: bankAccounts[0],
            category: categories[0],
            grossCents: dollars(330),
            gstTreatment: "GST_INCLUDED",
            receiptUrl: "https://drive.google.com/aws"
          }),
          expenseRecord({
            id: "exp-telstra",
            workspaceId,
            bankAccount: bankAccounts[1],
            category: categories[1],
            grossCents: dollars(220),
            gstTreatment: "MANUAL_OVERRIDE",
            userEnteredGstCents: dollars(15),
            overrideReason: "Mixed business/private usage"
          }),
          expenseRecord({
            id: "exp-bank",
            workspaceId,
            bankAccount: bankAccounts[2],
            category: categories[2],
            grossCents: dollars(28),
            gstTreatment: "GST_FREE"
          })
        ]
      });

    const model = await getExpenseWorkspace({
      filter: "missing-receipts",
      bankAccountId: "charchit",
      categoryId: "internet"
    });

    expect(mockPrisma.workspace.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        include: expect.objectContaining({
          expenses: expect.objectContaining({
            where: {
              date: {
                gte: new Date("2026-04-01T00:00:00.000Z"),
                lt: new Date("2026-07-01T00:00:00.000Z")
              }
            }
          })
        })
      })
    );
    expect(model.expenses.map((expense) => expense.id)).toEqual(["exp-telstra"]);
    expect(model.activeFilter).toBe("missing-receipts");
    expect(model.activeBankAccountId).toBe("charchit");
    expect(model.activeCategoryId).toBe("internet");
    expect(model.summary.totalExpensesCents).toBe(dollars(220));
    expect(model.summary.gstPaidCents).toBe(dollars(15));
    expect(model.summary.missingReceipts).toBe(1);
    expect(model.summary.manualOverrides).toBe(1);
  });
});

function activeBankAccount(id: string, name: string) {
  return {
    id,
    workspaceId: "workspace-a",
    name,
    bank: "Bank",
    label: "Expense account",
    ownerLabel: "Owner",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
}

function activeExpenseCategory(id: string, name: string, defaultGstTreatment: "GST_INCLUDED" | "GST_FREE") {
  return {
    id,
    workspaceId: "workspace-a",
    name,
    type: "EXPENSE",
    defaultGstTreatment,
    basTreatment: defaultGstTreatment === "GST_FREE" ? "NONE" : "GST_PAID",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
}

function expenseRecord(input: {
  id: string;
  workspaceId: string;
  bankAccount: ReturnType<typeof activeBankAccount>;
  category: ReturnType<typeof activeExpenseCategory>;
  grossCents: number;
  gstTreatment: "GST_INCLUDED" | "GST_FREE" | "MANUAL_OVERRIDE";
  receiptUrl?: string;
  userEnteredGstCents?: number;
  overrideReason?: string;
}) {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    date: new Date("2026-05-05T00:00:00.000Z"),
    supplier: input.id,
    categoryId: input.category.id,
    bankAccountId: input.bankAccount.id,
    grossCents: input.grossCents,
    gstTreatment: input.gstTreatment,
    userEnteredGstCents: input.userEnteredGstCents ?? null,
    receiptUrl: input.receiptUrl ?? null,
    notes: null,
    overrideReason: input.overrideReason ?? null,
    createdAt: new Date("2026-05-05T00:00:00.000Z"),
    updatedAt: new Date("2026-05-05T00:00:00.000Z"),
    bankAccount: input.bankAccount,
    category: input.category
  };
}
