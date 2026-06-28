import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

test("switches FY and quarter across the main reporting pages", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page.getByTestId("financial-year-select")).toHaveValue("FY2025-26");
  await page.getByTestId("financial-year-select").selectOption("FY2024-25");
  await expect(page.getByTestId("quarter-select")).toHaveValue("2025-04-01");
  await expect(page.getByTestId("expenses-section")).toContainText("Legacy AWS");
  await expect(page.getByTestId("income-section")).toContainText("EXC-000");

  await page.getByRole("link", { name: "Expenses" }).click();
  await expect(page).toHaveURL(/quarterId=2025-04-01/);
  await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();
  await expect(page.getByTestId("expense-list")).toContainText("Legacy AWS");

  await page.getByRole("link", { name: "Income" }).click();
  await expect(page).toHaveURL(/quarterId=2025-04-01/);
  await expect(page.getByText("EXC-000")).toBeVisible();

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/quarterId=2025-04-01/);
  await expect(page.getByRole("heading", { name: "Company setup" })).toBeVisible();
  await expect(page.getByText("Q4 FY2024-25 for this company")).toBeVisible();
});

test("keeps the selected quarter while filtering expenses", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/expenses");

  await page.getByTestId("financial-year-select").selectOption("FY2024-25");
  await expect(page).toHaveURL(/quarterId=2025-04-01/);

  await page.getByRole("link", { name: "Missing receipts" }).click();
  await expect(page).toHaveURL(/quarterId=2025-04-01/);
  await expect(page.getByTestId("expense-list")).toBeVisible();
});
