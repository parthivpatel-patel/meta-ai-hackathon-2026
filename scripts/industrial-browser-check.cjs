// Actual local public containers: scenario endpoints8050..8056. Optional Playwright/Axe tooling.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
(async () => {
  const out =
    process.env.FORGE_INDUSTRIAL_EVIDENCE || "docs/industrial/evidence";
  fs.mkdirSync(out + "/screenshots", { recursive: true });
  const results = [];
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const cases = [
    "normal",
    "bearing",
    "misalignment",
    "cavitation",
    "pressure_sensor",
    "thermal",
    "process",
  ];
  try {
    for (const [index, scenario] of cases.entries()) {
      const width = scenario === "pressure_sensor" ? 390 : 1440;
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        hasTouch: width === 390,
        isMobile: width === 390,
        acceptDownloads: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (scenario === "cavitation")
        await page.addInitScript(() => {
          const get = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
            if (["webgl", "webgl2", "experimental-webgl"].includes(kind))
              return null;
            return get.call(this, kind, ...args);
          };
        });
      const started = Date.now();
      await page.goto(`http://127.0.0.1:${8050 + index}/demo`);
      await page.getByLabel("Machine component", { exact: true }).waitFor();
      const initial_ms = Date.now() - started;
      if (scenario !== "normal") {
        const pending = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/v4/simulate") &&
            r.request().method() === "POST",
        );
        await page
          .getByLabel("Machine scenario", { exact: true })
          .selectOption(scenario);
        if (!(await pending).ok()) throw Error("Scenario rejected");
      }
      if (scenario === "cavitation")
        await page.getByText("2D inspection mode", { exact: true }).waitFor();
      else await page.locator("canvas").waitFor();
      const phaseBefore = scenario === "cavitation" ? null : await page.locator("canvas").getAttribute("data-rotor-phase");
      const checks = [];
      async function capture(name) {
        const a = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        checks.push({
          view: name,
          violations: a.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        });
        if (a.violations.length) throw Error(JSON.stringify(checks.at(-1)));
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Overflow");
        await page.screenshot({
          path: `${out}/screenshots/${scenario}-${name}.png`,
          fullPage: true,
        });
      }
      await page
        .getByRole("button", { name: "Start simulation / Resume", exact: true })
        .click();
      await page.waitForTimeout(1100);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      if (phaseBefore !== null) {
        const phaseAfter = await page.locator("canvas").getAttribute("data-rotor-phase");
        if (phaseAfter === phaseBefore || phaseAfter === "unavailable") throw Error("Rotor phase did not follow recorded RPM");
        await page.waitForTimeout(600);
        if (await page.locator("canvas").getAttribute("data-rotor-phase") !== phaseAfter) throw Error("Paused rotor continued changing");
      }
      if (
        Number(
          await page
            .getByLabel("Machine recording position", { exact: true })
            .inputValue(),
        ) === 0
      )
        throw Error("Playback did not advance");
      await page
        .getByRole("button", { name: "Focus scenario window", exact: true })
        .click();
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      await page
        .getByRole("button", { name: "Orbit left", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Inspection view", exact: true })
        .click();
      await capture("machine");
      const pending = page.waitForResponse((r) =>
        r.url().endsWith("/api/v4/investigate"),
      );
      await page
        .getByRole("button", {
          name: "Investigate selected component",
          exact: true,
        })
        .click();
      let report = await (await pending).json();
      const steps = [];
      for (let i = 0; report.plan && i < 4; i++) {
        const start = Date.now();
        const result = page.waitForResponse((r) =>
          r.url().endsWith("/api/v4/investigate"),
        );
        await page
          .getByRole("button", {
            name: "Run proposed simulated test",
            exact: true,
          })
          .click();
        const response = await result;
        if (!response.ok()) throw Error("Experiment rejected");
        report = await response.json();
        steps.push(Date.now() - start);
        await page.waitForFunction(() =>
          [...document.querySelectorAll("button")].some((button) =>
            button.textContent.trim() === "Investigate selected component" && button.disabled),
        );
      }
      if (
        report.decision.status === "IN_PROGRESS" ||
        report.provider !== "rules-based, not Meta"
      )
        throw Error("Unfinished or mislabeled");
      if (
        scenario === "pressure_sensor" &&
        !report.decision.findings.includes("sensor-pressure")
      )
        throw Error("Sensor explanation absent");
      if (
        ["cavitation", "misalignment"].includes(scenario) &&
        report.decision.status !== "INCONCLUSIVE"
      )
        throw Error("Expected uncertainty");
      await capture("verification");
      for (const format of ["JSON", "HTML"]) {
        const result = page.waitForEvent("download");
        await page
          .getByRole("button", {
            name: "Export investigation " + format,
            exact: true,
          })
          .click();
        const file = await result;
        await file.saveAs(`${out}/${scenario}.${format.toLowerCase()}`);
      }
      const gpu = await page
        .locator("canvas")
        .evaluateAll((nodes) =>
          nodes.map((n) => ({
            draw_calls: n.dataset.drawCalls,
            triangles: n.dataset.triangles,
          })),
        );
      await page.getByRole("button", { name: "Evidence", exact: true }).click();
      // Four-test journeys plus report reproduction exceed the established
      // ten-writes/minute public quota. Wait for its normal window; never relax it.
      if (report.trials.length >= 4) await page.waitForTimeout(61000);
      await page.getByLabel("Import recording", { exact: true })
        .setInputFiles(`${out}/${scenario}.json`);
      await page.getByText(/Captured from/).waitFor();
      await page.getByRole("button", { name: "Evidence", exact: true }).click();
      const tampered = JSON.parse(fs.readFileSync(`${out}/${scenario}.json`));
      tampered.measurements[0].pressure += 1;
      await page.getByLabel("Import recording", { exact: true }).setInputFiles({
        name: "tampered-report.json", mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(tampered)),
      });
      await page.getByRole("alert").filter({ hasText: "does not match independent reproduction" }).waitFor();
      await page.getByRole("button", { name: "Dismiss", exact: true }).click();
      const exported = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Export telemetry JSON", exact: true })
        .click();
      const telemetry = await exported;
      const filePath = await telemetry.path();
      const stat = fs.statSync(filePath);
      if (stat.size > 1048576) throw Error("Own export exceeds import bound");
      await page
        .getByLabel("Import recording", { exact: true })
        .setInputFiles(filePath);
      await page.getByText(/Imported synthetic recording/).waitFor();
      if (
        await page
          .getByRole("button", {
            name: "Investigate selected component",
            exact: true,
          })
          .isEnabled()
      )
        throw Error("Imported telemetry has an intervention oracle");
      await page
        .getByLabel("Import recording", { exact: true })
        .setInputFiles({
          name: "bad.json",
          mimeType: "application/json",
          buffer: Buffer.from(
            '{"schema":"forge-telemetry-1","machine_id":"pump-104","samples":[{"timestamp":"2026-02-30T00:00:00Z","sensor_id":"rpm","component_id":"motor","value":3000,"unit":"rpm"}]}',
          ),
        });
      await page.getByRole("alert").waitFor();
      await page.getByRole("button", { name: "Dismiss", exact: true }).click();
      if (errors.length) throw Error(errors.join(";"));
      results.push({
        scenario,
        width,
        webgl: scenario !== "cavitation",
        initial_ms,
        experiment_ui_ms: steps,
        decision: report.decision.status,
        findings: report.decision.findings,
        telemetry_roundtrip_bytes: stat.size,
        report_import_verified: true,
        tampered_report_rejected: true,
        preview_new_capture_disabled: true,
        gpu,
        checks,
      });
      await context.close();
      console.log(scenario + " passed");
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
