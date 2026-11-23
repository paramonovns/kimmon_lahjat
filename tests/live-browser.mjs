import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const url = process.env.SMOKE_URL || "https://paramonovns.github.io/kimmon_lahjat/";
await mkdir(".local", { recursive: true });
const browser = await chromium.launch();
const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const otherContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const owner = await ownerContext.newPage();
const other = await otherContext.newPage();
const errors = [];
owner.on("pageerror", (error) => errors.push(error.message));
other.on("pageerror", (error) => errors.push(error.message));
let reservedId;
try {
  await Promise.all([owner.goto(url), other.goto(url)]);
  await expect(owner.locator("#connection")).toHaveClass(/is-online/, { timeout: 30000 });
  await expect(other.locator("#connection")).toHaveClass(/is-online/, { timeout: 30000 });
  const button = owner
    .locator(".reserve-button:enabled")
    .filter({ hasText: "Зарезервировать" })
    .first();
  reservedId = await button.getAttribute("data-id");
  if (!reservedId) throw new Error("No free gift for the smoke test");
  const ownerRow = owner.locator(`[data-gift-id="${reservedId}"]`);
  const otherRow = other.locator(`[data-gift-id="${reservedId}"]`);
  await button.click();
  await expect(ownerRow.getByRole("button", { name: "Снять резерв" })).toBeEnabled({
    timeout: 20000,
  });
  await expect(otherRow.locator(".gift-wrap")).toBeVisible({ timeout: 12000 });
  await expect(otherRow.locator(".gift-content")).toBeHidden();
  await otherRow.screenshot({ path: ".local/reserved-row.png" });
  await owner.reload();
  await expect(ownerRow.getByRole("button", { name: "Снять резерв" })).toBeEnabled({
    timeout: 20000,
  });
  await ownerRow.getByRole("button", { name: "Снять резерв" }).click();
  await expect(ownerRow.getByRole("button", { name: "Зарезервировать" })).toBeEnabled({
    timeout: 20000,
  });
  await expect(otherRow.locator(".gift-content")).toBeVisible({ timeout: 12000 });
  for (const image of await owner.locator(".gift-photo img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
  await owner.evaluate(() => document.fonts.ready);
  await owner.screenshot({ path: ".local/site-desktop.png", fullPage: true });
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.screenshot({ path: ".local/site-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    `Live site passed: ${url} — two visitors, reserve, wrap, reload, release, nine images, no JavaScript errors.`,
  );
} finally {
  if (reservedId) {
    await owner
      .evaluate(async (id) => {
        const token = localStorage.getItem("kimmo.christmas.2026.owner");
        // Cleanup via UI if a preceding assertion failed after reservation.
        if (token) {
          const button = document.querySelector(`[data-gift-id="${id}"] .release-button`);
          if (button && !button.disabled) button.click();
        }
      }, reservedId)
      .catch(() => {});
    await owner.waitForTimeout(700);
  }
  await browser.close();
}
