import { test, expect } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";

type Request = {
  p_action: "list" | "reserve" | "release";
  p_gift_id: number | null;
  p_token: string;
};

async function mockServer(context: BrowserContext, owners: Map<number, string>) {
  await context.route("https://kimmo-tests.supabase.co/rest/v1/rpc/kimmo_gifts", async (route) => {
    const body = route.request().postDataJSON() as Request;
    const owner = owners.get(body.p_gift_id!);
    if (body.p_action === "reserve") {
      if (owner && owner !== body.p_token) {
        await route.fulfill({ status: 409, json: { code: "23505" } });
        return;
      }
      owners.set(body.p_gift_id!, body.p_token);
    }
    if (body.p_action === "release" && owner === body.p_token) owners.delete(body.p_gift_id!);
    await route.fulfill({
      json: Array.from({ length: 9 }, (_, i) => ({
        gift_id: i + 7,
        busy: owners.has(i + 7),
        mine: owners.get(i + 7) === body.p_token,
      })),
    });
  });
}

test("two independent visitors share reservations; owner can reload and release", async ({
  browser,
}) => {
  const owners = new Map<number, string>();
  const first = await browser.newContext();
  const second = await browser.newContext();
  await mockServer(first, owners);
  await mockServer(second, owners);
  const a = await first.newPage();
  const b = await second.newPage();
  await a.goto("/");
  await b.goto("/");
  const aRow = a.locator('[data-gift-id="7"]');
  const bRow = b.locator('[data-gift-id="7"]');
  await aRow.getByRole("button", { name: "Зарезервировать" }).click();
  await expect(aRow.getByRole("button", { name: "Снять резерв" })).toBeEnabled();
  await expect(bRow.locator(".gift-wrap")).toBeVisible({ timeout: 7000 });
  await expect(bRow.locator(".gift-content")).toBeHidden();
  await expect(bRow.getByRole("button")).toHaveCount(0);
  await a.reload();
  await expect(aRow.getByRole("button", { name: "Снять резерв" })).toBeEnabled();
  await aRow.getByRole("button", { name: "Снять резерв" }).click();
  await expect(bRow.locator(".gift-content")).toBeVisible({ timeout: 7000 });
  await expect(bRow.getByRole("button", { name: "Зарезервировать" })).toBeEnabled();
  await first.close();
  await second.close();
});

test("stale visitor cannot claim a gift already reserved by someone else", async ({
  page,
  context,
}) => {
  const owners = new Map<number, string>();
  await mockServer(context, owners);
  await page.goto("/");
  const row = page.locator('[data-gift-id="7"]');
  await expect(row.getByRole("button")).toBeEnabled();
  owners.set(7, "someone-else");
  await row.getByRole("button").click();
  await expect(page.locator("#toast")).toContainText("Кто-то успел");
  await expect(row.locator(".gift-wrap")).toBeVisible();
  expect(owners.get(7)).toBe("someone-else");
});

test("connection failure prevents reservations and recovers after reconnect", async ({
  page,
  context,
}) => {
  await context.route("https://kimmo-tests.supabase.co/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#connection")).toContainText("Нет связи");
  await expect(page.locator(".reserve-button:enabled")).toHaveCount(0);
  await context.unrouteAll();
  await mockServer(context, new Map());
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator(".reserve-button:enabled")).toHaveCount(9);
});

test("a delayed refresh cannot discard a click or overwrite a newer reservation", async ({
  page,
  context,
}) => {
  await mockServer(context, new Map());
  await page.goto("/");
  const button = page.locator('[data-gift-id="7"] .reserve-button');
  await expect(button).toBeEnabled();
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  await context.route("https://kimmo-tests.supabase.co/rest/v1/rpc/kimmo_gifts", async (route) => {
    if ((route.request().postDataJSON() as Request).p_action !== "list") return route.fallback();
    markStarted();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.fulfill({
      json: Array.from({ length: 9 }, (_, i) => ({ gift_id: i + 7, busy: false, mine: false })),
    });
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await started;
  await button.click();
  await expect(button).toHaveText(/Снять резерв/);
  await page.waitForTimeout(1200);
  await expect(button).toHaveText(/Снять резерв/);
});

for (const width of [1440, 768, 390, 320]) {
  test(`layout and photos at ${width}px; rows are exactly 250px`, async ({ page, context }) => {
    await mockServer(context, new Map());
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Подарки для Киммо на рождество",
    );
    await expect(page.locator(".gift-row")).toHaveCount(9);
    for (const row of await page.locator(".gift-row").all()) {
      await row.scrollIntoViewIfNeeded();
      const rect = await row.boundingBox();
      expect(rect!.height).toBe(250);
      const buttonRect = await row.locator(".reserve-button").boundingBox();
      expect(buttonRect!.y + buttonRect!.height).toBeLessThanOrEqual(rect!.y + rect!.height + 1);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    for (const image of await page.locator(".gift-photo img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true);
    }
    await expect(page.locator(".search-button").first()).toHaveAttribute(
      "href",
      /google\.com\/search\?q=.*10478/,
    );
    await page.screenshot({ path: `test-results/layout-${width}.png`, fullPage: true });
  });
}
