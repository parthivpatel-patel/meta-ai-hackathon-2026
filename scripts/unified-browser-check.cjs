// Actual production candidate on literal loopback; never a model request or public-host keep-alive.
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const out = path.resolve(process.env.FORGE_UNIFIED_EVIDENCE || 'docs/unified/evidence');
  fs.mkdirSync(out + '/screenshots', { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [index, width, height, scenario] of [[0,1440,900,'bearing'],[1,1366,768,'thermal'],[2,390,844,'pressure_sensor']]) {
      const ctx = await browser.newContext({ viewport:{width,height}, acceptDownloads:true, isMobile:width<500, hasTouch:width<500 });
      const page = await ctx.newPage(); const errors = []; const modelRequests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if(!r.url().startsWith('http://127.0.0.1:')) modelRequests.push(new URL(r.url()).origin); });
      const row = {width,height,scenario,views:[],performance:{},journeys:[]};
      async function capture(name) {
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        const violations = axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));
        if(violations.length) throw Error(JSON.stringify(violations));
        if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error(`Overflow ${name} ${width}`);
        await page.screenshot({path:`${out}/screenshots/${width}-${name}.png`});
        row.views.push({name,violations});
      }
      const start=Date.now();await page.goto(`http://127.0.0.1:${8060+index}/demo`);
      await page.locator('canvas[data-draw-calls]').waitFor();row.performance.controls_ready_ms=Date.now()-start;
      await capture('machine');
      await page.screenshot({path:`${out}/screenshots/${width}-machine-full.png`,fullPage:true});
      row.performance.viewport=await page.locator('canvas').evaluate(n=>({width:n.clientWidth,height:n.clientHeight,...n.dataset}));
      await page.getByText(/Camera and inspection tools/).click();
      for(const name of ['Front view','Side view','Isometric view','Exploded view','Inspection view','Reset camera']) await page.getByRole('button',{name,exact:true}).click();
      await page.getByLabel('Machine component',{exact:true}).selectOption('motor');
      await page.getByRole('button',{name:'Focus component',exact:true}).click();
      await page.getByLabel('Machine component',{exact:true}).selectOption('pump');
      const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
      if(await page.getByLabel('Machine component',{exact:true}).inputValue()==='pump') throw Error('Pointer selection not connected');
      await page.getByRole('button',{name:'Reset camera',exact:true}).click();
      await page.getByRole('button',{name:'Start simulation / Resume',exact:true}).click();
      await page.waitForTimeout(1100);await page.getByRole('button',{name:'Pause',exact:true}).click();
      const phase=await page.locator('canvas').getAttribute('data-rotor-phase'), count=await page.locator('canvas').getAttribute('data-render-count');
      await page.waitForTimeout(700);
      if(await page.locator('canvas').getAttribute('data-rotor-phase')!==phase || await page.locator('canvas').getAttribute('data-render-count')!==count) throw Error('Paused renderer is not idle');
      row.journeys.push('A: pointer/keyboard camera, pump operation, pause with no idle render');
      await page.getByLabel('Machine scenario',{exact:true}).selectOption(scenario);
      await page.getByRole('button',{name:'Focus scenario window',exact:true}).click();
      const component=await page.getByLabel('Machine component',{exact:true}).inputValue();
      await capture('fault-machine');
      await page.getByRole('button',{name:'Telemetry',exact:true}).click();await capture('telemetry');
      const pending=page.waitForResponse(r=>r.url().endsWith('/api/v4/investigate'));
      await page.getByRole('button',{name:'Capture observation window',exact:true}).click();let report=await (await pending).json();
      if(report.request.experiments!==0) throw Error('Capture executed an experiment');
      await page.getByText(/Captured from/).waitFor();await capture('investigation');
      row.journeys.push('B: abnormal telemetry, observed capture, competing causes');
      const hash=report.report_hash;
      for(const name of ['Experiments','Verification','Reports','Evidence','Replay','Machine','Investigation']) {
        await page.getByRole('button',{name,exact:true}).click();
        if(await page.getByLabel('Machine component',{exact:true}).inputValue()!==component) throw Error('Mode lost selected component');
      }
      if(!await page.getByText(/Captured from/).count()) throw Error('Mode lost case');
      await page.getByRole('button',{name:'Machine',exact:true}).click();
      await page.getByRole('button',{name:'Investigation library',exact:true}).click();
      await page.getByRole('button',{name:'Open investigation',exact:true}).waitFor();
      await page.waitForTimeout(700);
      await page.getByRole('button',{name:'Machine workstation',exact:true}).click();
      if(await page.getByLabel('Machine recording position',{exact:true}).inputValue()!=='319') throw Error('Library lost playback window');
      await page.getByRole('button',{name:'Reports',exact:true}).click();
      if(!await page.getByText(hash,{exact:true}).count()) throw Error('Library lost capture digest');
      const experiments=[];
      for(let n=0;report.plan && n<4;n++) {
        await page.getByRole('button',{name:'Experiments',exact:true}).click();
        const pending=page.waitForResponse(r=>r.url().endsWith('/api/v4/investigate'));
        const before=Date.now();await page.getByRole('button',{name:'Run proposed simulated test',exact:true}).click();report=await (await pending).json();experiments.push(Date.now()-before);
        if(report.trials.length!==n+1) throw Error('Experiment was amplified');
      }
      row.performance.experiment_ui_ms=experiments;await page.getByRole('button',{name:'Verification',exact:true}).click();await capture('verification');
      await page.getByRole('button', {name:/inspect machine response/}).last().click();
      await page.getByRole('button', {name:'Return to observed simulation',exact:true}).waitFor();
      if(await page.getByRole('button', {name:'Machine',exact:true}).getAttribute('aria-current')!=='page') throw Error('Experiment did not focus machine response');
      await page.getByRole('button', {name:'Return to observed simulation',exact:true}).click();
      row.journeys.push('C: reviewed and explicitly confirmed tests; independent findings, uncertainty and machine response');
      await page.getByRole('button',{name:'Reports',exact:true}).click();await capture('report');
      for(const format of ['JSON','HTML']) {
        const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export investigation '+format,exact:true}).click();const download=await pending;await download.saveAs(`${out}/${width}-report.${format.toLowerCase()}`);
      }
      await page.getByRole('button',{name:'Evidence',exact:true}).click();
      // Respect the real public quota. No increased limits or repeated public-host calls.
      if(report.trials.length>=4) await page.waitForTimeout(61000);
      await page.getByLabel('Import recording',{exact:true}).setInputFiles(`${out}/${width}-report.json`);await page.getByText(/Captured from/).waitFor();
      await page.getByRole('button',{name:'Evidence',exact:true}).click();
      await page.getByLabel('Import recording',{exact:true}).setInputFiles({name:'malformed.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
      await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Dismiss',exact:true}).click();
      await page.getByRole('button',{name:'Reports',exact:true}).click();if(!await page.getByText(report.report_hash,{exact:true}).count()) throw Error('Bad import replaced case');
      row.journeys.push('D: JSON/HTML download and independent report re-import');
      await page.getByRole('button',{name:'Evidence',exact:true}).click();
      await page.getByLabel('Import recording',{exact:true}).setInputFiles({name:'missing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'forge-telemetry-1',machine_id:'pump-104',samples:[{timestamp:'2026-10-27T08:00:00Z',sensor_id:'rpm',component_id:'motor',value:null,unit:'rpm'}]}))});
      await page.getByText(/Imported operator recording/).waitFor();await page.getByRole('button',{name:'Machine',exact:true}).click();
      await page.waitForFunction(() => document.querySelector('canvas')?.dataset.rotorPhase === 'unavailable');
      if(await page.getByRole('button',{name:'Investigate selected component',exact:true}).isEnabled()) throw Error('Imported data acquired an intervention oracle');
      await page.getByRole('button',{name:'Use 2D inspection',exact:true}).click();await page.getByText('2D inspection mode',{exact:true}).waitFor();await capture('accessible-fallback');
      row.journeys.push('F: malformed import preserves capture, missing data stops phase, accessible 2D inspection');
      row.errors=errors;row.external_requests=modelRequests;row.decision=report.decision;row.source=report.provider;
      if(errors.length||modelRequests.length) throw Error(JSON.stringify({errors,modelRequests}));
      results.push(row);await ctx.close();console.log(`${width} unified journeys passed`);
    }
    fs.writeFileSync(out+'/unified-browser.json',JSON.stringify(results,null,2)+'\n');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
