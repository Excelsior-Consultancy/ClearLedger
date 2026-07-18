import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

test("switches FY and quarter across the main reporting pages", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/?quarterId=2026-04-01");
  const sidebar = page.locator("aside");

  await expect(page.getByTestId("financial-year-select")).toHaveValue("FY2025-26");
  await expect(page.getByTestId("quarter-select")).toHaveValue("2026-04-01");
  await expect(sidebar.getByRole("link", { name: "BAS", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "CA Pack", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page).toHaveURL(/quarterId=2026-04-01/);
  await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();
  await expect(page.getByTestId("expense-list")).toContainText("AWS");

  await page.getByRole("link", { name: "Income" }).click();
  await expect(page).toHaveURL(/quarterId=2026-04-01/);
  await expect(page.getByText("EXC-001")).toBeVisible();

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/quarterId=2026-04-01/);
  await expect(page.getByRole("heading", { name: "Company setup" })).toBeVisible();
  await expect(page.getByTestId("setup-quarter-lock").getByRole("heading", { name: "Q4 FY2025-26 for this company" })).toBeVisible();

  await page.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/quarterId=2026-04-01/);
  await expect(page.getByTestId("quarter-select")).toHaveValue("2026-04-01");
});

test("keeps the selected quarter while filtering expenses", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/expenses?quarterId=2026-04-01");

  await expect(page).toHaveURL(/quarterId=2026-04-01/);

  await page.getByRole("link", { name: "Missing receipts" }).click();
  await expect(page).toHaveURL(/quarterId=2026-04-01/);
  await expect(page.getByTestId("expense-list")).toBeVisible();
});
