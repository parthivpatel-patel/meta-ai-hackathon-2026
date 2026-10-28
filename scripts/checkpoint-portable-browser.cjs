// Actual native checkpoint download/import through the restricted local production app.
const { chromium } = require("playwright"),
  { AxeBuilder } = require("@axe-core/playwright"),
  fs = require("node:fs");
(async () => {
  const out =
    process.env.FORGE_PORTABLE_EVIDENCE ||
    "docs/final-experience/evidence/portable";
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const c = await b.newContext({
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
    });
    const p = await c.newPage();
    let captures = 0;
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (r.url().endsWith("/api/v4/investigate")) captures++;
    });
    await p.goto("http://127.0.0.1:8074/demo");
    await p.getByLabel("Machine component", { exact: true }).waitFor();
    await p
      .getByLabel("Machine scenario", { exact: true })
      .selectOption("bearing");
    await p
      .getByRole("button", { name: "Focus scenario window", exact: true })
      .click();
    const pending = p.waitForResponse((r) =>
      r.url().endsWith("/api/v4/investigate"),
    );
    await p
      .getByRole("button", { name: "Capture observation window", exact: true })
      .click();
    const original = await (await pending).json();
    await p
      .locator("summary:visible")
      .filter({ hasText: "Browser recovery" })
      .click();
    await p
      .getByRole("button", { name: "Save browser checkpoint", exact: true })
      .click();
    await p
      .locator("summary:visible")
      .filter({ hasText: "Checkpoint saved" })
      .waitFor();
    const download = p.waitForEvent("download");
    await p
      .getByRole("button", { name: "Export recovery checkpoint", exact: true })
      .click();
    await (await download).saveAs(out + "/checkpoint.json");
    const checkpoint = JSON.parse(fs.readFileSync(out + "/checkpoint.json"));
    if (
      checkpoint.data.report.report_hash !== original.report_hash ||
      checkpoint.data.report.trials.length
    )
      throw Error("Checkpoint provenance changed");
    await p
      .getByRole("button", { name: "Discard saved checkpoint", exact: true })
      .click();
    await p.getByText("Operating controls", { exact: true }).click();
    const reset = p.waitForResponse((r) =>
      r.url().endsWith("/api/v4/simulate"),
    );
    await p
      .getByRole("button", { name: "Reset scenario", exact: true })
      .click();
    await reset;
    await p
      .getByLabel("Import machine checkpoint", { exact: true })
      .setInputFiles(out + "/checkpoint.json");
    await p.getByText(/Captured from/).waitFor();
    await p.getByRole("button", { name: "Reports", exact: true }).click();
    await p.getByText(original.report_hash, { exact: true }).waitFor();
    if (captures !== 2 || errors.length)
      throw Error(JSON.stringify({ captures, errors }));
    const a = await new AxeBuilder({ page: p })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    if (a.violations.length) throw Error("Axe violations");
    await p.screenshot({
      path: out + "/restored-portable.png",
      fullPage: true,
    });
    fs.writeFileSync(
      out + "/result.json",
      JSON.stringify(
        {
          native_export: true,
          explicit_reset: true,
          validated_import: true,
          report_hash: original.report_hash,
          experiments: 0,
          independent_reproductions: 1,
          genuine_requests: 0,
          errors,
          violations: [],
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "Native checkpoint export, reset and independent import passed; no experiment or model call",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
