// Local production acceptance only. No provider or external traffic is permitted.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const base = process.env.FORGE_RECORDED_URL || "http://127.0.0.1:8088";
const width = Number(process.env.FORGE_RECORDED_WIDTH || 1440);
const out = process.env.FORGE_RECORDED_EVIDENCE || `/tmp/forge-recorded-browser-${width}`;
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base) || ![1440, 390].includes(width))
  throw Error("Literal loopback and reviewed viewport required");
const sha = "8cb36b2d182ac84657abbe07ba6230c7483dd115aeeed0478fee80a49c32b88f";
const labels = ["Genuine Meta model output", "Previously recorded", "Synthetic investigation", "Independently verified"];
const checks = [], errors = [], external = [], mutations = [];
fs.mkdirSync(out, { recursive: true });
const deadline = setTimeout(() => { console.error("Recorded browser deadline exceeded"); process.exit(1); }, 120000);
(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width === 390, hasTouch: width === 390, acceptDownloads: true });
  context.setDefaultTimeout(20000);
  await context.route("**/*", route => {
    const request = route.request();
    if (!request.url().startsWith(base + "/")) { external.push(new URL(request.url()).origin); return route.abort(); }
    if (!["GET", "HEAD"].includes(request.method())) mutations.push(new URL(request.url()).pathname);
    return route.continue();
  });
  if (width === 390) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      return ["webgl", "webgl2", "experimental-webgl"].includes(kind) ? null : original.call(this, kind, ...args);
    };
  });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const b = name => page.getByRole("button", { name, exact: true });
  async function shot(name) {
    const a = await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    assert.deepEqual(a.violations.map(v => ({id:v.id,targets:v.nodes.map(n=>n.target)})), []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name + " overflow");
    await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
    checks.push({view:name,axe_violations:0});
    console.log(`${width}: ${name}`);
  }
  async function recorded() {
    await page.getByRole("heading", {name:"Recorded Meta investigation",exact:true}).waitFor();
    for(const label of labels) await page.getByText(label,{exact:true}).waitFor();
    assert.equal(await page.locator("main:visible h3").count(),3);
    await page.getByText(/not the currently selected coupled 3D/).waitFor();
    await page.getByText(/Public live inference is disabled/).waitFor();
  }
  async function replay() {
    const response = page.waitForResponse(r=>r.url().endsWith("/api/v3/recorded-meta/replay"));
    await b("Replay independent verification").focus(); await page.keyboard.press("Enter");
    const r = await response; assert.equal(r.status(),200);
    const value=await r.json(); assert.equal(value.verified,true); assert.equal(value.network_requests_sent,0);
    assert.equal(value.new_experiments_executed,0); assert.deepEqual(value.findings,["process-pressure","sensor-pressure"]);
    await page.getByText(/Independent replay passed/).waitFor();
  }
  async function download(name,filename) {
    const pending=page.waitForEvent("download");
    await page.getByRole("link",{name,exact:true}).click();
    await (await pending).saveAs(`${out}/${filename}`);
  }
  try {
    await page.goto(base+"/demo?view=recorded-meta"); await recorded();
    assert.deepEqual(mutations,[],"recorded deep link initialized a mutable case");
    await replay();
    await download("Download recorded investigation JSON","recorded.json");
    assert.equal(createHash("sha256").update(fs.readFileSync(`${out}/recorded.json`)).digest("hex"),sha);
    await download("Download recorded investigation HTML","recorded.html");
    const html=fs.readFileSync(`${out}/recorded.html`,"utf8");
    for(const label of labels) assert.ok(html.includes(label));
    assert.ok(!html.includes("<script"));
    await shot("recorded-replayed");
    await page.reload(); await recorded(); await replay();
    assert.deepEqual(mutations,[],"reloading/replaying recorded case mutated state");
    await page.route("**/api/v3/recorded-meta/replay", route=>route.fulfill({status:503,body:"untrusted failure body"}),{times:1});
    await b("Replay independent verification").click();
    await page.getByRole("alert").filter({hasText:/recorded investigation is preserved/}).waitFor();
    assert.equal(await page.locator("main:visible h3").count(),3);
    await shot("replay-failure-preserves-evidence");
    await b("Machine").click();
    await page.getByLabel("Machine scenario",{exact:true}).waitFor();
    const simulation=page.waitForResponse(r=>r.url().endsWith("/api/v4/simulate"));
    await page.getByLabel("Machine scenario",{exact:true}).selectOption("bearing");
    assert.equal((await simulation).status(),200);
    await b("Focus scenario window").click();
    assert.equal(await page.getByLabel("Machine recording position").inputValue(),"319");
    if(width===390) await page.getByText("2D inspection mode",{exact:true}).waitFor();
    else assert.ok(await page.locator("canvas").count(),"interactive machine canvas absent");
    await shot("machine-observed");
    let pending=page.waitForResponse(r=>r.url().endsWith("/api/v4/investigate"));
    await b("Capture observation window").click();
    const capture=await(await pending).json(); assert.equal(capture.trials.length,0);
    pending=page.waitForResponse(r=>r.url().endsWith("/api/v4/investigate"));
    await b("Run proposed simulated test").click();
    const report=await(await pending).json(); assert.equal(report.trials.length,1);
    assert.equal(report.source,"SIMULATED");
    assert.equal(report.provider,"rules-based, not Meta");
    await page.getByRole("button",{name:/inspect machine response/}).last().click();
    await page.getByText("Counterfactual test result",{exact:true}).waitFor();
    const before=mutations.length;
    await b("Recorded Meta").click(); await recorded(); await replay();
    assert.equal(mutations.length,before,"recorded navigation/replay changed machine history");
    await b("Return to existing workspace").click();
    await page.getByText("Counterfactual test result",{exact:true}).waitFor();
    await page.locator(".component-inspector").getByRole("button",{name:"Resume existing investigation",exact:true}).click();
    assert.equal(mutations.length,before,"resume made new capture or experiment");
    await b("Reports").click();
    const exported=page.waitForEvent("download"); await b("Export investigation JSON").click();
    await(await exported).saveAs(`${out}/machine-preserved.json`);
    assert.deepEqual(JSON.parse(fs.readFileSync(`${out}/machine-preserved.json`)),report);
    await shot("separate-machine-history-preserved");
    await b("Recorded Meta").click(); await recorded();
    // Corrupt only the next read of the fixed artifact; metadata still claims its valid hash.
    await page.route("**/api/v3/recorded-meta/report.json",route=>route.fulfill({status:200,contentType:"application/json",body:"{}"}),{times:1});
    await page.reload(); await page.getByRole("alert").filter({hasText:/Reviewed recorded evidence is unavailable/}).waitFor();
    assert.equal(await page.getByText("Genuine Meta model output",{exact:true}).count(),0);
    await shot("tampered-evidence-fails-closed");
    await b("Retry recorded evidence").click(); await recorded();
    assert.deepEqual(external,[]); assert.deepEqual(errors,[]);
    assert.ok(mutations.every(path=>["/api/v4/simulate","/api/v4/investigate"].includes(path)));
    checks.push({exports:"JSON hash and HTML labels verified",reload_replay:true,independent_findings:["process-pressure","sensor-pressure"],machine_history_preserved:true,tamper_rejected:true});
  } catch(error) {
    await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{}); throw error;
  } finally {
    clearTimeout(deadline);
    fs.writeFileSync(`${out}/results.json`,JSON.stringify({width,checks,errors,external,mutation_paths:mutations,genuine_requests:0,scope:"Local production Chromium, software WebGL desktop; mobile viewport with forced accessible fallback. Not public HTTPS deployment evidence."},null,2)+"\n");
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
