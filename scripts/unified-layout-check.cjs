// Complement the three complete journeys with real large/tablet/boundary-width layout checks.
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
(async()=>{
 const out=process.env.FORGE_LAYOUT_EVIDENCE || 'docs/unified/evidence/layout';
 fs.mkdirSync(out+'/screenshots',{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try {
  for(const [width,height] of [[1920,1080],[1024,768],[768,1024],[320,844]]) {
   const context=await browser.newContext({viewport:{width,height},isMobile:width<801,hasTouch:width<801});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8057/demo');await page.locator('canvas[data-draw-calls]').waitFor();
   await page.getByLabel('Machine component',{exact:true}).selectOption('bearing');
   await page.getByText(/Camera and inspection tools/).click();
   const focus=page.getByRole('button',{name:'Focus component',exact:true});await focus.focus();await page.keyboard.press('Enter');
   await page.getByRole('button',{name:'Reset camera',exact:true}).click();
   const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
   const violations=a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(violations.length||overflow||errors.length)throw Error(JSON.stringify({width,violations,overflow,errors}));
   await page.screenshot({path:`${out}/screenshots/layout-${width}.png`,fullPage:true});
   results.push({width,height,violations,overflow,errors,keyboard_component_focus:true,viewport:await page.locator('canvas').boundingBox()});await context.close();
  }
  fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2)+'\n');console.log('Large desktop, compact laptop, tablet and 320px layout/keyboard/Axe checks passed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
