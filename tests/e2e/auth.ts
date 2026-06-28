import { expect, type Page } from "@playwright/test";

export const E2E_USER = {
  email: "123@123.com",
  companyName: "Excelsior Consulting"
};

export async function loginAsOwner(page: Page) {
  await page.goto(
    `/api/dev-auth?email=${encodeURIComponent(E2E_USER.email)}&name=Business%20Owner&companyName=${encodeURIComponent(E2E_USER.companyName)}`
  );
  await expect(page).toHaveURL(/\/$/);
}

export async function logout(page: Page) {
  await page.goto("/api/dev-auth?logout=1");
  await expect(page).toHaveURL(/\/login/);
}
