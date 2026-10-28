// Local production regression only. No provider traffic or production-session mutation.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const mode = process.env.FORGE_RESUME_MODE || "after";
const base = process.env.FORGE_RESUME_URL || "http://127.0.0.1:8082";
if (
  !/^http:\/\/127\.0\.0\.1:\d+$/.test(base) ||
  !["before", "after"].includes(mode)
)
  throw Error("Local-only regression settings required");
const out =
  process.env.FORGE_RESUME_EVIDENCE ||
  `docs/investigation-resume/evidence/${mode}`;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const results = [];
  // Isolate desktop/mobile graphics lifecycles in separate runner processes.
  const widths = [Number(process.env.FORGE_RESUME_WIDTH || 1440)];
  if (widths.some((width) => ![1440, 390].includes(width)))
    throw Error("Unsupported regression viewport");
  const deadline = setTimeout(() => {
    console.error("Browser regression deadline exceeded");
    process.exit(1);
  }, 240000);
  try {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        isMobile: width < 500,
        hasTouch: width < 500,
        acceptDownloads: true,
      });
      context.setDefaultTimeout(15000);
      console.log(`Starting ${mode} viewport ${width}`);
      const page = await context.newPage(),
        errors = [],
        external = [],
        posts = [];
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
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) => {
        if (r.method() === "POST")
          posts.push({
            path: new URL(r.url()).pathname,
            body: JSON.parse(r.postData() || "{}"),
          });
      });
      const button = (name) => page.getByRole("button", { name, exact: true });
      const inspector = page.locator(".component-inspector");
      const navigate = async (name) => button(name).click();
      const shot = async (name) => {
        const a = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.equal(
          a.violations.length,
          0,
          JSON.stringify(a.violations.map((v) => v.id)),
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          "horizontal overflow",
        );
        await page.screenshot({
          path: `${out}/${width}-${name}.png`,
          fullPage: true,
        });
        results.push({ width, view: name, axe_violations: 0 });
      };
      const mutationCount = () => posts.length;
      const response = () =>
        page.waitForResponse((r) => r.url().endsWith("/api/v4/investigate"));
      const save = async () => {
        const summary = page
          .locator("summary:visible")
          .filter({ hasText: "Browser recovery" });
        if (!(await summary.locator("..").evaluate((n) => n.open)))
          await summary.click();
        await button("Save browser checkpoint").click();
        await page
          .locator("summary:visible")
          .filter({ hasText: "Checkpoint saved on this browser" })
          .waitFor();
      };
      const stored = () =>
        page.evaluate(
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
                q.onerror = reject;
                q.onsuccess = () => {
                  resolve(q.result);
                  db.close();
                };
              };
            }),
        );
      const assertSaved = async (report) => {
        await save();
        assert.deepEqual((await stored()).data.report, report);
      };
      console.log(`Loading ${width}`);
      await page.goto(base + "/demo");
      console.log(`Loaded ${width}`);
      await page
        .getByLabel("Machine scenario", { exact: true })
        .selectOption("bearing");
      await button("Focus scenario window").click();
      assert.equal(
        await page
          .getByLabel("Machine component", { exact: true })
          .inputValue(),
        "bearing",
      );
      assert.equal(
        await page.getByLabel("Machine recording position").inputValue(),
        "319",
      );
      let pending = response();
      await button("Capture observation window").click();
      const capture = await (await pending).json();
      console.log(`Captured ${width}`);
      assert.equal(capture.trials.length, 0);
      pending = response();
      await button("Run proposed simulated test").click();
      const report = await (await pending).json();
      assert.equal(report.trials.length, 1);
      console.log(`Test completed ${width}`);
      assert.ok(report.plan);
      fs.writeFileSync(
        `${out}/${width}-one-test-report.json`,
        JSON.stringify(report, null, 2) + "\n",
      );
      await page
        .getByRole("button", { name: /inspect machine response/ })
        .click();
      await page
        .getByText("Counterfactual test result", { exact: true })
        .waitFor();
      assert.equal(
        await page.getByLabel("Machine recording position").inputValue(),
        "319",
      );
      assert.equal(
        await page
          .getByLabel("Machine component", { exact: true })
          .inputValue(),
        "bearing",
      );
      const before = mutationCount();
      if (mode === "before") {
        assert.equal(
          await inspector
            .getByRole("button", {
              name: "Investigate selected component",
              exact: true,
            })
            .isDisabled(),
          true,
        );
        assert.equal(
          await inspector
            .getByRole("button", {
              name: "Resume existing investigation",
              exact: true,
            })
            .count(),
          0,
        );
        await shot("counterfactual-capture-disabled");
        await navigate("Investigation");
        await assertSaved(report);
        results.push({
          width,
          reproduced: true,
          cause:
            "Counterfactual preview disables new capture; inspector has no resume action",
          trials: 1,
          report_hash: report.report_hash,
        });
      } else {
        await inspector
          .getByText("Capture new evidence", { exact: true })
          .click();
        const newCapture = inspector.getByRole("button", {
          name: "Capture new observation window",
          exact: true,
        });
        assert.equal(await newCapture.isDisabled(), true);
        await inspector
          .getByText(
            /These samples are simulated experiment outcomes, not observed evidence/,
          )
          .waitFor();
        const resume = inspector.getByRole("button", {
          name: "Resume existing investigation",
          exact: true,
        });
        assert.equal(await resume.isEnabled(), true);
        await shot("counterfactual-resume-enabled");
        await resume.click();
        await page
          .getByRole("heading", {
            name: "Investigation workspace",
            exact: true,
          })
          .waitFor();
        assert.equal(mutationCount(), before, "resume sent a mutation");
        await shot("resumed-one-test-investigation");
        for (const name of [
          "Experiments",
          "Verification",
          "Reports",
          "Telemetry",
          "Machine",
        ])
          await navigate(name);
        assert.equal(mutationCount(), before, "navigation sent a mutation");
        await button("Return to observed simulation").click();
        assert.equal(
          await newCapture.isEnabled(),
          true,
          "observed evidence should be eligible",
        );
        assert.equal(
          mutationCount(),
          before,
          "return to observation sent a mutation",
        );
        await shot("observed-capture-eligible");
        await assertSaved(report);
        await page
          .getByLabel("Machine component", { exact: true })
          .selectOption("coupling");
        await resume.click();
        await assertSaved(report);
        assert.equal(
          (await stored()).data.report.request.context.component_id,
          "bearing",
          "selection recaptured evidence",
        );
        await navigate("Machine");
        await page
          .getByLabel("Machine component", { exact: true })
          .selectOption("bearing");
        await page.getByLabel("Machine recording position").fill("318");
        assert.equal(
          await newCapture.isDisabled(),
          true,
          "short acquisition must stay blocked",
        );
        assert.equal(
          await resume.isEnabled(),
          true,
          "short acquisition must not block resume",
        );
        await page.getByLabel("Machine recording position").fill("319");
        assert.equal(await newCapture.isEnabled(), true);
        await assertSaved(report);
        await page.reload();
        const reconstruct = page.waitForResponse((r) =>
          r.url().endsWith("/api/v4/investigate"),
        );
        await button("Restore browser checkpoint").click();
        const restored = await (await reconstruct).json();
        assert.deepEqual(restored, report);
        await inspector
          .getByRole("button", {
            name: "Resume existing investigation",
            exact: true,
          })
          .waitFor();
        assert.equal(
          await inspector
            .getByRole("button", {
              name: "Resume existing investigation",
              exact: true,
            })
            .isEnabled(),
          true,
        );
        await inspector
          .getByText("Capture new evidence", { exact: true })
          .click();
        assert.equal(
          await inspector
            .getByRole("button", {
              name: "Capture new observation window",
              exact: true,
            })
            .isEnabled(),
          true,
        );
        await assertSaved(report);
        await shot("restored-observed-investigation");
        const resumedCount = mutationCount();
        await inspector
          .getByRole("button", {
            name: "Resume existing investigation",
            exact: true,
          })
          .click();
        assert.equal(mutationCount(), resumedCount);
        pending = response();
        await button("Run proposed simulated test").click();
        const advanced = await (await pending).json();
        assert.equal(advanced.trials.length, 2);
        assert.deepEqual(advanced.trials[0], report.trials[0]);
        assert.deepEqual(advanced.events[0], report.events[0]);
        fs.writeFileSync(
          `${out}/${width}-continued-report.json`,
          JSON.stringify(advanced, null, 2) + "\n",
        );
        results.push({
          width,
          resume_mutations: 0,
          observed_return_mutations: 0,
          prior_trials_preserved: true,
          recovery_reproduced: true,
          continued_trials: 2,
          original_hash: report.report_hash,
          restored_hash: restored.report_hash,
          post_paths: posts.map((p) => p.path),
          genuine_requests: 0,
        });
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      console.log(`Completed ${mode} viewport ${width}`);
      await context.close();
      console.log(`Closed ${mode} viewport ${width}`);
    }
  } catch (error) {
    console.error("Browser journey failed:", error);
    throw error;
  } finally {
    clearTimeout(deadline);
    console.log("Writing browser results and closing browser");
    fs.writeFileSync(
      `${out}/browser-results-${widths.join("-")}.json`,
      JSON.stringify({ mode, base, results }, null, 2) + "\n",
    );
    const closeDeadline = setTimeout(() => {
      console.error("Browser teardown deadline exceeded");
      process.exit(1);
    }, 10000);
    await browser.close();
    clearTimeout(closeDeadline);
  }
  console.log(
    JSON.stringify({
      mode,
      views: results.filter((r) => "axe_violations" in r).length,
      journeys: results.filter((r) => r.width && !("view" in r)).length,
      passed: true,
      genuine_requests: 0,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
