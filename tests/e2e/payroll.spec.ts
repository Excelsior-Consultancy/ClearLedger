import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

test("creates weekly and monthly pay runs with payslip and super calculations", async ({ page }) => {
  await loginAsOwner(page);

  const weeklyName = uniqueLabel("Weekly Worker");
  const monthlyName = uniqueLabel("Monthly Worker");
  const weeklyGross = "$1,000.00";
  const weeklySuper = "$110.00";
  const monthlyGross = "$4,000.00";
  const monthlySuper = "$440.00";

  await page.goto("/admin/setup");
  await expect(page.getByRole("heading", { name: "Company setup" })).toBeVisible();

  const peopleSection = page.getByTestId("setup-people");

  await peopleSection.locator('input[name="name"]').fill(weeklyName);
  await peopleSection.locator('input[name="email"]').fill(`${weeklyName.toLowerCase().replaceAll(" ", ".")}@example.com`);
  await peopleSection.locator('select[name="personType"]').selectOption("EMPLOYEE");
  await peopleSection.locator('select[name="workspaceRole"]').selectOption("EMPLOYEE");
  await peopleSection.locator('select[name="payrollEnabled"]').selectOption("true");
  await peopleSection.locator('select[name="payrollBasis"]').selectOption("SALARY");
  await peopleSection.locator('input[name="salaryPerPayPeriodCents"]').fill("100000");
  await peopleSection.locator('input[name="superRateBps"]').fill("1100");
  await peopleSection.locator('input[name="employmentStartDate"]').fill("2026-07-01");
  await peopleSection.getByRole("button", { name: "Add person" }).click();
  await expect(peopleSection).toContainText(weeklyName);

  await peopleSection.locator('input[name="name"]').fill(monthlyName);
  await peopleSection.locator('input[name="email"]').fill(`${monthlyName.toLowerCase().replaceAll(" ", ".")}@example.com`);
  await peopleSection.locator('select[name="personType"]').selectOption("EMPLOYEE");
  await peopleSection.locator('select[name="workspaceRole"]').selectOption("EMPLOYEE");
  await peopleSection.locator('select[name="payrollEnabled"]').selectOption("true");
  await peopleSection.locator('select[name="payrollBasis"]').selectOption("SALARY");
  await peopleSection.locator('input[name="salaryPerPayPeriodCents"]').fill("400000");
  await peopleSection.locator('input[name="superRateBps"]').fill("1100");
  await peopleSection.locator('input[name="employmentStartDate"]').fill("2026-07-01");
  await peopleSection.getByRole("button", { name: "Add person" }).click();
  await expect(peopleSection).toContainText(monthlyName);

  await page.goto("/payroll");
  await expect(page.getByRole("heading", { name: "Payroll Lite" })).toBeVisible();

  const createForm = page.getByTestId("create-pay-run-form");

  await createForm.locator('select[name="personId"]').selectOption({ label: weeklyName });
  await createForm.locator('input[name="periodStart"]').fill("2026-07-06");
  await createForm.locator('input[name="periodEnd"]').fill("2026-07-12");
  await createForm.locator('input[name="payDate"]').fill("2026-07-13");
  await createForm.locator('textarea[name="notes"]').fill("Weekly payroll run");
  await createForm.getByRole("button", { name: "Create draft pay run" }).click();

  await expect(page.getByTestId("quarter-select")).toHaveValue("2026-07-01");
  await expect(page.getByTestId("financial-year-select")).toHaveValue("FY2026-27");
  await expect(page.getByTestId("pay-slip-summary")).toContainText(weeklyName);
  await expect(page.getByTestId("pay-slip-summary")).toContainText(weeklyGross);
  await expect(page.getByTestId("pay-slip-summary")).toContainText(weeklySuper);
  await expect(page.getByTestId("pay-slip-summary")).toContainText("Net pay");

  await createForm.locator('select[name="personId"]').selectOption({ label: monthlyName });
  await createForm.locator('input[name="periodStart"]').fill("2026-07-01");
  await createForm.locator('input[name="periodEnd"]').fill("2026-07-31");
  await createForm.locator('input[name="payDate"]').fill("2026-07-31");
  await createForm.locator('textarea[name="notes"]').fill("Monthly payroll run");
  await createForm.getByRole("button", { name: "Create draft pay run" }).click();

  await expect(page.getByTestId("quarter-select")).toHaveValue("2026-07-01");
  await expect(page.getByTestId("financial-year-select")).toHaveValue("FY2026-27");
  await expect(page.getByTestId("pay-slip-summary")).toContainText(monthlyName);
  await expect(page.getByTestId("pay-slip-summary")).toContainText(monthlyGross);
  await expect(page.getByTestId("pay-slip-summary")).toContainText(monthlySuper);

  await expect(page.getByRole("cell", { name: weeklyName, exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: monthlyName, exact: true })).toBeVisible();
});
