import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

test("shows the public hero page to anonymous visitors", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /BAS-ready/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up", exact: true }).first()).toHaveAttribute(
    "href",
    "/signup"
  );
  await expect(page.getByRole("link", { name: "Log in", exact: true }).first()).toHaveAttribute(
    "href",
    "/login"
  );
});

test("redirects authenticated visitors from / to /dashboard", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
