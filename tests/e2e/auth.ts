import { expect, type Page } from "@playwright/test";

export const E2E_USER = {
  email: "123@123.com",
  companyName: "Excelsior Consulting"
};

export async function loginAsOwner(page: Page) {
  await page.goto("/api/dev-reset");
  await page.goto(
    `/api/dev-auth?email=${encodeURIComponent(E2E_USER.email)}&name=Business%20Owner&workspaceId=excelsior`
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function loginAsFreshOwner(page: Page) {
  await page.goto("/api/dev-reset");
  await page.goto(`/api/dev-auth?email=${encodeURIComponent("fresh-owner@example.com")}&name=Fresh%20Owner`);
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/signup/);
}

export async function logout(page: Page) {
  await page.goto("/api/dev-auth?logout=1");
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
}
