import { expect, type Page } from "@playwright/test";

export const E2E_USER = {
  email: "123@123.com",
  password: "pwd@123"
};

export async function loginAsOwner(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(E2E_USER.email);
  await page.locator('input[name="password"]').fill(E2E_USER.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/$/);
}
