const { chromium } = require("playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
    headless: true,
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
      const lab = page.locator("#phase2");
      if (await lab.getByRole("checkbox").isEnabled())
        throw Error("Unexpected enabled Meta transport");
      await lab
        .getByText("Attach synthetic multimodal sample", { exact: true })
        .click();
      await lab
        .getByRole("img", { name: "Calibrated thermal image" })
        .waitFor();
      await lab.getByLabel("Phase 2 test case").selectOption("multi");
      await lab.getByText("Run Phase 2 investigation", { exact: true }).click();
      await lab
        .getByText("Findings: process-temperature, process-vibration", {
          exact: true,
        })
        .waitFor();
      await lab.getByText("RULES-BASED · NOT META", { exact: true }).waitFor();
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Horizontal overflow " + name);
      await lab.screenshot({ path: `docs/evidence/phase2-${name}.png` });
      const downloadPromise = page.waitForEvent("download");
      await lab.getByText("Save Phase 2 JSON", { exact: true }).click();
      const download = await downloadPromise;
      const content = fs.readFileSync(await download.path(), "utf8");
      const report = JSON.parse(content);
      if (report.model_source !== "deterministic_rules_not_meta")
        throw Error("Incorrect model attribution");
      fs.writeFileSync("/tmp/forge-phase2-report.json", content);
      const htmlPromise = page.waitForEvent("download");
      await lab.getByText("Save Phase 2 HTML", { exact: true }).click();
      const html = await htmlPromise;
      if (
        !fs
          .readFileSync(await html.path(), "utf8")
          .includes("Physical-world causality is not established")
      )
        throw Error("Invalid HTML report");
      await lab.getByLabel("Phase 2 test case").selectOption("insufficient");
      await lab.getByText("Run Phase 2 investigation", { exact: true }).click();
      await lab.getByText("ABSTAIN", { exact: true }).waitFor();
      if (errors.length) throw Error(errors.join("\n"));
      console.log(
        name +
          ": multimodal upload, multifault run, explicit rules source, JSON/HTML downloads and abstention passed",
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
