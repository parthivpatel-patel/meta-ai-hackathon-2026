const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const results = [];
    for (const [name, width, height] of [
      ["desktop", 1440, 1050],
      ["mobile", 390, 844],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        acceptDownloads: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(
        (process.env.FORGE_DEMO_URL || "http://127.0.0.1:8005") + "/demo",
      );
      await page
        .getByRole("button", { name: "Start investigation", exact: true })
        .click();
      for (const label of [
        "Generate competing hypotheses",
        "Select next experiment",
        "Run experiment & verify",
        "Select next experiment",
        "Run experiment & verify",
      ])
        await page.getByRole("button", { name: label, exact: true }).click();
      await page
        .getByText("Supported in the synthetic model", { exact: true })
        .waitFor();
      await page.screenshot({
        path: `docs/evidence/redesign-${name}-workspace.png`,
        fullPage: true,
      });
      await page.reload();
      await page
        .getByText("Supported in the synthetic model", { exact: true })
        .waitFor();
      const slider = page.getByLabel("Telemetry minute");
      await slider.focus();
      await slider.press("ArrowRight");
      if ((await slider.inputValue()) !== "101")
        throw Error("Keyboard telemetry inspection failed");
      async function navigate(view) {
        if (width <= 700)
          await page.getByRole("button", { name: "Toggle navigation" }).click();
        await page
          .getByRole("navigation", { name: "Investigation navigation" })
          .getByRole("button", { name: new RegExp("^" + view) })
          .click();
      }
      for (const view of [
        "Workspace",
        "Evidence",
        "Hypotheses",
        "Experiments",
        "Verification",
        "Reports",
      ]) {
        await navigate(view);
        if (view === "Evidence") {
          await page
            .getByRole("button", { name: "thermal", exact: true })
            .click();
          await page
            .getByRole("img", { name: "Calibrated thermal image" })
            .waitFor();
        }
        if (view === "Hypotheses")
          await page
            .locator(".hypothesis-row")
            .first()
            .locator("summary")
            .click();
        const accessibility = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        results.push({
          viewport: name,
          view,
          violations: accessibility.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        });
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement)
            document.activeElement.blur();
          window.scrollTo(0, 0);
        });
        await page.screenshot({
          path: `docs/evidence/redesign-${name}-${view.toLowerCase()}.png`,
          fullPage: true,
        });
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Overflow " + name + " " + view);
      }
      for (const [label, format] of [
        ["Export replayable JSON", "json"],
        ["Export readable HTML", "html"],
      ]) {
        const pending = page.waitForEvent("download");
        await page.getByRole("button", { name: label, exact: true }).click();
        const download = await pending;
        const body = fs.readFileSync(await download.path(), "utf8");
        if (format === "json") {
          const r = JSON.parse(body);
          if (r.investigation.model_source !== "deterministic_rules_not_meta")
            throw Error("Incorrect attribution");
          fs.writeFileSync("/tmp/forge-redesign-report.json", body);
        } else if (
          !body.includes("Physical-world causality is not established")
        )
          throw Error("Missing scope");
      }
      await page
        .getByLabel("Sequential demo case")
        .selectOption("insufficient");
      await page
        .getByRole("button", { name: "Start investigation", exact: true })
        .click();
      await page
        .getByText("Explicit abstention or inconclusive evidence", {
          exact: true,
        })
        .waitFor();
      if (errors.length) throw Error(errors.join("\n"));
      await context.close();
      console.log(
        name +
          ": six real views, keyboard telemetry, responsive layout, persisted workflow, exports and abstention passed",
      );
      if (name === "desktop")
        await new Promise((resolve) => setTimeout(resolve, 61000));
    }
    fs.writeFileSync(
      "/tmp/forge-redesign-a11y.json",
      JSON.stringify(results, null, 2),
    );
    const failed = results.filter((r) => r.violations.length);
    if (failed.length)
      throw Error(
        "Accessibility violations in " +
          failed.map((r) => r.viewport + "/" + r.view).join(", "),
      );
    console.log(
      "Automated accessibility checks: zero WCAG A/AA violations across 12 viewports/views",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
