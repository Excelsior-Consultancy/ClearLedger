import { expect, test } from "@playwright/test";

test("KAN-3 saves a valid expense and keeps missing receipts as warnings", async ({ page }) => {
  const suffix = Date.now().toString();
  const supplier = `QA Expense ${suffix}`;

  await page.goto("/expenses");
  await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();

  const form = page.getByTestId("expense-add-form");
  await form.locator('input[name="date"]').fill("2026-06-07");
  await form.locator('input[name="supplier"]').fill(supplier);
  await form.locator('input[name="grossAmount"]').fill("121.00");
  await form.locator('select[name="gstTreatment"]').selectOption("GST_INCLUDED");
  await form.getByRole("button", { name: "Save expense" }).click();

  await expect(page.getByTestId("expense-saved")).toContainText("Expense saved");
  const row = page.getByRole("row", { name: new RegExp(supplier) });
  await expect(row).toContainText("$121.00");
  await expect(row).toContainText("$11.00");
  await expect(row).toContainText("Missing");
  await expect(row).toContainText("Warning");
  await expect(page.getByTestId("expense-source-detail")).toContainText("BAS GST paid contribution");
  await expect(page.getByTestId("expense-source-detail")).toContainText("CA Pack evidence");

  await page.goto("/expenses?filter=missing-receipts");
  await expect(page.getByRole("row", { name: new RegExp(supplier) })).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId("expenses-section")).toContainText(supplier);
});

test("KAN-3 applies GST-free category defaults and excludes out-of-quarter expenses", async ({ page }) => {
  const suffix = Date.now().toString();
  const bankFeeSupplier = `Bank Fee ${suffix}`;
  const oldSupplier = `Old Quarter ${suffix}`;

  await page.goto("/expenses");
  const form = page.getByTestId("expense-add-form");
  await form.locator('input[name="supplier"]').fill(bankFeeSupplier);
  await form.locator('select[name="categoryId"]').selectOption({ label: "Bank fees - default GST-free" });
  await form.locator('input[name="grossAmount"]').fill("33.00");
  await form.locator('select[name="gstTreatment"]').selectOption("GST_INCLUDED");
  await form.getByRole("button", { name: "Save expense" }).click();

  const bankFeeRow = page.getByRole("row", { name: new RegExp(bankFeeSupplier) });
  await expect(bankFeeRow).toContainText("$33.00");
  await expect(bankFeeRow).toContainText("$0.00");

  await page.goto("/expenses");
  const secondForm = page.getByTestId("expense-add-form");
  await secondForm.locator('input[name="date"]').fill("2026-03-31");
  await secondForm.locator('input[name="supplier"]').fill(oldSupplier);
  await secondForm.locator('input[name="grossAmount"]').fill("110.00");
  await secondForm.getByRole("button", { name: "Save expense" }).click();

  await expect(page.getByTestId("expense-saved")).toContainText("Expense saved");
  await expect(page.getByRole("row", { name: new RegExp(oldSupplier) })).toHaveCount(0);
});

test("KAN-3 blocks impossible manual GST values before save", async ({ page }) => {
  const supplier = `Invalid GST ${Date.now()}`;

  await page.goto("/expenses");
  const form = page.getByTestId("expense-add-form");
  await form.locator('input[name="supplier"]').fill(supplier);
  await form.locator('input[name="grossAmount"]').fill("10.00");
  await form.locator('select[name="gstTreatment"]').selectOption("MANUAL_OVERRIDE");
  await form.locator('input[name="userEnteredGst"]').fill("20.00");
  await form.locator('input[name="overrideReason"]').fill("Import correction");
  await form.getByRole("button", { name: "Save expense" }).click();

  await expect(page.getByTestId("expense-error")).toContainText("GST must be between $0 and the gross amount");
  await expect(page.getByRole("row", { name: new RegExp(supplier) })).toHaveCount(0);
});

test("KAN-3 blocks unsafe receipt evidence links", async ({ page }) => {
  await page.goto("/expenses");
  const form = page.getByTestId("expense-add-form");
  await form.locator('input[name="supplier"]').fill(`Unsafe Receipt ${Date.now()}`);
  await form.locator('input[name="grossAmount"]').fill("110.00");
  await form.locator('input[name="receiptUrl"]').fill("javascript:alert(1)");
  await form.getByRole("button", { name: "Save expense" }).click();

  await expect(page.getByTestId("expense-error")).toContainText("Receipt link must be a valid HTTPS URL");
});

test("KAN-3 edits an expense and persists receipt evidence", async ({ page }) => {
  const suffix = Date.now().toString();
  const supplier = `Receipt Edit ${suffix}`;
  const receiptUrl = `https://drive.google.com/receipt-${suffix}`;

  await page.goto("/expenses");
  const form = page.getByTestId("expense-add-form");
  await form.locator('input[name="supplier"]').fill(supplier);
  await form.locator('input[name="grossAmount"]').fill("220.00");
  await form.locator('select[name="gstTreatment"]').selectOption("GST_INCLUDED");
  await form.getByRole("button", { name: "Save expense" }).click();

  const row = page.getByRole("row", { name: new RegExp(supplier) });
  await row.getByRole("link", { name: "Edit" }).click();
  await page.getByTestId("expense-edit-form").locator('input[name="receiptUrl"]').fill(receiptUrl);
  await page.getByRole("button", { name: "Update expense" }).click();

  await expect(page.getByTestId("expense-saved")).toContainText("Expense saved");
  const updatedRow = page.getByRole("row", { name: new RegExp(supplier) });
  await expect(updatedRow.getByRole("link", { name: "Receipt" })).toHaveAttribute("href", receiptUrl);

  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(supplier) }).getByRole("link", { name: "Receipt" })).toHaveAttribute("href", receiptUrl);
});
