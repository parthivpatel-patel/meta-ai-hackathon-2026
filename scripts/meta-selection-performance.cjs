// Bounded local-only component-selection timing; actual production assets/API.
const { chromium } = require("playwright");
const fs = require("node:fs");
(async () => {
  const origin = new URL(process.env.FORGE_DEMO_URL || "http://127.0.0.1:8044");
  if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || origin.username || origin.password || origin.pathname !== "/" || origin.search)
    throw Error("Use an explicit literal-loopback test origin");
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(origin.origin + "/demo");
    await page.getByLabel("Machine component", { exact: true }).waitFor();
    await page.locator("canvas[data-draw-calls]").waitFor();
    const durations = [];
    const parts = [["motor", "Motor housing"], ["bearing", "Bearing housing"], ["pump", "Pump casing"]];
    for (let i = 0; i < 30; i++) {
      const [value, title] = parts[i % parts.length];
      const started = Date.now();
      await page.getByLabel("Machine component", { exact: true }).selectOption(value);
      await page.locator("aside").getByRole("heading", { name: title, exact: true }).waitFor();
      durations.push(Date.now() - started);
    }
    fs.writeFileSync(process.env.FORGE_SELECTION_EVIDENCE || "/tmp/forge-phase5-selection-performance.json", JSON.stringify({
      component_changes: 30, elapsed_ms: durations, source: "Actual local public image, software SwiftShader",
      scope: "Selection through matching inspector heading includes browser-automation/CDP/render overhead; not hardware input latency or presentation FPS. No diagnostic/model requests."
    }, null, 2) + "\n");
    console.log("Thirty actual component-selection/inspector timing samples recorded.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
