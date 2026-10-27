const { chromium } = require("playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const results = [];
  try {
    for (const width of [320, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:8032/demo");
      await page
        .getByRole("button", { name: "Open investigation", exact: true })
        .tap();
      await page
        .getByRole("heading", { name: "Understand the problem.", exact: true })
        .waitFor();
      await page
        .getByLabel("Investigation stage", { exact: true })
        .selectOption("Evidence");
      await page
        .getByRole("button", { name: "Equipment record", exact: true })
        .tap();
      const polygon = page
        .locator('svg[aria-label^="Illustrative equipment"] polygon')
        .first();
      const before = await polygon.getAttribute("points");
      for (const label of ["Equipment rotation", "Equipment zoom"]) {
        const slider = page.getByRole("slider", { name: label });
        const old = await slider.inputValue();
        await slider.scrollIntoViewIfNeeded();
        const box = await slider.boundingBox();
        await page.touchscreen.tap(
          box.x + box.width * 0.85,
          box.y + box.height / 2,
        );
        if ((await slider.inputValue()) === old)
          throw Error(label + " touch failed");
      }
      if ((await polygon.getAttribute("points")) === before)
        throw Error("Projection unchanged");
      await page
        .getByRole("button", { name: "Pump housing", exact: true })
        .tap();
      await page
        .getByRole("heading", { name: "Pump housing: pressure sensor" })
        .waitFor();
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Touch layout overflow");
      await page.screenshot({
        path: `docs/release-8f984c2/screenshots/mobile-${width}-touch.png`,
        fullPage: true,
      });
      results.push({
        width,
        hasTouch: true,
        isMobile: true,
        rotation_tap: true,
        zoom_tap: true,
        component_tap: true,
        scope: "Chromium touch emulation, not physical hardware",
      });
      await context.close();
    }
    fs.writeFileSync(
      "docs/release-8f984c2/touch-checks.json",
      JSON.stringify(results, null, 2) + "\n",
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
