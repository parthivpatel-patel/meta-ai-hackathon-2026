// Production loopback only. The runner evicts ONLY its own disposable SQLite sessions.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
(async () => {
  const out =
    process.env.FORGE_FINAL_EVIDENCE || "docs/final-experience/evidence";
  fs.mkdirSync(out + "/screenshots", { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const results = [];
  async function setup(port, width = 1440, height = 900, fallback = false) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 500,
      hasTouch: width < 500,
      acceptDownloads: true,
    });
    if (fallback)
      await ctx.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (k, ...a) {
          return ["webgl", "webgl2", "experimental-webgl"].includes(k)
            ? null
            : get.call(this, k, ...a);
        };
      });
    const p = await ctx.newPage(),
      errors = [],
      external = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1:"))
        external.push(r.url().split("/").slice(0, 3).join("/"));
    });
    await p.goto(`http://127.0.0.1:${port}/demo`);
    return { ctx, p, errors, external };
  }
  async function shot(p, name) {
    const a = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const violations = a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    }));
    if (violations.length) throw Error(JSON.stringify({ name, violations }));
    if (
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    )
      throw Error("Overflow " + name);
    await p.screenshot({
      path: `${out}/screenshots/${name}.png`,
      fullPage: true,
    });
    results.push({ view: name, violations });
  }
  async function save(p) {
    const summary = p
      .locator("summary:visible")
      .filter({ hasText: "Browser recovery" });
    if (!(await summary.locator("..").evaluate((n) => n.open)))
      await summary.click();
    await p
      .getByRole("button", { name: "Save browser checkpoint", exact: true })
      .click();
    await p
      .locator("summary:visible")
      .filter({
        hasText: "Browser recovery · Checkpoint saved on this browser",
      })
      .waitFor();
  }
  async function stored(p, kind) {
    return p.evaluate(
      (kind) =>
        new Promise((res, rej) => {
          const r = indexedDB.open("forge-recovery", 1);
          r.onsuccess = () => {
            const q = r.result
              .transaction("checkpoints")
              .objectStore("checkpoints")
              .get(kind);
            q.onsuccess = () => res(q.result);
            q.onerror = rej;
          };
          r.onerror = rej;
        }),
      kind,
    );
  }
  async function exportReports(p, prefix, names) {
    for (const [label, format] of names) {
      const next = p.waitForEvent("download");
      await p.getByRole("button", { name: new RegExp("^" + label) }).click();
      await (await next).saveAs(`${out}/${prefix}.${format}`);
    }
  }
  try {
    {
      const { ctx, p, errors, external } = await setup(8071);
      await p.getByLabel("Machine component", { exact: true }).waitFor();
      await p.getByRole("button", { name: "Cases", exact: true }).click();
      await p
        .getByRole("button", {
          name: "Start bearing degradation case",
          exact: true,
        })
        .click();
      await p.waitForFunction(
        () =>
          document.querySelector('select[aria-label="Machine scenario"]')
            ?.value === "bearing",
      );
      await p
        .getByRole("button", { name: "Focus scenario window", exact: true })
        .click();
      await shot(p, "desktop-selected-case");
      await p.getByRole("button", { name: "Telemetry", exact: true }).click();
      await shot(p, "desktop-telemetry");
      let next = p.waitForResponse((r) =>
        r.url().endsWith("/api/v4/investigate"),
      );
      await p
        .getByRole("button", {
          name: "Capture observation window",
          exact: true,
        })
        .click();
      let report = await (await next).json();
      for (const mode of [
        "Machine",
        "Investigation",
        "Experiments",
        "Verification",
        "Reports",
        "Evidence",
        "Replay",
        "Investigation",
      ]) {
        await p.getByRole("button", { name: mode, exact: true }).click();
        if (
          (await p
            .getByLabel("Machine component", { exact: true })
            .inputValue()) !== "bearing"
        )
          throw Error("Selection lost");
      }
      while (report.plan) {
        await p
          .getByRole("button", { name: "Experiments", exact: true })
          .click();
        next = p.waitForResponse((r) =>
          r.url().endsWith("/api/v4/investigate"),
        );
        await p
          .getByRole("button", {
            name: "Run proposed simulated test",
            exact: true,
          })
          .click();
        report = await (await next).json();
      }
      await p.getByRole("button", { name: "Reports", exact: true }).click();
      await save(p);
      const before = await stored(p, "machine");
      if (before.data.report.report_hash !== report.report_hash)
        throw Error("Checkpoint lost report");
      await p.reload();
      await p
        .getByRole("button", {
          name: "Restore browser checkpoint",
          exact: true,
        })
        .click();
      await p.getByRole("region", { name: "Report preview" }).waitFor();
      if (!(await p.getByText(report.report_hash, { exact: true }).count()))
        throw Error("Recovery changed provenance");
      await shot(p, "desktop-restored-report");
      await exportReports(p, "machine-recovered", [
        ["Export investigation JSON", "json"],
        ["Export investigation HTML", "html"],
      ]);
      await p
        .getByRole("button", { name: "Status / About", exact: true })
        .click();
      await shot(p, "desktop-status");
      if (errors.length || external.length)
        throw Error(JSON.stringify({ errors, external }));
      results.push({
        journey: "machine",
        source: "rules",
        checkpoint_hash: report.report_hash,
        trials: report.trials.length,
        refresh_reproduced: true,
        errors,
        external,
      });
      await ctx.close();
    }
    {
      const { ctx, p, errors, external } = await setup(8072, 1366, 768);
      await p.getByLabel("Machine component", { exact: true }).waitFor();
      await p.getByRole("button", { name: "Cases", exact: true }).click();
      await p
        .getByRole("button", { name: "Investigation library", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Open investigation", exact: true })
        .click();
      await p
        .getByText("Inspect the case measurements", { exact: true })
        .waitFor();
      await p
        .getByLabel("Case component", { exact: true })
        .selectOption("bearing");
      await p.getByLabel("Case observation position", { exact: true }).focus();
      await p.keyboard.press("Home");
      await p.keyboard.press("ArrowRight");
      await shot(p, "laptop-library-machine");
      let s;
      for (const label of [
        "Examine the evidence",
        "Prepare possible causes",
        "Choose the next test",
        "Run the next test",
      ]) {
        if (label === "Examine the evidence") {
          await p.getByRole("button", { name: label, exact: true }).click();
          continue;
        }
        const response = p.waitForResponse((r) => r.url().endsWith("/advance"));
        await p.getByRole("button", { name: label, exact: true }).click();
        s = await (await response).json();
      }
      if (s.trials.length !== 1) throw Error("Wrong initial history");
      await save(p);
      const cached = await stored(p, "library");
      if (cached.data.session.trials.length !== 1)
        throw Error("Legacy cache missing trial");
      const env = { ...process.env };
      for (const k of [
        "DOCKER_HOST",
        "DOCKER_CONTEXT",
        "DOCKER_TLS",
        "DOCKER_TLS_VERIFY",
        "DOCKER_CERT_PATH",
      ])
        delete env[k];
      execFileSync(
        "docker",
        [
          "--host=unix:///var/run/docker.sock",
          "exec",
          "forge-phase7-8072",
          "/app/backend/.venv/bin/python",
          "-c",
          "import sqlite3; c=sqlite3.connect('/tmp/forge-data/investigations.sqlite3'); c.execute('DELETE FROM sessions'); c.commit(); c.close()",
        ],
        { env, stdio: "pipe" },
      );
      await p.reload();
      await p
        .getByRole("button", {
          name: "Restore browser checkpoint",
          exact: true,
        })
        .waitFor();
      const restored = p.waitForResponse((r) =>
        r.url().endsWith("/api/v6/recover"),
      );
      await p
        .getByRole("button", {
          name: "Restore browser checkpoint",
          exact: true,
        })
        .click();
      const recovered = await (await restored).json();
      s = recovered.session;
      if (
        s.id === cached.data.session.id ||
        JSON.stringify(s.trials) !==
          JSON.stringify(cached.data.session.trials) ||
        recovered.recovery.future_experiments_executed !== 0
      )
        throw Error("Recovery fabricated/changed history");
      await p
        .getByText(/Independently reproduced browser checkpoint/)
        .waitFor();
      await p.getByRole("button", { name: "Machine", exact: true }).click();
      if (
        (await p.getByLabel("Case component", { exact: true }).inputValue()) !==
          "bearing" ||
        (await p
          .getByLabel("Case observation position", { exact: true })
          .inputValue()) !== "1"
      )
        throw Error("Restored case inspection was lost");
      await shot(p, "laptop-restored-after-server-loss");
      while (s.status !== "COMPLETE") {
        await p
          .getByRole("button", { name: "Experiments", exact: true })
          .click();
        const label =
          s.status === "EXPERIMENT_SELECTED"
            ? "Run the next test"
            : s.status === "OBSERVED"
              ? "Prepare possible causes"
              : "Choose the next test";
        const response = p.waitForResponse((r) => r.url().endsWith("/advance"));
        await p.getByRole("button", { name: label, exact: true }).click();
        s = await (await response).json();
      }
      await p.getByRole("button", { name: "Reports", exact: true }).click();
      await shot(p, "laptop-library-report");
      await exportReports(p, "library-recovered", [
        ["Download verification record", "json"],
        ["Download readable report", "html"],
      ]);
      if (errors.length || external.length)
        throw Error(JSON.stringify({ errors, external }));
      results.push({
        journey: "library",
        server_sessions_evicted: true,
        prior_trials: 1,
        restored_prior_trials: recovered.session.trials.length,
        final_trials: s.trials.length,
        future_test_still_explicit: true,
        errors,
        external,
      });
      await ctx.close();
    }
    {
      const { ctx, p, errors, external } = await setup(8073, 390, 844, true);
      await p.getByLabel("Machine component", { exact: true }).waitFor();
      await p.getByRole("button", { name: "Evidence", exact: true }).click();
      await p
        .getByLabel("Import recording", { exact: true })
        .setInputFiles("docs/unified/evidence/model/fixture-initial.json");
      await p
        .locator(".source-label")
        .filter({ hasText: "Recorded fixture proposals" })
        .waitFor();
      await save(p);
      await p.reload();
      await p
        .getByRole("button", {
          name: "Restore browser checkpoint",
          exact: true,
        })
        .click();
      await p
        .locator(".source-label")
        .filter({ hasText: "Recorded fixture proposals" })
        .waitFor();
      await shot(p, "mobile-restored-proposal");
      const summary = p
        .locator("summary:visible")
        .filter({ hasText: "Browser recovery" });
      await summary.click();
      const bad = {
        ...(await stored(p, "machine")),
        private_receipt: { api_key: "fixture-only-not-a-secret" },
      };
      await p
        .getByLabel("Import machine checkpoint", { exact: true })
        .setInputFiles({
          name: "bad.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(bad)),
        });
      await p
        .getByRole("alert")
        .filter({ hasText: "Recovery import rejected" })
        .waitFor();
      await p.getByRole("button", { name: "Machine", exact: true }).click();
      await p.getByText("2D inspection mode", { exact: true }).waitFor();
      await shot(p, "mobile-accessible-recovery");
      if (errors.length || external.length)
        throw Error(JSON.stringify({ errors, external }));
      results.push({
        journey: "fixture",
        source: "test_transport",
        genuine_requests: 0,
        invalid_private_import_rejected: true,
        errors,
        external,
      });
      await ctx.close();
    }
    fs.writeFileSync(
      out + "/browser-results.json",
      JSON.stringify(results, null, 2) + "\n",
    );
    console.log(
      "Unified cases, independent browser recovery, server session loss, fixture provenance and failure handling passed; zero genuine requests.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
