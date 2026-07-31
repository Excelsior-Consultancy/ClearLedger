import { expect, test } from "@playwright/test";
import { loginAsOwner } from "./auth";

test("shows the dashboard as a quarterly control center", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByTestId("dashboard-section")).toContainText("Quarter control centre");
  await expect(page.getByTestId("dashboard-status")).toContainText("warnings need review");
  await expect(page.getByTestId("dashboard-issues")).toContainText("What needs attention");
  await expect(page.getByTestId("dashboard-next-action")).toContainText("What should I do next");
  await expect(page.getByTestId("dashboard-readiness")).toContainText("Quarter readiness");
  await expect(page.getByTestId("dashboard-readiness")).toContainText("BAS traceability");
  await expect(page.getByTestId("dashboard-readiness")).toContainText("CA Pack readiness");
});

test("keeps readiness traceable and routes the primary action to a real workflow", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  await expect(page.getByTestId("dashboard-issues")).toContainText("Unpaid invoices");
  await expect(page.getByTestId("dashboard-issues")).toContainText("Missing receipts");
  await expect(page.getByTestId("dashboard-issues")).toContainText("Manual GST overrides");
  await expect(page.getByTestId("dashboard-issues")).toContainText("Payroll due");

  await page.getByTestId("dashboard-primary-action").click();
  await expect(page).toHaveURL(/\/income\?quarterId=2026-04-01/);
});

test("CA Pack export is reachable and downloadable from the dashboard", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/");

  const downloadLink = page.getByTestId("ca-pack-download");
  await expect(downloadLink).toBeVisible();

  const href = await downloadLink.getAttribute("href");
  expect(href).toContain("/api/exports/ca-pack");

  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  expect(response.headers()["content-disposition"]).toContain(".xlsx");
});
