// Actual restricted local server plus the explicitly offline CLI transport fixture.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
(async () => {
  const out = path.resolve(process.env.FORGE_META_EVIDENCE || "docs/meta-final/evidence/browser");
  fs.mkdirSync(out + "/screenshots", { recursive: true });
  const local = fs.mkdtempSync("/tmp/forge-meta-browser-private-");
  const results = [];
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let preparationRequests = 0, advanceRequests = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/v5/prepare")) preparationRequests++;
      if (r.url().endsWith("/api/v5/advance")) advanceRequests++;
    });
    async function capture(name, p = page) {
      const a = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const violations = a.violations.map((x) => ({ id: x.id, targets: x.nodes.map((n) => n.target) }));
      if (violations.length) throw Error(JSON.stringify(violations));
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error("Overflow");
      await p.screenshot({ path: out + "/screenshots/" + name + ".png", fullPage: true });
      results.push({ view: name, violations });
    }
    await page.goto("http://127.0.0.1:8059/demo");
    await page.getByLabel("Machine component", { exact: true }).waitFor();
    await page.getByLabel("Machine scenario", { exact: true }).selectOption("bearing");
    await page.getByRole("button", { name: "Focus scenario window", exact: true }).click();
    const captureResponse = page.waitForResponse((r) => r.url().endsWith("/api/v4/investigate"));
    const started = Date.now();
    await page.getByRole("button", { name: "Investigate selected component", exact: true }).click();
    const initial = await (await captureResponse).json();
    const capture_ms = Date.now() - started;
    if (initial.request.experiments !== 0) throw Error("Capture already contains trials");
    await page.getByText("Hypothesis source and private Meta pathway", {exact:true}).click();
    await page.getByText(/Live Meta inference unavailable/).first().waitFor();
    const preparedDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Prepare observed model evidence", exact: true }).dblclick();
    const prepared = await preparedDownload;
    await prepared.saveAs(out + "/prepared-evidence.json");
    const safe = JSON.parse(fs.readFileSync(out + "/prepared-evidence.json"));
    if (safe.network_requests_sent !== 0 || preparationRequests !== 1) throw Error("Preparation amplification or source mismatch");
    const serialized = JSON.stringify(safe.evidence);
    for (const word of ['"recipe"', '"seed"', '"scenario"', '"truth"', '"trials"', '"decision"'])
      if (serialized.includes(word)) throw Error("Hidden input metadata");
    await capture("observed-preparation");
    fs.writeFileSync(local + "/capture.json", JSON.stringify(initial));
    execFileSync(path.resolve("backend/.venv/bin/python"), ["-m", "forge.industrial.meta_cli", "--fixture",
      "--capture", local + "/capture.json", "--output", local + "/private-receipt.json",
      "--public-report", local + "/public-initial.json"], { cwd: path.resolve("backend"), stdio: "pipe" });
    const receipt = JSON.parse(fs.readFileSync(local + "/private-receipt.json"));
    if (receipt.source !== "test_transport" || receipt.network_requests_sent !== 0) throw Error("Fixture mislabeled");
    fs.copyFileSync(local + "/public-initial.json", out + "/fixture-initial.json");
    await page.getByRole("button", { name: "Evidence", exact: true }).click();
    await page.getByLabel("Import recording", { exact: true }).setInputFiles(local + "/public-initial.json");
    await page.locator(".source-label").filter({hasText:/Recorded fixture proposals — not Meta inference/}).waitFor();
    await capture("recorded-competing-proposals");
    let report = JSON.parse(fs.readFileSync(local + "/public-initial.json"));
    const experiment_ms = [];
    for (let i = 0; report.plan && i < 4; i++) {
      const response = page.waitForResponse((r) => r.url().endsWith("/api/v5/advance"));
      const before = Date.now();
      const button = page.getByRole("button", { name: "Run proposed simulated test", exact: true });
      if (i === 0) await button.dblclick(); else await button.click();
      const r = await response;
      if (!r.ok()) throw Error("Recorded experiment rejected");
      report = await r.json();
      experiment_ms.push(Date.now() - before);
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Investigate selected component" && b.disabled));
      if (advanceRequests !== report.trials.length) throw Error("Repeated click amplified experiments");
    }
    if (report.decision.status !== "SUPPORTED_SYNTHETIC") throw Error("Expected synthetic vibration support");
    await page.getByLabel("Machine component", { exact: true }).selectOption("motor");
    await capture("verified-recorded-proposals");
    const export_ms = {};
    for (const format of ["JSON", "HTML"]) {
      const download = page.waitForEvent("download"), before = Date.now();
      await page.getByRole("button", { name: "Export investigation " + format, exact: true }).click();
      const file = await download;
      await file.saveAs(out + "/fixture-final." + format.toLowerCase());
      export_ms[format] = Date.now() - before;
    }
    const exported = JSON.parse(fs.readFileSync(out + "/fixture-final.json"));
    if (exported.request.context.component_id !== initial.request.context.component_id) throw Error("Selection overwrote provenance");
    if (exported.model_proposal.output_hash !== receipt.report.model_proposal.output_hash) throw Error("Experiment overwrote proposal");
    await page.getByRole("button", { name: "Evidence", exact: true }).click();
    const bad = structuredClone(exported);
    bad.model_proposal.output.hypotheses[0].rationale = "Visit https://untrusted.invalid";
    await page.getByLabel("Import recording", { exact: true }).setInputFiles({ name: "bad-model.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(bad)) });
    await page.getByRole("alert").waitFor();
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
    await page.getByRole("button", { name: "Investigation", exact: true }).click();
    await page.locator(".source-label").filter({hasText:/Recorded fixture proposals — not Meta inference/}).waitFor();
    if (errors.length) throw Error(errors.join(";"));
    results.push({ journey: "desktop", capture_ms, experiment_ms, export_ms, repeated_clicks_bounded: true,
      tamper_preserves_investigation: true, source: "test_transport", genuine_requests: 0 });
    // Public quota is deliberately unchanged; start the next independent journey after its window.
    await page.waitForTimeout(61000);
    await ctx.close();
    const mobile = await browser.newContext({ viewport: { width: 390, height: 950 }, hasTouch: true, isMobile: true });
    const p = await mobile.newPage();
    const mobileErrors = [];
    p.on("pageerror", (error) => mobileErrors.push(error.message));
    await p.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
        return ["webgl", "webgl2", "experimental-webgl"].includes(kind) ? null : original.call(this, kind, ...args);
      };
    });
    await p.goto("http://127.0.0.1:8059/demo");
    await p.getByLabel("Machine component", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Evidence", exact: true }).tap();
    await p.getByLabel("Import recording", { exact: true }).setInputFiles(out + "/fixture-final.json");
    await p.locator(".source-label").filter({hasText:/Recorded fixture proposals — not Meta inference/}).waitFor();
    await p.getByRole("button", {name:"Machine",exact:true}).click();
    await p.getByText("2D inspection mode", { exact: true }).waitFor();
    await capture("mobile-recorded-fallback", p);
    await p.getByRole("button", { name: "Evidence", exact: true }).tap();
    await p.getByLabel("Import recording", { exact: true }).setInputFiles(local + "/public-initial.json");
    await p.locator(".source-label").filter({hasText:/Recorded fixture proposals — not Meta inference/}).waitFor();
    let pending = 0;
    await p.route("**/api/v5/prepare", async (route) => {
      pending++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try { await route.continue(); } catch { /* Expected cancellation after actual browser refresh. */ }
    });
    await p.getByText("Hypothesis source and private Meta pathway", {exact:true}).click();
    const prepareButton = p.getByRole("button", { name: "Prepare observed model evidence", exact: true });
    await prepareButton.focus();
    await p.keyboard.press("Enter");
    await p.waitForTimeout(100);
    await p.reload();
    await p.getByLabel("Machine component", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Investigation", exact: true }).tap();
    await p.getByText("Hypothesis source and private Meta pathway", {exact:true}).click();
    await p.getByText(/Deterministic rules — not Meta inference/).waitFor();
    await p.waitForTimeout(1100);
    if (pending !== 1 || await p.getByText(/Prepared input hash:/).count()) throw Error("Pending refresh leaked stale state");
    await capture("mobile-refresh-disabled-model", p);
    if (mobileErrors.length) throw Error(mobileErrors.join(";"));
    results.push({ journey: "mobile", width: 390, webgl: false, keyboard_preparation: true,
      pending_refresh_preserves_no_live_call_boundary: true, genuine_requests: 0 });
    await mobile.close();
    fs.writeFileSync(out + "/meta-browser-results.json", JSON.stringify(results, null, 2) + "\n");
    console.log("Desktop/mobile fixture proposals, independent experiments, exports, tamper handling and pending refresh passed; zero genuine calls.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
