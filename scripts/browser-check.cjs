// Optional browser tool: see docs/PHASE1_VALIDATION.md for installation.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    for (const [name, width, height] of [
      ["desktop", 1440, 1100],
      ["mobile", 390, 844],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        acceptDownloads: true,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:5173");
      await page
        .getByText("Process condition changed", { exact: true })
        .waitFor();
      if ((await page.locator("svg[role=img]").count()) !== 3)
        throw Error("Telemetry charts missing");
      for (const [scenario, finding] of [
        ["cooling_loss", "process-temperature"],
        ["normal", "normal"],
        ["imbalance", "process-vibration"],
        ["pressure_loss", "process-pressure"],
      ]) {
        await page
          .getByLabel("Scenario", { exact: true })
          .selectOption(scenario);
        for (const label of [
          "Start investigation",
          "Generate candidates",
          "Select experiment",
          "Run simulation",
          "Verify evidence",
        ]) {
          await page.getByRole("button", { name: label, exact: true }).click();
        }
        await page.getByText(`Finding: ${finding}`, { exact: true }).waitFor();
        await page.getByText("SUPPORTED SYNTHETIC", { exact: true }).waitFor();
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Horizontal overflow: " + name + " " + scenario);
        if (scenario === "cooling_loss") {
          await page
            .locator("#investigation-engine")
            .screenshot({
              path: path.join("docs/evidence", `phase1-${name}.png`),
            });
          const downloadPromise = page.waitForEvent("download");
          await page.getByRole("link", { name: "Download JSON" }).click();
          const download = await downloadPromise;
          const exported = JSON.parse(
            fs.readFileSync(await download.path(), "utf8"),
          );
          if (exported.investigation.verification.finding !== finding)
            throw Error("Report finding mismatch");
          if (!exported.investigation.experiment.probes.length)
            throw Error("Report missing raw evidence");
        }
      }
      if (errors.length) throw Error(errors.join("\n"));
      console.log(
        `${name}: four live investigation workflows, real backend evidence, report download, no overflow or JavaScript errors passed`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
