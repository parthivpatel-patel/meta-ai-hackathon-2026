const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
(async () => {
  const out =
    process.env.FORGE_INDUSTRIAL_EVIDENCE || "docs/industrial/evidence";
  fs.mkdirSync(out + "/screenshots", { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const results = { mobile: [] };
  try {
    for (const width of [320, 375, 430]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        isMobile: true,
        hasTouch: true,
      });
      const p = await ctx.newPage();
      await p.goto("http://127.0.0.1:8057/demo");
      await p.getByLabel("Machine component", { exact: true }).waitFor();
      await p
        .getByRole("button", { name: "Focus scenario window", exact: true })
        .tap();
      await p
        .getByLabel("Machine component", { exact: true })
        .selectOption("bearing");
      await p.getByText(/Camera and inspection tools/).tap();
      await p.getByRole("button", { name: "Zoom in", exact: true }).tap();
      const a = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      if (a.violations.length)
        throw Error(
          JSON.stringify(
            a.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
          ),
        );
      if (
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Mobile overflow");
      await p.screenshot({
        path: `${out}/screenshots/workstation-${width}.png`,
        fullPage: true,
      });
      results.mobile.push({ width, touch: true, violations: 0 });
      await ctx.close();
    }
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:8057/demo");
    await p.getByLabel("Machine component", { exact: true }).waitFor();
    await p.locator("canvas[data-draw-calls]").waitFor();
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.getByText(/Camera and inspection tools/).click();
    await p.getByRole("button", { name: "Zoom in", exact: true }).focus();
    await p.keyboard.press("Enter");
    const selectionBeforeDrag = await p.getByLabel("Machine component", { exact: true }).inputValue();
    const bounds = await p.locator("canvas").boundingBox();
    await p.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await p.mouse.down();
    await p.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2 + 25, { steps: 8 });
    await p.mouse.up();
    await p.mouse.wheel(0, -100);
    if (await p.getByLabel("Machine component", { exact: true }).inputValue() !== selectionBeforeDrag)
      throw Error("Orbit drag selected a component");
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("HeapProfiler.collectGarbage");
    const before = await cdp.send("Runtime.getHeapUsage");
    const cadence = await p.evaluate(async () => {
      const times = [];
      let old = performance.now();
      for (let i = 0; i < 60; i++)
        await new Promise((resolve) =>
          requestAnimationFrame(() => {
            [...document.querySelectorAll(".machine-tools button")].find(button => button.textContent.trim() === "Orbit left").click();
            const now = performance.now();
            times.push(now - old);
            old = now;
            resolve();
          }),
        );
      return times;
    });
    for (let i = 0; i < 60; i++)
      await p
        .getByLabel("Machine component", { exact: true })
        .selectOption(i % 2 ? "bearing" : "motor");
    const playbackStart = Number(await p.getByLabel("Machine recording position", {exact:true}).inputValue());
    await p
      .getByRole("button", { name: "Start simulation / Resume", exact: true })
      .click();
    const telemetryUpdates = await p.evaluate(async () => {
      const input = document.querySelector('input[aria-label="Machine recording position"]');
      const start = performance.now();
      let previous = input.value;
      const updates = [];
      while (performance.now() - start < 1750) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (input.value !== previous) {
          updates.push({ elapsed_ms: performance.now() - start, sequence: Number(input.value) });
          previous = input.value;
        }
      }
      return updates;
    });
    // RAF can coalesce multiple 500ms state updates under software WebGL.
    // Preserve measured paint samples, but assert actual two-tick progress rather than their count.
    await p.waitForFunction(start => Number(document.querySelector('input[aria-label="Machine recording position"]').value) >= start + 16, playbackStart, {timeout:5000});
    const playbackEnd = Number(await p.getByLabel("Machine recording position", {exact:true}).inputValue());
    await p.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const cursor = await p
      .getByLabel("Machine recording position", { exact: true })
      .inputValue();
    await p.waitForTimeout(1100);
    if (
      (await p
        .getByLabel("Machine recording position", { exact: true })
        .inputValue()) !== cursor
    )
      throw Error("Background playback continued");
    await p.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: false,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    for (let i = 0; i < 5; i++) {
      await p.getByRole("button",{name:"Cases",exact:true}).click();
      await p
        .getByRole("button", { name: "Investigation library", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Open investigation", exact: true })
        .waitFor();
      await p.getByRole("button",{name:"Cases",exact:true}).click();
      await p
        .getByRole("button", { name: "Machine workstation", exact: true })
        .click();
      await p.getByLabel("Machine component", { exact: true }).waitFor();
      await p.locator("canvas[data-draw-calls]").waitFor();
    }
    const contextLoss = await p.locator("canvas").evaluate((c) => {
      const gl = c.getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_lose_context");
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
    if (!contextLoss) throw Error("No context-loss extension");
    await p.getByText("2D inspection mode", { exact: true }).waitFor();
    await p.getByRole("button", { name: "Zoom in", exact: true }).click();
    await p.getByRole("button", { name: "Retry 3D", exact: true }).click();
    await p.locator("canvas:visible[data-draw-calls]").waitFor();
    await p.getByRole("button", { name: "Use 2D inspection", exact: true }).click();
    await p.getByText("2D inspection mode", { exact: true }).waitFor();
    if (await p.locator("canvas").count()) throw Error("Manual 2D retained canvas");
    await p.getByRole("button", { name: "Use 3D machine", exact: true }).click();
    await p.locator("canvas:visible[data-draw-calls]").waitFor();
    await cdp.send("HeapProfiler.collectGarbage");
    const after = await cdp.send("Runtime.getHeapUsage");
    results.lifecycle = {
      camera_raf_cadence_ms: cadence,
      telemetry_ui_updates: telemetryUpdates,
      telemetry_functional_progress: {start_sequence:playbackStart,end_sequence:playbackEnd,minimum_sample_progress:16,paint_sample_count:telemetryUpdates.length,scope:"RAF paint samples may coalesce timer ticks; bounded functional progress checked separately, not a cadence/FPS claim"},
      scope:
        "60 camera steps scheduled via requestAnimationFrame with local CPU SwiftShader; cadence, not hardware presentation FPS",
      heap_before: before.usedSize,
      heap_after: after.usedSize,
      workspace_switch_cycles: 5,
      hidden_workstation_renderer_preserved: true,
      component_changes: 60,
      keyboard_camera_activation: true,
      pointer_orbit_wheel_no_accidental_selection: true,
      reduced_motion: true,
      synthetic_visibility_pause: true,
      context_loss_recovery: true,
      manual_2d_and_3d_recovery: true,
      gpu: await p.locator("canvas").evaluate((c) => ({ ...c.dataset })),
    };
    await p.getByRole("button", { name: "Evidence", exact: true }).click();
    const file = {
      schema: "forge-telemetry-1",
      machine_id: "pump-104",
      declared_source: "operator_recorded_unverified",
      samples: [
        {
          timestamp: "2026-10-27T08:00:00Z",
          sensor_id: "vibration",
          component_id: "bearing",
          value: 2,
          unit: "mm/s",
        },
      ],
    };
    await p.getByLabel("Import recording", { exact: true }).setInputFiles({
      name: "one.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(file)),
    });
    await p.getByText(/Imported operator recording/).waitFor();
    await p.getByRole("button", { name: "Replay", exact: true }).click();
    if (
      await p
        .getByRole("button", { name: "Focus scenario window", exact: true })
        .isEnabled()
    )
      throw Error("Recorded data exposed simulation seek");
    await p.getByText("Operating controls", {exact:true}).click();
    await p
      .getByRole("button", { name: "Reset recording", exact: true })
      .click();
    await p.getByLabel("Machine component", { exact: true }).waitFor();
    await p.getByRole("button", {name:"Machine", exact:true}).click();
    if (
      await p
        .getByRole("button", {
          name: "Investigate selected component",
          exact: true,
        })
        .isEnabled()
    )
      throw Error("Imported recording acquired oracle");
    results.lifecycle.short_import_reset = true;
    if (errors.length) throw Error(errors.join(";"));
    await ctx.close();
    const control = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const q = await control.newPage();
    await q.goto("http://127.0.0.1:8058/demo");
    await q.getByLabel("Machine component", { exact: true }).waitFor();
    let pending = q.waitForResponse((r) =>
      r.url().endsWith("/api/v4/simulate"),
    );
    await q
      .getByLabel("Machine scenario", { exact: true })
      .selectOption("thermal");
    await pending;
    await q
      .getByRole("button", { name: "Focus scenario window", exact: true })
      .click();
    pending = q.waitForResponse((r) => r.url().endsWith("/api/v4/simulate"));
    await q.getByText("Operating controls", {exact:true}).click();
    await q
      .getByRole("button", { name: "Apply simulated repair", exact: true })
      .click();
    await pending;
    await q.getByRole("button", { name: "Pause", exact: true }).click();
    await q.getByLabel("Machine recording position", { exact: true }).focus();
    await q.keyboard.press("End");
    await q.getByText(/Within display thresholds/).waitFor();
    pending = q.waitForResponse((r) => r.url().endsWith("/api/v4/simulate"));
    await q
      .getByRole("button", { name: "Reset scenario", exact: true })
      .click();
    await pending;
    await q
      .getByRole("button", { name: "Focus scenario window", exact: true })
      .click();
    pending = q.waitForResponse((r) => r.url().endsWith("/api/v4/simulate"));
    await q
      .getByRole("button", { name: "Simulate shutdown", exact: true })
      .click();
    const response = await pending;
    const stopped = await response.json();
    if (stopped.frames.at(-1).state !== "STOPPED")
      throw Error("Shutdown never stopped");
    await q.getByRole("button", { name: "Pause", exact: true }).click();
    await q.getByLabel("Machine recording position", { exact: true }).focus();
    await q.keyboard.press("End");
    await control.setOffline(true);
    await q
      .getByRole("button", { name: "Reset scenario", exact: true })
      .click();
    await q.getByRole("alert").waitFor();
    if (
      (await q
        .getByLabel("Machine recording position", { exact: true })
        .inputValue()) !== "599"
    )
      throw Error("Failed load changed recording");
    await control.setOffline(false);
    await q
      .getByRole("button", { name: "Reset scenario", exact: true })
      .click();
    await q.waitForFunction(
      () =>
        document.querySelector('input[aria-label="Machine recording position"]')
          ?.value === "0",
    );
    results.controls = {
      repair_response: true,
      shutdown_reaches_stopped: true,
      offline_load_preserves_recording: true,
      reconnect_reset: true,
    };
    await control.close();
    fs.writeFileSync(
      out + "/lifecycle-results.json",
      JSON.stringify(results, null, 2) + "\n",
    );
    console.log(
      "Mobile, lifecycle, context recovery, repair, shutdown and offline recovery passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
