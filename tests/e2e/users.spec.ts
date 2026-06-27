import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

test("admin sees a full shareable invite URL after creating an invite", async ({ page }) => {
  await loginAsOwner(page);
  const suffix = Date.now().toString();
  const email = `invite-${suffix}@example.com`;

  await page.goto("/admin/users");

  const inviteForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Create invite" })
  });

  await inviteForm.locator('input[name="email"]').fill(email);
  await inviteForm.locator('select[name="role"]').selectOption("ACCOUNTANT");
  await inviteForm.getByRole("button", { name: "Create invite" }).click();

  const inviteBanner = page.getByTestId("invite-created-banner");
  await expect(inviteBanner).toContainText("Invite ready to share");
  await expect(inviteBanner).toContainText(email);

  const inviteUrl = page.locator('a[href^="http://127.0.0.1:3000/invite/"]');
  await expect(inviteUrl).toHaveAttribute("href", /http:\/\/127\.0\.0\.1:3000\/invite\/[a-f0-9]+/);
});
