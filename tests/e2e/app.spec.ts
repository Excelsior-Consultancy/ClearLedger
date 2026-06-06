import { expect, test } from "@playwright/test";

test("shows the MVP epic sections in the local app", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByTestId("admin-section")).toContainText("KAN-8");
  await expect(page.getByTestId("expenses-section")).toContainText("KAN-3");
  await expect(page.getByTestId("income-section")).toContainText("KAN-2");
  await expect(page.getByTestId("payroll-lite-section")).toContainText("KAN-4");
  await expect(page.getByTestId("bas-section")).toContainText("KAN-5");
  await expect(page.getByTestId("ca-pack-section")).toContainText("KAN-7");
});

test("keeps missing receipts as warnings and invalid GST as traceable review content", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("expenses-section")).toContainText("Missing receipts");
  await expect(page.getByTestId("expenses-section")).toContainText("warning only");
  await expect(page.getByTestId("expenses-section")).toContainText("Manual GST overrides");
  await expect(page.getByText("Summary total -> filtered source table -> source detail")).toBeVisible();
});

test("surfaces BAS and CA Pack readiness from source data", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("bas-section")).toContainText("GST collected");
  await expect(page.getByTestId("bas-section")).toContainText("PAYG withholding");
  await expect(page.getByTestId("ca-pack-section")).toContainText("Draft export");
  await expect(page.getByTestId("ca-pack-section")).toContainText("Download draft Excel");
  await expect(page.getByTestId("ca-pack-section")).toContainText("Evidence links");
});
