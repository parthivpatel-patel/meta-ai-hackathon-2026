// Optional Playwright and @axe-core/playwright tooling. Real local public backend only.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const base = process.env.FORGE_DEMO_URL || "http://127.0.0.1:8021";
  const evidenceDirectory = process.env.FORGE_EVIDENCE_DIR || "docs/evidence";
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const results = [];
  let saved;
  try {
    for (const [name, width, height, run] of [
      ["desktop", 1440, 1050, true],
      ["mobile-390", 390, 844, true],
      ["mobile-320", 320, 844, false],
      ["mobile-375", 375, 844, false],
      ["mobile-430", 430, 932, false],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        acceptDownloads: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(base + "/demo");
      await page
        .getByRole("button", { name: "Open investigation", exact: true })
        .waitFor();
      await page.evaluate(() => document.fonts.ready);
      async function capture(view) {
        const a = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        results.push({
          viewport: name,
          width,
          view,
          violations: a.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        });
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Horizontal overflow: " + name + "/" + view);
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement)
            document.activeElement.blur();
          window.scrollTo(0, 0);
        });
        await page.screenshot({
          path: `${evidenceDirectory}/product-v4-${name}-${view}.png`,
          fullPage: true,
        });
      }
      async function navigate(stage) {
        if (width <= 700)
          await page
            .getByLabel("Investigation stage", { exact: true })
            .selectOption(stage);
        else
          await page
            .getByRole("navigation", { name: "Investigation stages" })
            .getByRole("button", { name: stage, exact: true })
            .click();
      }
      await capture("choose");
      await page
        .locator("summary")
        .filter({ hasText: "Analysis options and model availability" })
        .click();
      if (await page.getByLabel("Use real Meta inference").isEnabled())
        throw Error("Public model access enabled");
      if (run) {
        await page
          .getByRole("button", { name: "Open investigation", exact: true })
          .click();
        await page
          .getByRole("heading", {
            name: "Understand the problem.",
            exact: true,
          })
          .waitFor();
        await capture("overview");
        for (const label of [
          "Examine the evidence",
          "Prepare possible causes",
          "Choose the next test",
        ])
          await page.getByRole("button", { name: label, exact: true }).click();
        await page
          .getByText("Proposed diagnostic test", { exact: true })
          .waitFor();
        await capture("test-proposal");
        for (const label of [
          "Run the next test",
          "Choose the next test",
          "Run the next test",
        ])
          await page.getByRole("button", { name: label, exact: true }).click();
        await page
          .getByRole("heading", {
            name: "Supported in this simulation",
            exact: true,
          })
          .waitFor();
        saved = await page.evaluate(() =>
          localStorage.getItem("forge-sequential-session"),
        );
        await page.reload();
        await page
          .getByRole("heading", {
            name: "Understand the problem.",
            exact: true,
          })
          .waitFor();
      } else {
        await page.evaluate(
          (id) => localStorage.setItem("forge-sequential-session", id),
          saved,
        );
        await page.reload();
        await page
          .getByRole("heading", {
            name: "Understand the problem.",
            exact: true,
          })
          .waitFor();
      }
      for (const stage of [
        "Overview",
        "Evidence",
        "Possible causes",
        "Tests",
        "Results",
        "Report",
      ]) {
        await navigate(stage);
        if (stage === "Evidence") {
          const slider = page.getByRole("slider", {
            name: "Measurement minute",
          });
          await slider.focus();
          await slider.press("ArrowRight");
          if ((await slider.inputValue()) !== "101")
            throw Error("Keyboard inspection failed");
          await page
            .getByRole("button", { name: "Temperature", exact: true })
            .click();
          await page
            .getByRole("img", { name: "Temperature measurements in °C" })
            .waitFor();
          await page
            .getByRole("button", { name: "Pressure", exact: true })
            .click();
        }
        if (stage === "Possible causes")
          await page.locator(".cause-row summary").first().click();
        if (stage === "Results")
          await page.locator(".channel-results summary").last().click();
        await capture(stage.toLowerCase().replaceAll(" ", "-"));
        if (stage === "Evidence") {
          await page
            .getByRole("button", { name: "Thermal image", exact: true })
            .click();
          await page
            .getByRole("img", { name: "Calibrated thermal image" })
            .waitFor();
          await capture("thermal");
          await page
            .getByRole("button", { name: "Vibration waveform", exact: true })
            .click();
          await page
            .getByRole("img", { name: "Calibrated vibration waveform" })
            .waitFor();
          await capture("waveform");
          await page
            .getByRole("button", { name: "Equipment record", exact: true })
            .click();
          const rotation = page.getByRole("slider", {
            name: "Equipment rotation",
          });
          await rotation.focus();
          await rotation.press("ArrowRight");
          if ((await rotation.inputValue()) !== "31")
            throw Error("Equipment keyboard rotation failed");
          await page
            .getByRole("button", { name: "Pump housing", exact: true })
            .click();
          await page
            .getByRole("img", {
              name: "Illustrative equipment, Pump housing selected",
            })
            .waitFor();
          const started = Date.now();
          for (let i = 0; i < 20; i++) await rotation.press("ArrowRight");
          const metrics = await page.evaluate(() => ({
            domNodes: document.querySelectorAll("*").length,
            usedJSHeapSize: performance.memory?.usedJSHeapSize ?? null,
          }));
          results.push({
            viewport: name,
            view: "equipment-interaction-sample",
            violations: [],
            elapsed_ms: Date.now() - started,
            ...metrics,
            scope:
              "Headless Chromium desktop CPU with viewport emulation; not a mobile hardware benchmark or leak proof",
          });
          await capture("equipment");
        }
      }
      const fonts = await page.evaluate(() => ({
        body: getComputedStyle(document.querySelector(".forge-v4")).fontFamily,
        ready: document.fonts.check('16px "Geist Sans"'),
      }));
      if (!fonts.body.includes("Geist Sans") || !fonts.ready)
        throw Error("Local font failed");
      if (run) {
        for (const [label, format] of [
          ["Download verification record", "json"],
          ["Download readable report", "html"],
        ]) {
          const pending = page.waitForEvent("download");
          await page.getByRole("button", { name: new RegExp(label) }).click();
          const file = await pending;
          const text = fs.readFileSync(await file.path(), "utf8");
          if (format === "json") {
            const r = JSON.parse(text);
            if (r.investigation.model_source !== "deterministic_rules_not_meta")
              throw Error("Wrong source");
            fs.writeFileSync(`/tmp/forge-v4-${name}-report.json`, text);
          } else if (
            !text.includes("Physical-world causality is not established")
          )
            throw Error("Missing scope");
        }
        await page
          .getByRole("button", { name: "Change case", exact: true })
          .click();
        await page
          .getByRole("radio", { name: /An incomplete measurement record/ })
          .check();
        await page
          .getByRole("button", { name: "Open investigation", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "View verification results",
            exact: true,
          })
          .click();
        await page
          .getByRole("heading", {
            name: "Not enough evidence to reach a conclusion",
            exact: true,
          })
          .waitFor();
        await navigate("Evidence");
        if ((await page.locator(".missing-mark").count()) === 0)
          throw Error("Missing observations not visible");
        await capture("missing-evidence");
      }
      if (errors.length) throw Error(errors.join("\n"));
      await context.close();
      console.log(
        name +
          ": focused journey, all views, evidence, keyboard, layout and accessibility checked",
      );
      if (name === "desktop")
        await new Promise((resolve) => setTimeout(resolve, 61000));
    }
    fs.writeFileSync(
      "/tmp/forge-v4-accessibility.json",
      JSON.stringify(results, null, 2),
    );
    const failed = results.filter((r) => r.violations.length);
    if (failed.length) throw Error(JSON.stringify(failed, null, 2));
    console.log(
      `Zero automated accessibility violations across ${results.filter((r) => r.view !== "equipment-interaction-sample").length} view/viewport checks`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
