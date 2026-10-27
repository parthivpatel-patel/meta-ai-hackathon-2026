// Optional Playwright/Axe tooling; separate LOCAL public-mode processes avoid shared demo quotas.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const out = process.env.FORGE_PRODUCT_EVIDENCE || "docs/product-completion";
  fs.mkdirSync(out + "/screenshots", { recursive: true });
  const cases = [
    ["misleading_sensor", "An unusual pressure reading", 8040],
    ["temperature_response", "Temperature rises under steady load", 8041],
    ["vibration_response", "Vibration rises during operation", 8042],
    ["insufficient", "An incomplete measurement record", 8043],
    ["noisy_multifault", "Several signals need attention", 8045],
    ["normal", "A normal operating baseline", 8046],
    ["confounded", "A case with overlapping effects", 8047],
  ];
  const results = [];
  try {
    for (const [id, title, port] of cases) {
      const context = await browser.newContext({
        viewport: {
          width: id === "vibration_response" ? 390 : 1440,
          height: 950,
        },
        acceptDownloads: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const started = Date.now();
      await page.goto(`http://127.0.0.1:${port}/demo?view=investigations`);
      await page
        .getByRole("button", { name: "Open investigation", exact: true })
        .waitFor();
      const initialLoad = Date.now() - started;
      await page.getByRole("radio", { name: new RegExp(title) }).check();
      const start = Date.now();
      const created = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/v3/sessions") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Open investigation", exact: true })
        .click();
      let state = await (await created).json();
      const initialization = Date.now() - start;
      const navigate = async (stage) => {
        if (id === "vibration_response")
          await page
            .getByLabel("Investigation stage", { exact: true })
            .selectOption(stage);
        else
          await page
            .getByRole("navigation", { name: "Investigation stages" })
            .getByRole("button", { name: stage, exact: true })
            .click();
      };
      const axe = [];
      async function capture(stage) {
        const a = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        axe.push({ stage, violations: a.violations.map((v) => v.id) });
        if (a.violations.length)
          throw Error(
            "Accessibility " + JSON.stringify(a.violations.map((v) => v.id)),
          );
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Overflow");
        await page.screenshot({
          path: `${out}/screenshots/${id}-${stage}.png`,
          fullPage: true,
        });
      }
      await capture("overview");
      await navigate("Evidence");
      await capture("evidence");
      const latency = [];
      for (let step = 0; state.status !== "COMPLETE" && step < 10; step++) {
        const t = Date.now();
        const pending = page.waitForResponse(
          (r) =>
            r.url().endsWith("/advance") && r.request().method() === "POST",
        );
        await page.locator(".next-guide button.primary").click();
        const response = await pending;
        if (!response.ok()) throw Error("Advance failed " + response.status());
        state = await response.json();
        latency.push({ status: state.status, elapsed_ms: Date.now() - t });
      }
      if (state.status !== "COMPLETE") throw Error("Unfinished");
      if (
        !["deterministic_rules_not_meta", "not_run"].includes(
          state.model_source,
        )
      )
        throw Error("Unexpected model source");
      const expected = {
        misleading_sensor: ["process-pressure", "sensor-pressure"],
        temperature_response: ["process-temperature"],
        vibration_response: ["process-vibration"],
        insufficient: [],
        noisy_multifault: ["process-vibration"],
        normal: ["normal"],
        confounded: [],
      }[id];
      if (JSON.stringify(state.decision.findings) !== JSON.stringify(expected))
        throw Error("Wrong findings");
      if (
        ["noisy_multifault", "confounded"].includes(id) &&
        state.decision.status !== "INCONCLUSIVE"
      )
        throw Error("Expected inconclusive evidence");
      if (id === "insufficient" && state.decision.status !== "ABSTAIN")
        throw Error("Missing abstention");
      for (const stage of ["Possible causes", "Tests", "Results", "Report"]) {
        await navigate(stage);
        await capture(stage.replaceAll(" ", "-"));
      }
      const downloads = [];
      for (const format of ["json", "html"]) {
        const t = Date.now();
        const pending = page.waitForEvent("download");
        await page
          .getByRole("button", {
            name:
              format === "json"
                ? /Download verification record/
                : /Download readable report/,
          })
          .click();
        const file = await pending;
        await file.saveAs(`${out}/${id}.${format}`);
        downloads.push({ format, elapsed_ms: Date.now() - t });
      }
      await navigate("Evidence");
      await page
        .getByRole("button", { name: "Equipment record", exact: true })
        .click();
      await page.getByRole("slider", { name: "Equipment zoom" }).focus();
      await page.keyboard.press("ArrowRight");
      await page
        .getByRole("button", { name: "Pump housing", exact: true })
        .click();
      await capture("equipment");
      const original = JSON.stringify(state);
      await page.reload();
      await page
        .getByRole("heading", { name: "Understand the problem.", exact: true })
        .waitFor();
      const restored = await page.evaluate(
        async (sid) => await (await fetch("/api/v3/sessions/" + sid)).json(),
        state.id,
      );
      if (JSON.stringify(restored) !== original)
        throw Error("Refresh changed state");
      if (state.trials.length >= 4)
        await new Promise((resolve) => setTimeout(resolve, 61000));
      await page
        .getByRole("button", { name: "Change case", exact: true })
        .click();
      const pending = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/v3/sessions") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Open investigation", exact: true })
        .click();
      const fresh = await (await pending).json();
      if (fresh.id === state.id) throw Error("Restart reused session");
      const preserved = await page.evaluate(
        async (sid) => await (await fetch("/api/v3/sessions/" + sid)).json(),
        state.id,
      );
      if (JSON.stringify(preserved) !== original)
        throw Error("Session contamination");
      if (errors.length) throw Error(errors.join(";"));
      results.push({
        case: id,
        width: id === "vibration_response" ? 390 : 1440,
        initial_load_ms: initialLoad,
        initialization_ms: initialization,
        steps: latency,
        downloads,
        decision: state.decision.status,
        findings: state.decision.findings,
        refresh_and_restart_isolation: true,
        axe,
      });
      await context.close();
      console.log(id + " passed");
    }
    fs.writeFileSync(
      out + "/browser-results.json",
      JSON.stringify(results, null, 2) + "\n",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
