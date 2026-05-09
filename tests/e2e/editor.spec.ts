import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    if (typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase("pien.db");
    }
  });
});

test("tools switch modes and action tools add layers", async ({ page }) => {
  await page.goto("/editor/new");

  await page.locator('button[title="Text"]').click();
  await expect(page.getByText("No layers yet. Add text or image.")).toHaveCount(0);

  await page.locator('button[title="Face"]').click();
  await expect(page.getByText("Face Tool")).toBeVisible();

  await page.locator('button[title="Pointer"]').click();
  await expect(page.getByText("Face Tool")).toHaveCount(0);
});

test("undo and redo restore layer changes", async ({ page }) => {
  await page.goto("/editor/new");

  await page.locator('button[title="Text"]').click();
  await expect(page.getByText("No layers yet. Add text or image.")).toHaveCount(0);

  await page.locator('header button[title="Undo"]').click();
  await expect(page.getByText("No layers yet. Add text or image.")).toBeVisible();

  await page.locator('header button[title="Redo"]').click();
  await expect(page.getByText("No layers yet. Add text or image.")).toHaveCount(0);
});

test("exports and imports project file", async ({ page }) => {
  await page.goto("/editor/new");
  await page.locator('button[title="Text"]').click();

  await page.getByRole("button", { name: "File", exact: true }).hover();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Project File" }).click();
  const download = await downloadPromise;
  const suggested = download.suggestedFilename();
  expect(suggested.endsWith(".pien.json")).toBe(true);

  const filePath = test.info().outputPath("import-project.pien.json");
  await writeFile(
    filePath,
    JSON.stringify(
      {
        format: "pien.project",
        version: 1,
        exportedAt: new Date().toISOString(),
        app: { name: "pien.studio", platform: "web" },
        project: {
          id: randomUUID(),
          title: "Imported Project",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          canvas: { width: 1080, height: 1350, unit: "px" },
          aspectRatio: "4:5",
          layers: [
            {
              id: randomUUID(),
              type: "text",
              x: 110,
              y: 90,
              scale: 1,
              rotation: 0,
              opacity: 1,
            },
          ],
        },
        assets: [],
        history: { checkpointCount: 0 },
      },
      null,
      2,
    ),
    "utf8",
  );

  await page.goto("/");
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles(filePath);

  await expect(page).toHaveURL(/\/editor\//);
  await expect(page.getByText("No layers yet. Add text or image.")).toHaveCount(0);
});

test("persists project list to indexeddb across reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Project" }).click();

  await page.goto("/");
  await page.reload();

  await expect(page.getByRole("button", { name: "Open" }).first()).toBeVisible();
});
