import { expect, test } from "@playwright/test";
import { loginAsFreshOwner } from "./auth";

function isValidAbn(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const checksum = weights.reduce((total, weight, index) => {
    const digit = Number(digits[index]);
    return total + (index === 0 ? digit - 1 : digit) * weight;
  }, 0);
  return checksum % 89 === 0;
}

function generateValidAbn(seed: number) {
  const start = Number(String(seed).padStart(10, "0").slice(0, 10));
  for (let offset = 0; offset < 100_000; offset += 1) {
    const prefix = String((start + offset) % 10_000_000_000).padStart(10, "0");
    for (let last = 0; last < 10; last += 1) {
      const candidate = `${prefix}${last}`;
      if (isValidAbn(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error("Unable to generate a valid ABN for the test.");
}

test("creates a new workspace, then keeps the user in onboarding until the profile is complete", async ({ page }) => {
  await loginAsFreshOwner(page);

  await expect(page.getByRole("heading", { name: "Start a workspace" })).toBeVisible();

  const workspaceName = `Fresh Ledger ${Date.now()}`;
  const abn = generateValidAbn(Date.now() % 1_000_000_000);

  await page.locator('input[name="companyName"]').fill(workspaceName);
  await page.locator('input[name="abn"]').fill(abn);
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole("heading", { name: "Finish company setup" })).toBeVisible();
  await expect(page.getByText(/financial year start month sets the quarter boundaries/i)).toBeVisible();

  await page.locator('input[name="legalName"]').fill(`${workspaceName} Pty Ltd`);
  await page.locator('input[name="contactEmail"]').fill(`accounts-${Date.now()}@example.com`);
  await page.locator('textarea[name="address"]').fill("Level 5, 123 George St, Sydney NSW 2000");
  await page.locator('select[name="gstRegistered"]').selectOption("true");
  await page.locator('select[name="gstAccountingBasis"]').selectOption("ACCRUAL");
  await page.locator('select[name="basFrequency"]').selectOption("QUARTERLY");
  await page.locator('select[name="financialYearStartMonth"]').selectOption("7");
  await page.locator('input[name="invoicePrefix"]').fill("FRS");
  await page.getByRole("button", { name: "Save company profile" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("blocks duplicate ABNs and tells the user to join the existing workspace", async ({ page }) => {
  await loginAsFreshOwner(page);

  await page.locator('input[name="companyName"]').fill(`Duplicate ABN ${Date.now()}`);
  await page.locator('input[name="abn"]').fill("51824753556");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page.getByText(/already registered for another workspace/i)).toBeVisible();
  await expect(page).toHaveURL(/\/signup/);
});
