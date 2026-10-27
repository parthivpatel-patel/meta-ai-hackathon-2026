// Supplemental validation only. Application source remains the exact approved candidate.
// Run from repository root with optional Playwright/Axe tooling on NODE_PATH.
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
let source = fs.readFileSync("scripts/product-v4-browser-check.cjs", "utf8");
function insert(marker, replacement) {
  if (!source.includes(marker))
    throw Error("Candidate validation marker missing");
  source = source.replace(marker, replacement);
}
insert(
  "const errors = [];",
  `
const errors = [];
await page.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
    if (["webgl", "webgl2", "experimental-webgl"].includes(kind)) return null;
    return original.call(this, kind, ...args);
  };
});`,
);
insert(
  "const started = Date.now();",
  `
await page.getByRole("button", {name:"Motor housing",exact:true}).click();
await page.getByRole("button", {name:"Reset equipment view",exact:true}).click();
await capture("equipment-initial");
const diagram = page.getByRole("img", {name:"Illustrative equipment, Motor housing selected"});
const face = diagram.locator("polygon").first();
const beforeZoom = await face.getAttribute("points");
const zoom = page.getByRole("slider", {name:"Equipment zoom"});
await zoom.focus();
await zoom.press("ArrowRight");
if (await zoom.inputValue() !== "86" || await face.getAttribute("points") === beforeZoom) throw Error("Equipment zoom failed");
await diagram.locator("polygon").last().click({force:true});
await page.getByRole("button", {name:"Pump housing",exact:true}).click();
await page.getByRole("img", {name:"Illustrative equipment, Pump housing selected"}).waitFor();
await page.getByRole("heading", {name:"Pump housing: pressure sensor"}).waitFor();
await capture("equipment-selected");
const started = Date.now();`,
);
const runner = new Module(
  path.resolve("scripts/release-browser-validation.cjs"),
  module,
);
runner.filename = path.resolve("scripts/release-browser-validation.cjs");
runner.paths = module.paths;
runner._compile(source, runner.filename);
