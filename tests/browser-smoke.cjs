const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');

const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url=process.env.AIOM_BROWSER_URL||'http://127.0.0.1:4327';
const debugPort=9337;
const profile=path.join(os.tmpdir(),`aiom-chrome-${process.pid}`);

function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function target(){
  for(let attempt=0;attempt<50;attempt++){
    try{const list=await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response=>response.json());const page=list.find(item=>item.type==='page');if(page)return page;}catch{}
    await delay(100);
  }
  throw new Error('Chrome DevTools target did not start');
}
function connect(wsUrl){
  return new Promise((resolve,reject)=>{
    const socket=new WebSocket(wsUrl);let nextId=0;const pending=new Map();
    socket.onopen=()=>resolve({
      send(method,params={}){return new Promise((ok,fail)=>{const id=++nextId;pending.set(id,{ok,fail});socket.send(JSON.stringify({id,method,params}));});},
      close(){socket.close();}
    });
    socket.onerror=reject;
    socket.onmessage=event=>{const message=JSON.parse(event.data);if(!message.id)return;const request=pending.get(message.id);if(!request)return;pending.delete(message.id);if(message.error)request.fail(new Error(message.error.message));else request.ok(message.result);};
  });
}
async function evaluate(cdp,expression){
  const result=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
async function screenshot(cdp,file){
  const result=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});
  fs.writeFileSync(path.join(__dirname,'..',file),Buffer.from(result.data,'base64'));
}

(async()=>{
  if(!fs.existsSync(chrome))throw new Error(`Chrome not found: ${chrome}`);
  const child=spawn(chrome,[`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars','--window-size=1440,1000',url],{stdio:'ignore',windowsHide:true});
  let cdp;
  try{
    const page=await target();cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await evaluate(cdp,`new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{const metric=document.querySelector('.metric-line');if(metric){clearInterval(timer);resolve(true);}else if(Date.now()-started>10000){clearInterval(timer);reject(new Error('dashboard timeout'));}},100);})`);
    const summary=await evaluate(cdp,`(async()=>{
      const click=selector=>{const node=document.querySelector(selector);if(!node)throw new Error('missing '+selector);node.click();};
      const text=selector=>document.querySelector(selector)?.innerText||'';
      const result={title:document.title,metrics:text('.metric-line')};
      result.digestCategories=document.querySelectorAll('[data-digest-filter]').length;
      document.querySelector('[data-digest-filter]:not([data-digest-filter="all"])')?.click();await new Promise(r=>setTimeout(r,60));result.filteredDigestCards=document.querySelectorAll('.digest-news-card').length;
      click('[data-view="ai-companies"]');await new Promise(r=>setTimeout(r,60));result.aiRows=document.querySelectorAll('.entity-matrix tbody tr').length;result.aiTypeFilters=document.querySelectorAll('[data-ai-type-filter]').length;result.aiRegionFilters=document.querySelectorAll('[data-ai-region-filter]').length;click('[data-entity="palantir"]');await new Promise(r=>setTimeout(r,60));result.aiDrawer=text('#drawer-content');document.querySelector('#drawer-close').click();
      click('[data-view="startups"]');await new Promise(r=>setTimeout(r,60));result.startupRows=document.querySelectorAll('.entity-matrix tbody tr').length;result.startupTitle=text('.matrix-panel h2');
      click('[data-view="consulting"]');await new Promise(r=>setTimeout(r,60));result.consultingRows=document.querySelectorAll('.entity-matrix tbody tr').length;result.consultingFilters=document.querySelectorAll('[data-company-filter]').length;document.querySelector('[data-company-filter="big4"]').click();await new Promise(r=>setTimeout(r,60));result.big4Rows=document.querySelectorAll('.entity-matrix tbody tr').length;click('[data-entity="pwc-consulting"]');await new Promise(r=>setTimeout(r,60));result.drawer=text('#drawer-content');
      return result;
    })()`);
    assert.equal(summary.title,'AI Opportunity Monitor');assert.match(summary.metrics,/監視企業\s*208/);assert.equal(summary.digestCategories>1,true);assert.equal(summary.filteredDigestCards>0,true);assert.equal(summary.aiRows,37);assert.equal(summary.aiTypeFilters>1,true);assert.equal(summary.aiRegionFilters>1,true);assert.match(summary.aiDrawer,/Palantir AIP/);assert.match(summary.aiDrawer,/公式根拠/);assert.equal(summary.startupRows,40);assert.match(summary.startupTitle,/スタートアップ・新興企業/);assert.equal(summary.consultingRows,67);assert.equal(summary.consultingFilters>1,true);assert.equal(summary.big4Rows,4);assert.match(summary.drawer,/調査範囲/);assert.match(summary.drawer,/Global/);assert.match(summary.drawer,/公式根拠/);
    await screenshot(cdp,'browser-ai-opportunity-monitor.png');
    const features=await evaluate(cdp,`(async()=>{
      document.querySelector('#drawer-close').click();document.querySelector('[data-view="enterprises"]').click();await new Promise(r=>setTimeout(r,60));
      const industry=[...document.querySelectorAll('h2')].some(h=>h.textContent.includes('調査済み企業から見えるAI活用・提供状況'));
      document.querySelector('[data-view="ledger"]').click();await new Promise(r=>setTimeout(r,60));const ledgerRows=document.querySelectorAll('.change-ledger tbody tr').length;
       document.querySelector('[data-view="relationships"]').click();await new Promise(r=>setTimeout(r,60));const graphNodes=document.querySelectorAll('.graph-node').length;const themeSummary=document.querySelector('.theme-summary')!==null;const trendPanel=document.querySelector('.momentum-board')===null;const periodButtons=document.querySelectorAll('.period-scope-panel [data-period-scope]').length;const observatory=document.querySelector('.observatory-hero')!==null;const activityMatrix=document.querySelector('.activity-matrix')!==null;const activityDots=document.querySelectorAll('.activity-dot').length;const readout=document.querySelector('.readout-band')!==null;const playerMovements=document.querySelector('.player-movements')!==null;const playerGroupFilters=document.querySelectorAll('[data-player-group]').length;document.querySelector('.period-scope-panel [data-period-scope="quarter"]').click();await new Promise(r=>setTimeout(r,60));const quarterMeta=document.querySelector('.observatory-meta')?.innerText.includes('四半期');const offeringCatalogDefault=document.querySelector('.relationship-catalog')===null;const explorer=document.querySelector('.relationship-explorer');const graphOpenBefore=explorer!==null;const graphPeriodButtons=document.querySelectorAll('.graph-period-control [data-period-scope]').length;const graphViewBoxHeight=Number(document.querySelector('.graph-canvas svg')?.viewBox.baseVal.height||Infinity);const graphCanvasOverflow=getComputedStyle(document.querySelector('.graph-canvas')).overflowY;document.querySelector('[data-graph-filter="offers"]').click();await new Promise(r=>setTimeout(r,60));const graphStaysOpen=document.querySelector('.relationship-explorer')!==null;const graphFilterLabels=[...document.querySelectorAll('.graph-filters button')].every(button=>button.innerText.trim().length>4);document.querySelector('[data-relationship-tab="offers"]').click();await new Promise(r=>setTimeout(r,60));const offeringCatalog=document.querySelector('.relationship-catalog')!==null;document.querySelector('[data-relationship-tab="partners"]').click();await new Promise(r=>setTimeout(r,60));const partnershipCatalog=document.querySelector('.relationship-catalog')!==null;const graphDetails=document.querySelector('.relationship-explorer')!==null;
      document.querySelector('[data-view="insights"]').click();await new Promise(r=>setTimeout(r,60));const insightCards=document.querySelectorAll('.insight-grid article').length;document.querySelector('[data-insight]')?.click();await new Promise(r=>setTimeout(r,60));const insightDrawer=document.querySelector('#drawer-content').innerText.includes('反証・制約');document.querySelector('#drawer-close').click();
      document.querySelector('#meeting-mode-button').click();await new Promise(r=>setTimeout(r,60));const meeting=!document.querySelector('#meeting-mode').hidden&&document.querySelector('#meeting-content').innerText.includes('THIS WEEK');document.querySelector('#meeting-close').click();
       return {industry,ledgerRows,graphNodes,trendPanel,themeSummary,periodButtons,observatory,activityMatrix,activityDots,readout,playerMovements,playerGroupFilters,quarterMeta,graphOpenBefore,graphPeriodButtons,graphViewBoxHeight,graphCanvasOverflow,graphStaysOpen,graphFilterLabels,offeringCatalogDefault,offeringCatalog,partnershipCatalog,graphDetails,insightCards,insightDrawer,meeting};
    })()`);
     assert.equal(features.industry,true);assert.equal(features.ledgerRows>0,true);assert.equal(features.graphNodes>0,true);assert.equal(features.trendPanel,true);assert.equal(features.themeSummary,true);assert.equal(features.periodButtons,4);assert.equal(features.observatory,true);assert.equal(features.activityMatrix,true);assert.equal(features.activityDots>0,true);assert.equal(features.readout,true);assert.equal(features.playerMovements,true);assert.equal(features.playerGroupFilters,6);assert.equal(features.quarterMeta,true);assert.equal(features.graphOpenBefore,true);assert.equal(features.graphPeriodButtons,4);assert.equal(features.graphViewBoxHeight<=560,true);assert.equal(features.graphCanvasOverflow,'hidden');assert.equal(features.graphStaysOpen,true);assert.equal(features.graphFilterLabels,true);assert.equal(features.offeringCatalogDefault,true);assert.equal(features.offeringCatalog,true);assert.equal(features.partnershipCatalog,true);assert.equal(features.graphDetails,true);assert.equal(features.insightCards>0,true);assert.equal(features.insightDrawer,true);assert.equal(features.meeting,true);
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await cdp.send('Page.navigate',{url});await delay(500);
    await evaluate(cdp,`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('.metric-line')){clearInterval(timer);resolve(true);}},100)})`);
    const noOverflow=await evaluate(cdp,'document.documentElement.scrollWidth<=window.innerWidth');assert.equal(noOverflow,true);await screenshot(cdp,'browser-ai-opportunity-monitor-mobile.png');
    console.log(JSON.stringify({ok:true,...summary,features,screenshot:'browser-ai-opportunity-monitor.png'},null,2));
  }finally{
    if(cdp)cdp.close();child.kill();
    try{fs.rmSync(profile,{recursive:true,force:true});}catch{}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
