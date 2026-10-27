// Optional Playwright check. Creates one synthetic session; sends no model requests.
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const base = process.env.FORGE_DEMO_URL || "http://127.0.0.1:8014";
    await page.goto(base + "/demo");
    await page
      .getByRole("button", { name: "Begin investigation", exact: true })
      .click();
    await page.locator(".signal-value").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => ({
      interface: getComputedStyle(document.querySelector(".forge-app"))
        .fontFamily,
      measurements: getComputedStyle(document.querySelector(".signal-value"))
        .fontFamily,
      loaded:
        document.fonts.check("14px Inter") &&
        document.fonts.check('14px "IBM Plex Mono"'),
    }));
    if (
      !fonts.interface.includes("Inter") ||
      !fonts.measurements.includes("IBM Plex Mono") ||
      !fonts.loaded
    )
      throw Error("Local typography did not load");
    for (const [width, zoom] of [
      [320, 1],
      [1440, 2],
    ]) {
      await page.setViewportSize({ width, height: 1050 });
      await page.evaluate((value) => {
        document.documentElement.style.zoom = String(value);
      }, zoom);
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error(`Overflow at width ${width}, zoom ${zoom}`);
    }
    console.log(
      "Local Inter and IBM Plex Mono loaded; 320px reflow and 200% zoom passed",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
