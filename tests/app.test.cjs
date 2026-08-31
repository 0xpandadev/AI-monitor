const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {dashboard,registry,validateUpdate,validateProfileBatch}=require('../lib/data.cjs');

const ROOT=path.join(__dirname,'..');
function freePort(){return new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});}
async function waitFor(url){for(let index=0;index<50;index++){try{const response=await fetch(url);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('server did not start');}

test('watchlist contains the intended monitoring universe',()=>{
  const {entities,groups}=registry();
  const weeklyResearch=require('../config/weekly-research.json');
  assert.equal(entities.length,181);
  assert.equal(groups.find(group=>group.id==='consulting').members.length,67);
  assert.equal(groups.find(group=>group.id==='enterprises').members.length,42);
  const challengers=groups.find(group=>group.id==='startups');
  assert.equal(challengers.label,'日本AIスタートアップ・新興企業');
  assert.equal(challengers.members.length,40);
  assert.equal(challengers.members.filter(member=>member.watch_tier==='core').length,25);
  assert.equal(weeklyResearch.lanes.find(lane=>lane.id==='company-watch').frequency,'weekly_all');
  assert.equal(groups.filter(group=>['global-saas','japan-saas'].includes(group.id)).reduce((sum,group)=>sum+group.members.length,0),22);
  assert.equal(new Set(entities.map(entity=>entity.id)).size,entities.length);
  for(const id of ['pwc-consulting','mckinsey','bcg','kearney','hikari-ai','flux'])assert.ok(entities.some(entity=>entity.id===id),`${id} missing`);
});

test('public product surface contains only the monitoring product',()=>{
  const files=['index.html','app.js','styles.css'].map(file=>fs.readFileSync(path.join(ROOT,'public',file),'utf8')).join('\n');
  const forbidden=[['Opportunity','Intelligence'].join(' '),['ANALYSIS','RUNS'].join(' '),['材料','産業'].join(''),['data','run'].join('-')];
  for(const phrase of forbidden)assert.equal(files.includes(phrase),false,`${phrase} leaked into public UI`);
  assert.match(files,/AI Opportunity Monitor/);
  assert.match(files,/コンサルマップ/);
  assert.match(files,/日本企業AI利活用/);
  assert.match(files,/変更台帳/);
  assert.match(files,/会議モード/);
  assert.match(files,/社内活用/);
});

test('portable skill manifest keeps the core local and external installs explicit',()=>{
  const manifest=require('../config/skill-dependencies.json');
  assert.equal(manifest.policy.install_requires_explicit_flag,true);
  assert.equal(manifest.policy.never_overwrite,true);
  const core=manifest.dependencies.find(item=>item.id==='update-ai-opportunity-monitor');
  assert.equal(core.requirement,'required');assert.equal(core.delivery,'repository');
  for(const file of core.project_paths)assert.ok(fs.existsSync(path.join(ROOT,file)),`${file} missing`);
  const smart=manifest.dependencies.find(item=>item.id==='smart-research');
  assert.equal(smart.source.type,'github');assert.match(smart.source.url,/^https:\/\/github\.com\//);
  assert.match(smart.source.ref,/^[0-9a-f]{40}$/);
  const foresight=manifest.dependencies.find(item=>item.id==='foresight-radar');
  assert.equal(foresight.installable,false);assert.ok(foresight.fallback);
});

test('board is explicit when empty and every populated signal is sourced',()=>{
  const data=dashboard();
  assert.equal(data.product.name,'AI Opportunity Monitor');
  assert.equal(data.metrics.watched,181);
  assert.equal(data.metrics.profiles_started,11);
  assert.equal(data.metrics.profiles_complete,0);
  assert.deepEqual(data.intelligence.evidence_states.map(item=>item.id),['unknown','observed','active','scaled']);
  assert.ok(data.intelligence.matrices.consulting.dimensions.some(item=>item.id==='internal-use'));
  assert.ok(data.intelligence.matrices.enterprises.dimensions.some(item=>item.id==='manufacturing-rd'));
  if(data.signals.length===0){
    assert.equal(data.brief.headline,'初回の定点観測前です');
    return;
  }
  assert.notEqual(data.brief.headline,'初回の定点観測前です');
  for(const signal of data.signals){
    assert.ok(signal.source?.url,`${signal.id} has no source URL`);
    assert.ok(signal.source?.publisher,`${signal.id} has no source publisher`);
    assert.ok(['confirmed','candidate','updated','retracted'].includes(signal.verification),`${signal.id} has invalid verification`);
  }
});

test('profile batch contract supports parallel evidence-backed backfill',()=>{
  const batch={schema_version:'1.0',batch_id:'consulting-01',updated_at:'2026-08-31T08:00:00.000Z',baseline_window:{start:'2023-09-01',end:'2026-08-31'},profiles:[{entity_id:'mckinsey',status:'partial',current_position:'一次情報に基づく現在位置',maturity_stage:'commercial',development_methods:['in-house'],dimensions:{strategy:'observed'},internal_use:[],offerings:[],partnerships:[],history:[{date:'2026-08-31',title:'公式更新',summary:'確認した内容',category:'AIオファリング',source:{title:'公式更新',url:'https://www.mckinsey.com/',publisher:'McKinsey',tier:'primary'}}]}]};
  assert.deepEqual(validateProfileBatch(batch),[]);
  assert.ok(validateProfileBatch({...batch,profiles:[{...batch.profiles[0],entity_id:'not-watched'}]}).some(error=>error.includes('監視対象')));
});

test('weekly update validator accepts sourced changes and rejects unknown companies',()=>{
  const base={schema_version:'1.0',updated_at:'2026-08-31T00:00:00.000Z',period:{start:'2026-08-24',end:'2026-08-31',label:'2026年8月第5週'},brief:{headline:'AI市場の変化',summary:'確認済み情報の要約',discussion_points:[],category_outlook:[]},source_health:[],limitations:[]};
  const signal={id:'signal-1',entity_id:'mckinsey',title:'AIサービスを発表',summary:'公式発表の要約',why_it_matters:'提供価値の変化を確認する必要がある',category:'AIオファリング',published_at:'2026-08-30',importance:'high',verification:'confirmed',source:{title:'公式発表',url:'https://www.mckinsey.com/',publisher:'McKinsey',tier:'primary'}};
  assert.deepEqual(validateUpdate({...base,signals:[signal]}),[]);
  assert.ok(validateUpdate({...base,signals:[{...signal,entity_id:'not-watched'}]}).some(error=>error.includes('監視対象')));
});

test('local server exposes the standalone dashboard and no AI API requirement',{timeout:15000},async t=>{
  const port=await freePort();const child=spawn(process.execPath,['server.cjs'],{cwd:ROOT,env:{...process.env,AIOM_PORT:String(port)},stdio:'ignore'});t.after(()=>child.kill());
  await waitFor(`http://127.0.0.1:${port}/api/health`);
  let response=await fetch(`http://127.0.0.1:${port}/api/health`);let body=await response.json();assert.equal(body.product,'AI Opportunity Monitor');assert.equal(body.ai_api_required,false);
  response=await fetch(`http://127.0.0.1:${port}/api/dashboard`);body=await response.json();assert.equal(body.metrics.watched,181);assert.equal(body.groups.find(group=>group.id==='consulting').count,67);assert.equal(body.groups.find(group=>group.id==='startups').count,40);assert.equal(body.profile_coverage.profiles_started,11);assert.ok(body.capabilities.capabilities.some(item=>item.id==='historical-baseline'));
  response=await fetch(`http://127.0.0.1:${port}/`);assert.equal(response.status,200);assert.match(await response.text(),/<title>AI Opportunity Monitor<\/title>/);
});
