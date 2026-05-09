import { expect, test } from "@playwright/test";

test("home page loads and shows mood presets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Project Hub")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Project" })).toBeVisible();
});
