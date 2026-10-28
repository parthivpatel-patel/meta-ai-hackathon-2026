// Actual local production app. One viewport/process, with a real persistent-profile restart on desktop.
const { chromium } = require("playwright"),
  { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const width = Number(process.env.FORGE_PHASE8_WIDTH || 1440),
  base = process.env.FORGE_PHASE8_URL || "http://127.0.0.1:8088";
if (
  ![1440, 1366, 768, 390].includes(width) ||
  !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)
)
  throw Error("Approved viewport and literal loopback required");
const scenario = {
  1440: "bearing",
  1366: "misalignment",
  768: "normal",
  390: "cavitation",
}[width];
const out =
  process.env.FORGE_PHASE8_EVIDENCE ||
  `docs/phase-8-final/evidence/acceptance/${width}`;
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync("/tmp/forge-phase8-profile-"),
  checks = [],
  errors = [],
  external = [],
  posts = [],
  timings = [];
const deadline = setTimeout(() => {
  console.error("Bounded browser acceptance deadline exceeded");
  process.exit(1);
}, 240000);
(async () => {
  let context, page;
  async function launch() {
    context = await chromium.launchPersistentContext(profile, {
      executablePath: "/usr/bin/chromium",
      viewport: { width, height: width === 1366 ? 768 : 900 },
      isMobile: width < 500,
      hasTouch: width < 900,
      acceptDownloads: true,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    context.setDefaultTimeout(20000);
    await context.route("**/*", (route) => {
      if (
        !route
          .request()
          .url()
          .startsWith(base + "/")
      ) {
        external.push(route.request().url().split("/").slice(0, 3).join("/"));
        return route.abort();
      }
      return route.continue();
    });
    if (width === 390)
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return ["webgl", "webgl2", "experimental-webgl"].includes(kind)
            ? null
            : original.call(this, kind, ...args);
        };
      });
    page = context.pages()[0] || (await context.newPage());
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.method() === "POST")
        posts.push({
          path: new URL(r.url()).pathname,
          body: JSON.parse(r.postData() || "{}"),
        });
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  const b = (name) => page.getByRole("button", { name, exact: true });
  const response = () => {
    const pending = page.waitForResponse((r) =>
      r.url().endsWith("/api/v4/investigate"),
    );
    pending.catch(() => {}); // Still awaited/asserted; avoid an orphan rejection if the click fails first.
    return pending;
  };
  async function shot(name) {
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    assert.deepEqual(
      a.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "horizontal overflow " + name,
    );
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    checks.push({ view: name, axe_violations: 0 });
    console.log(`${width}: ${name}`);
  }
  async function respectPublicWindow(reason) {
    console.log(
      `${width}: respecting unchanged public write quota (${reason})`,
    );
    for (let half = 0; half < 2; half++)
      await new Promise((resolve) => setTimeout(resolve, 31000));
  }
  async function save() {
    const summary = page
      .locator("summary:visible")
      .filter({ hasText: "Browser recovery" });
    if (!(await summary.locator("..").evaluate((n) => n.open)))
      await summary.click();
    await b("Save browser checkpoint").click();
    await page
      .locator("summary:visible")
      .filter({ hasText: "Checkpoint saved on this browser" })
      .waitFor();
  }
  async function stored() {
    return page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const r = indexedDB.open("forge-recovery", 1);
          r.onerror = reject;
          r.onsuccess = () => {
            const db = r.result,
              q = db
                .transaction("checkpoints")
                .objectStore("checkpoints")
                .get("machine");
            q.onsuccess = () => {
              resolve(q.result);
              db.close();
            };
            q.onerror = reject;
          };
        }),
    );
  }
  async function download(label, path) {
    const p = page.waitForEvent("download");
    await b(label).click();
    await (await p).saveAs(`${out}/${path}`);
  }
  const started = Date.now();
  let finalReport, heapBefore, heapAfter, gpu;
  try {
    await launch();
    await page.goto(base + "/demo");
    await page.getByLabel("Machine scenario", { exact: true }).waitFor();
    timings.push({
      action: "initial_controls_ready",
      ms: Date.now() - started,
    });
    heapBefore = await page.evaluate(
      () => performance.memory?.usedJSHeapSize ?? null,
    );
    if (scenario !== "normal") {
      const ready = page.waitForResponse((r) =>
        r.url().endsWith("/api/v4/simulate"),
      );
      await page
        .getByLabel("Machine scenario", { exact: true })
        .selectOption(scenario);
      assert.equal((await ready).status(), 200);
    }
    await b("Focus scenario window").focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.getByLabel("Machine recording position").inputValue(),
      "319",
    );
    if (width === 390)
      await page.getByText("2D inspection mode", { exact: true }).waitFor();
    await shot("observed-ready");
    let p = response(),
      at = Date.now();
    await b("Capture observation window").click();
    let report = await (await p).json();
    timings.push({ action: "capture", ms: Date.now() - at });
    assert.equal(report.trials.length, 0);
    while (report.plan) {
      assert.ok(report.trials.length < 4, "selector exceeded budget");
      const old = report;
      p = response();
      at = Date.now();
      await b("Run proposed simulated test").click();
      report = await (await p).json();
      timings.push({
        action: "explicit_test_" + report.trials.length,
        ms: Date.now() - at,
      });
      assert.equal(report.trials.length, old.trials.length + 1);
      assert.deepEqual(report.trials.slice(0, -1), old.trials);
      if (report.trials.length === 1) {
        await page
          .getByRole("button", { name: /inspect machine response/ })
          .last()
          .click();
        await page
          .getByText("Counterfactual test result", { exact: true })
          .waitFor();
        assert.ok(
          await page
            .getByText("Counterfactual test sample", { exact: true })
            .count(),
        );
        assert.equal(
          await page
            .getByText("Observed synthetic sample", { exact: true })
            .count(),
          0,
        );
        const count = posts.length;
        await page
          .locator(".component-inspector")
          .getByRole("button", {
            name: "Resume existing investigation",
            exact: true,
          })
          .click();
        assert.equal(posts.length, count, "resume mutation");
        await b("Machine").click();
        await b("Return to observed simulation").click();
        assert.equal(posts.length, count, "observed return mutation");
        await b("Investigation").click();
        await save();
        assert.deepEqual((await stored()).data.report, report);
        await shot("one-test-resumed");
        if (report.plan) {
          await page.reload();
          const recovered = response();
          await b("Restore browser checkpoint").click();
          assert.deepEqual(await (await recovered).json(), report);
          await page
            .getByRole("heading", {
              name: "Investigation workspace",
              exact: true,
            })
            .waitFor();
          checks.push({
            recovery: "one-test refresh",
            report_hash: report.report_hash,
            additional_tests: 0,
          });
          await respectPublicWindow("after rapid checkpoint reproduction");
        }
      }
    }
    finalReport = report;
    assert.ok(
      ["SUPPORTED_SYNTHETIC", "INCONCLUSIVE"].includes(report.decision.status),
    );
    assert.equal(await b("Run proposed simulated test").count(), 0);
    const expected =
      width === 1440
        ? "Investigation complete — supported after 2 of 4 permitted tests"
        : width === 1366
          ? "Investigation complete — budget exhausted after 4 of 4 permitted tests"
          : width === 768
            ? "Investigation complete — supported after 1 of 4 permitted tests"
            : "Investigation complete — inconclusive after 3 of 4 permitted tests";
    await page.getByRole("heading", { name: expected, exact: true }).waitFor();
    await shot("terminal-explained");
    await b("Review and export report").click();
    await page.getByRole("region", { name: "Report preview" }).waitFor();
    await download("Export investigation JSON", "report.json");
    await download("Export investigation HTML", "report.html");
    assert.deepEqual(JSON.parse(fs.readFileSync(`${out}/report.json`)), report);
    assert.match(
      fs.readFileSync(`${out}/report.html`, "utf8"),
      /Test stopping policy/,
    );
    await save();
    await download("Export recovery checkpoint", "checkpoint.json");
    await shot("report-ready");
    const bookmark = await stored();
    assert.deepEqual(bookmark.data.report, report);
    if (width === 1440) {
      await respectPublicWindow("before actual browser restart");
      await context.close();
      await launch();
      await page.goto(base + "/demo");
      await page.getByLabel("Machine scenario", { exact: true }).waitFor();
      await b("Restore browser checkpoint").waitFor({ timeout: 30000 });
      const recovery = response();
      await b("Restore browser checkpoint").click();
      assert.deepEqual(await (await recovery).json(), report);
      await page.getByRole("region", { name: "Report preview" }).waitFor();
      await shot("browser-restart-restored");
      checks.push({
        recovery: "actual persistent Chromium restart",
        report_hash: report.report_hash,
        additional_tests: 0,
      });
    }
    await b("Return to machine").click();
    await page
      .getByLabel("Machine component", { exact: true })
      .selectOption("base");
    assert.equal(
      await page
        .locator(".component-inspector")
        .getByRole("button", {
          name: "Resume existing investigation",
          exact: true,
        })
        .isEnabled(),
      true,
    );
    await page
      .getByLabel("Machine component", { exact: true })
      .selectOption(report.request.context.component_id);
    if (await b("Return to observed simulation").count())
      await b("Return to observed simulation").click();
    await page
      .locator("summary")
      .filter({ hasText: "Capture new evidence" })
      .click();
    await page.route(
      "**/api/v4/investigate",
      (route) => route.abort("failed"),
      { times: 1 },
    );
    await b("Capture new observation window").click();
    await page
      .getByRole("alert")
      .filter({ hasText: /current investigation is preserved/ })
      .waitFor();
    await page
      .locator(".component-inspector")
      .getByRole("button", {
        name: "Resume existing investigation",
        exact: true,
      })
      .click();
    await save();
    assert.deepEqual((await stored()).data.report, report);
    await shot("unavailable-backend-preserves-report");
    await b("Dismiss").click();
    const malformed = { ...bookmark, schema: "unsupported" };
    await page.getByLabel("Import machine checkpoint").setInputFiles({
      name: "unsupported.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(malformed)),
    });
    await page
      .getByRole("alert")
      .filter({ hasText: /Recovery import rejected/ })
      .waitFor();
    assert.deepEqual((await stored()).data.report, report);
    checks.push({ failure: "invalid schema", preserved: true });
    await b("Reports").click();
    assert.ok(
      await page.getByText(report.report_hash, { exact: true }).count(),
    );
    if (width === 768) {
      await b("Evidence").click();
      await page.getByLabel("Import recording", { exact: true }).setInputFiles({
        name: "missing.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            schema: "forge-telemetry-1",
            machine_id: "pump-104",
            samples: [
              {
                timestamp: "2026-10-27T08:00:00Z",
                sensor_id: "vibration",
                component_id: "bearing",
                value: null,
                unit: "mm/s",
              },
            ],
          }),
        ),
      });
      await page.getByText(/Imported operator recording/).waitFor();
      await b("Telemetry").click();
      await page
        .getByLabel("Machine component", { exact: true })
        .selectOption("bearing");
      assert.ok(
        await page.getByText(/No valid readings in this window/).count(),
      );
      await shot("missing-import-explicit");
    }
    gpu = await page
      .locator("canvas")
      .first()
      .evaluate((n) => ({ ...n.dataset }))
      .catch(() => ({ mode: "2D fallback" }));
    heapAfter = await page.evaluate(
      () => performance.memory?.usedJSHeapSize ?? null,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
  } catch (error) {
    await page
      ?.screenshot({ path: `${out}/failure.png`, fullPage: true })
      .catch(() => {});
    console.error("Acceptance failure:", error);
    throw error;
  } finally {
    clearTimeout(deadline);
    fs.writeFileSync(
      `${out}/results.json`,
      JSON.stringify(
        {
          width,
          scenario,
          checks,
          timings,
          errors,
          external,
          heap_before_bytes: heapBefore,
          heap_after_bytes: heapAfter,
          renderer: gpu,
          scope:
            "Local Chromium/software SwiftShader; viewport/touch emulation, not public cold-start latency or hardware GPU performance",
          report_hash: finalReport?.report_hash,
          trials: finalReport?.trials.length,
          status: finalReport?.decision.status,
          post_paths: posts.map((p) => p.path),
          genuine_requests: 0,
        },
        null,
        2,
      ) + "\n",
    );
    const close = setTimeout(() => process.exit(1), 10000);
    await context?.close();
    clearTimeout(close);
  }
  console.log(
    JSON.stringify({
      passed: true,
      width,
      scenario,
      trials: finalReport.trials.length,
      views: checks.filter((c) => c.view).length,
      genuine_requests: 0,
    }),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
