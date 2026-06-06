import { expect, test } from "@playwright/test";

test("KAN-8 setup page persists bank accounts, people, and categories", async ({ page }) => {
  const suffix = Date.now().toString();

  await page.goto("/admin/setup");

  await expect(page.getByRole("heading", { name: "Company setup" })).toBeVisible();
  await expect(page.getByTestId("setup-readiness")).toContainText("Setup ready");

  const bankSection = page.getByTestId("setup-bank-accounts");
  await bankSection.locator('input[name="name"]').fill(`Test Bank ${suffix}`);
  await bankSection.locator('input[name="bank"]').fill("Macquarie");
  await bankSection.locator('input[name="label"]').fill("Testing");
  await bankSection.locator('input[name="ownerLabel"]').fill("QA");
  await bankSection.getByRole("button", { name: "Add bank account" }).click();
  await expect(bankSection).toContainText(`Test Bank ${suffix}`);

  const peopleSection = page.getByTestId("setup-people");
  await peopleSection.locator('input[name="name"]').fill(`QA Person ${suffix}`);
  await peopleSection.locator('input[name="email"]').fill(`qa-${suffix}@example.com`);
  await peopleSection.locator('select[name="personType"]').selectOption("EMPLOYEE");
  await peopleSection.locator('select[name="workspaceRole"]').selectOption("EMPLOYEE");
  await peopleSection.locator('select[name="payrollEnabled"]').selectOption("true");
  await peopleSection.getByRole("button", { name: "Add person" }).click();
  await expect(peopleSection).toContainText(`QA Person ${suffix}`);

  const categorySection = page.getByTestId("setup-categories");
  await categorySection.locator('input[name="name"]').fill(`QA Category ${suffix}`);
  await categorySection.locator('select[name="type"]').selectOption("EXPENSE");
  await categorySection.locator('select[name="defaultGstTreatment"]').selectOption("GST_INCLUDED");
  await categorySection.locator('select[name="basTreatment"]').selectOption("GST_PAID");
  await categorySection.getByRole("button", { name: "Add category" }).click();
  await expect(categorySection).toContainText(`QA Category ${suffix}`);

  await page.reload();
  await expect(page.getByTestId("setup-bank-accounts")).toContainText(`Test Bank ${suffix}`);
  await expect(page.getByTestId("setup-people")).toContainText(`QA Person ${suffix}`);
  await expect(page.getByTestId("setup-categories")).toContainText(`QA Category ${suffix}`);
});
