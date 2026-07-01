import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

test("shows the MVP epic sections in the local app", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page.locator("h1").filter({ hasText: "Dashboard" })).toBeVisible();
  await expect(page.getByTestId("admin-section")).toContainText("Company setup");
  await expect(page.getByTestId("expenses-section")).toContainText("Source expenses");
  await expect(page.getByTestId("income-section")).toContainText("Invoice #");
  await expect(page.getByTestId("payroll-lite-section")).toContainText("Payroll Lite");
  await expect(page.getByTestId("bas-section")).toContainText("BAS Quarter Reporting");
  await expect(page.getByTestId("ca-pack-section")).toContainText("CA Pack Export");
});

test("keeps missing receipts as warnings and invalid GST as traceable review content", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page.getByTestId("expenses-section")).toContainText("Missing receipts");
  await expect(page.getByTestId("expenses-section")).toContainText(/warning only/i);
  await expect(page.getByTestId("expenses-section")).toContainText("Manual GST overrides");
  await expect(page.getByTestId("expenses-section")).toContainText("Source expenses");
});

test("surfaces BAS and CA Pack readiness from source data", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page.getByTestId("bas-section")).toContainText("GST collected");
  await expect(page.getByTestId("bas-section")).toContainText("PAYG withholding");
  await expect(page.getByTestId("bas-section")).toContainText("GST collected links");
  await expect(page.getByTestId("bas-section")).toContainText("Northstar Labs");
  await expect(page.getByTestId("bas-section")).toContainText("AWS");
  await expect(page.getByTestId("bas-section")).toContainText("Sample Employee");
  await expect(page.getByTestId("bas-section")).toContainText("ATO filing summary");
  await expect(page.getByTestId("bas-section")).toContainText("1A");
  await expect(page.getByTestId("bas-section")).toContainText("W2");
  await expect(page.getByTestId("ca-pack-section")).toContainText("Draft export");
  await expect(page.getByTestId("ca-pack-section")).toContainText("Download draft Excel");
  await expect(page.getByTestId("ca-pack-section")).toContainText("Evidence links");
});
