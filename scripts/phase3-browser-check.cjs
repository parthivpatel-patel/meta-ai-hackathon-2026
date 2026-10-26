// Optional Playwright installation is documented in DEMO_RUNBOOK.md.
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
      await page.goto(
        (process.env.FORGE_DEMO_URL || "http://127.0.0.1:7860") + "/demo",
      );
      await page.getByText("Restricted public demo · SYNTHETIC").waitFor();
      if (await page.getByLabel("Use real Meta inference").isEnabled())
        throw Error("Public inference enabled");
      await page
        .getByRole("button", { name: "Start investigation", exact: true })
        .click();
      for (const label of [
        "Generate competing hypotheses",
        "Select next experiment",
        "Run experiment & verify",
        "Select next experiment",
        "Run experiment & verify",
      ])
        await page.getByRole("button", { name: label, exact: true }).click();
      await page
        .getByText("Supported in the synthetic model", { exact: true })
        .waitFor();
      await page
        .getByText("process-pressure + sensor-pressure", { exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByText("Supported in the synthetic model", { exact: true })
        .waitFor();
      await page.getByRole("button", { name: "thermal", exact: true }).click();
      await page.getByText(/no temporal alignment claim/).waitFor();
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Horizontal overflow " + name);
      await page.screenshot({
        path: `docs/evidence/phase3-${name}.png`,
        fullPage: true,
      });
      for (const [label, format] of [
        ["Export replayable JSON", "json"],
        ["Export readable HTML", "html"],
      ]) {
        const pending = page.waitForEvent("download");
        await page.getByRole("button", { name: label, exact: true }).click();
        const d = await pending;
        const body = fs.readFileSync(await d.path(), "utf8");
        if (format === "json") {
          const r = JSON.parse(body);
          if (r.investigation.model_source !== "deterministic_rules_not_meta")
            throw Error("Attribution");
          fs.writeFileSync("/tmp/forge-phase3-report.json", body);
        } else if (
          !body.includes("Physical-world causality is not established")
        )
          throw Error("Scope");
      }
      await page
        .getByLabel("Sequential demo case")
        .selectOption("insufficient");
      await page
        .getByRole("button", { name: "Start investigation", exact: true })
        .click();
      await page
        .getByText("Explicit abstention or inconclusive evidence", {
          exact: true,
        })
        .waitFor();
      if (errors.length) throw Error(errors.join("\n"));
      console.log(
        name +
          ": persisted sequential workflow, multimodal provenance, public inference gate, abstention, downloads and responsive layout passed",
      );
      await page.close();
      if (name === "desktop")
        await new Promise((resolve) => setTimeout(resolve, 61000));
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
