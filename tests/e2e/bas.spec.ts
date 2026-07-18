import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

test("calculates BAS from invoices, expenses, payroll, and super in one quarter", async ({ page }) => {
  await loginAsOwner(page);

  const quarterId = "2026-07-01";
  const clientName = uniqueLabel("BAS Client");
  const invoiceNumber = `BAS-INV-${Date.now()}`;
  const expenseSupplier = uniqueLabel("BAS Supplier");

  await page.goto("/income");

  const clientForm = page.getByTestId("create-client-form");
  await clientForm.locator('input[name="name"]').fill(clientName);
  await clientForm.locator('input[name="email"]').fill(`${clientName.toLowerCase().replaceAll(" ", ".")}@example.com`);
  await clientForm.locator('input[name="abn"]').fill("12 345 678 905");
  await clientForm.locator('textarea[name="billingAddress"]').fill("123 Collins St, Melbourne VIC");
  await clientForm.locator('textarea[name="notes"]').fill("Integration test customer");
  await clientForm.getByRole("button", { name: "Add client" }).click();

  await expect(page.getByTestId("income-clients")).toContainText(clientName);

  const invoiceForm = page.getByTestId("create-invoice-form");
  await invoiceForm.locator('select[name="clientId"]').selectOption({ label: clientName });
  await invoiceForm.locator('input[name="invoiceNumber"]').fill(invoiceNumber);
  await invoiceForm.locator('input[name="grossAmount"]').fill("1100");
  await invoiceForm.locator('input[name="issueDate"]').fill("2026-07-08");
  await invoiceForm.locator('input[name="dueDate"]').fill("2026-07-22");
  await invoiceForm.locator('input[name="evidenceUrl"]').fill("https://example.com/invoice");
  await invoiceForm.locator('textarea[name="notes"]').fill("Quarter invoice");
  await invoiceForm.getByRole("button", { name: "Create invoice" }).click();

  await expect(page.getByTestId("invoice-ledger")).toContainText(invoiceNumber);
  const invoiceRow = page.getByRole("row").filter({ hasText: invoiceNumber });
  await invoiceRow.locator('input[name="paymentDate"]').fill("2026-07-20");
  await invoiceRow.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByTestId("invoice-ledger")).toContainText("paid");

  await page.goto("/expenses");

  const expenseForm = page.getByTestId("expense-add-form");
  await expenseForm.locator('input[name="date"]').fill("2026-07-09");
  await expenseForm.locator('input[name="supplier"]').fill(expenseSupplier);
  await expenseForm.locator('select[name="categoryId"]').selectOption({ label: "Software - default GST included" });
  await expenseForm.locator('select[name="bankAccountId"]').selectOption({ label: "Raja Expenses (Raja)" });
  await expenseForm.locator('input[name="grossAmount"]').fill("330");
  await expenseForm.locator('select[name="paymentState"]').selectOption("PAID");
  await expenseForm.locator('select[name="gstTreatment"]').selectOption("GST_INCLUDED");
  await expenseForm.locator('input[name="receiptUrl"]').fill("https://example.com/receipt");
  await expenseForm.locator('textarea[name="notes"]').fill("Quarter expense");
  await expenseForm.getByRole("button", { name: "Save expense" }).click();

  await expect(page.getByText(expenseSupplier)).toBeVisible();

  await page.goto("/payroll");

  const createForm = page.getByTestId("create-pay-run-form");

  await createForm.locator('select[name="personId"]').selectOption({ label: "Business Owner" });
  await createForm.locator('input[name="periodStart"]').fill("2026-07-01");
  await createForm.locator('input[name="periodEnd"]').fill("2026-07-14");
  await createForm.locator('input[name="payDate"]').fill("2026-07-15");
  await createForm.locator('input[name="paygAmount"]').fill("620");
  await createForm.locator('textarea[name="notes"]').fill("Owner salary pay run");
  await createForm.getByRole("button", { name: "Create draft pay run" }).click();

  await expect(page.getByRole("row", { name: /Business Owner salary/ })).toBeVisible();

  await createForm.locator('select[name="personId"]').selectOption({ label: "Sample Employee" });
  await createForm.locator('input[name="periodStart"]').fill("2026-07-01");
  await createForm.locator('input[name="periodEnd"]').fill("2026-07-14");
  await createForm.locator('input[name="payDate"]').fill("2026-07-16");
  await createForm.locator('input[name="hoursWorked"]').fill("60");
  await createForm.locator('input[name="paygAmount"]').fill("500");
  await createForm.locator('textarea[name="notes"]').fill("Employee hourly pay run");
  await createForm.getByRole("button", { name: "Create draft pay run" }).click();

  await expect(page.getByRole("row", { name: /Sample Employee hourly/ })).toBeVisible();

  await page.goto(`/?quarterId=${quarterId}`);

  const basSection = page.getByTestId("bas-section");
  await expect(basSection).toContainText("GST collected");
  await expect(basSection).toContainText("GST paid");
  await expect(basSection).toContainText("PAYG withholding");
  await expect(basSection).toContainText("Wages");
  await expect(basSection).toContainText("Super");
  await expect(page.getByTestId("dashboard-next-action")).toContainText("Ready for BAS");
  await expect(basSection).toContainText("$100.00");
  await expect(basSection).toContainText("$30.00");
  await expect(basSection).toContainText("$5,700.00");
  await expect(basSection).toContainText("$1,120.00");
});
