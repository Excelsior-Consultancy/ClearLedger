import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

test("creates an invoice and records payment in the same register", async ({ page }) => {
  await loginAsOwner(page);

  const clientName = uniqueLabel("E2E Client");
  const invoiceNumber = `E2E-INV-${Date.now()}`;

  await page.goto("/income");
  await expect(page.getByRole("heading", { name: "Excelsior Consulting" })).toBeVisible();

  const clientForm = page.getByTestId("create-client-form");
  await clientForm.locator('input[name="name"]').fill(clientName);
  await clientForm.locator('input[name="email"]').fill(`${clientName.toLowerCase().replaceAll(" ", ".")}@example.com`);
  await clientForm.locator('input[name="abn"]').fill("12 345 678 905");
  await clientForm.locator('textarea[name="billingAddress"]').fill("123 Collins St, Melbourne VIC");
  await clientForm.locator('textarea[name="notes"]').fill("New customer");
  await clientForm.getByRole("button", { name: "Add client" }).click();

  await expect(page.getByTestId("income-clients")).toContainText(clientName);

  const invoiceForm = page.getByTestId("create-invoice-form");
  await invoiceForm.locator('select[name="clientId"]').selectOption({ label: clientName });
  await invoiceForm.locator('input[name="invoiceNumber"]').fill(invoiceNumber);
  await invoiceForm.locator('input[name="grossAmount"]').fill("1500");
  await invoiceForm.locator('input[name="issueDate"]').fill("2026-07-08");
  await invoiceForm.locator('input[name="dueDate"]').fill("2026-07-22");
  await invoiceForm.locator('textarea[name="notes"]').fill("July consulting work");
  await invoiceForm.getByRole("button", { name: "Create invoice" }).click();

  await expect(page.getByTestId("quarter-select")).toHaveValue("2026-07-01");
  await expect(page.getByTestId("financial-year-select")).toHaveValue("FY2026-27");
  await expect(page.getByTestId("invoice-ledger")).toContainText(invoiceNumber);
  await expect(page.getByTestId("invoice-ledger")).toContainText(clientName);
  await expect(page.getByTestId("invoice-ledger")).toContainText("unpaid");

  const invoiceRow = page.getByRole("row").filter({ hasText: invoiceNumber });
  await invoiceRow.locator('input[name="paymentDate"]').fill("2026-07-20");
  await invoiceRow.getByRole("button", { name: "Mark paid" }).click();

  await expect(page.getByTestId("quarter-select")).toHaveValue("2026-07-01");
  await expect(page.getByTestId("financial-year-select")).toHaveValue("FY2026-27");
  await expect(page.getByTestId("invoice-ledger")).toContainText("paid");
  await expect(page.getByTestId("invoice-ledger")).toContainText("2026-07-20");
});
