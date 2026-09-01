const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {dashboard,registry,validateUpdate,validateProfileBatch}=require('../lib/data.cjs');

const ROOT=path.join(__dirname,'..');
function freePort(){return new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});}
async function waitFor(url){for(let index=0;index<50;index++){try{const response=await fetch(url);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('server did not start');}

test('watchlist contains the intended monitoring universe',()=>{
  const {entities,groups}=registry();
  const weeklyResearch=require('../config/weekly-research.json');
  assert.equal(entities.length,208);
  assert.equal(groups.find(group=>group.id==='ai-companies').members.length,37);
  assert.ok(groups.find(group=>group.id==='ai-companies').members.some(member=>member.segment==='ビッグテック'&&member.region_tag==='中国'));
  assert.ok(groups.find(group=>group.id==='ai-companies').members.some(member=>member.segment==='半導体・ハード'&&member.region_tag==='台湾'));
  assert.equal(groups.find(group=>group.id==='consulting').members.length,67);
  for(const id of ['pwc-consulting','ey-strategy-consulting','kpmg-consulting','deloitte-tohmatsu']){
    const member=groups.find(group=>group.id==='consulting').members.find(item=>item.id===id);
    assert.deepEqual(member.research_scope,['Japan','Global']);
  }
  assert.equal(groups.find(group=>group.id==='enterprises').members.length,42);
  const challengers=groups.find(group=>group.id==='startups');
  assert.equal(challengers.label,'日本AIスタートアップ・新興企業');
  assert.equal(challengers.members.length,40);
  assert.equal(challengers.members.filter(member=>member.watch_tier==='core').length,25);
  assert.equal(weeklyResearch.lanes.find(lane=>lane.id==='company-watch').frequency,'weekly_all');
  assert.equal(groups.filter(group=>['global-saas','japan-saas'].includes(group.id)).reduce((sum,group)=>sum+group.members.length,0),22);
  assert.equal(new Set(entities.map(entity=>entity.id)).size,entities.length);
  for(const id of ['pwc-consulting','mckinsey','bcg','kearney','hikari-ai','flux','palantir','deepseek','moonshot-ai','minimax','coreweave','amd','tsmc'])assert.ok(entities.some(entity=>entity.id===id),`${id} missing`);
});

test('public product surface contains only the monitoring product',()=>{
  const files=['index.html','app.js','styles.css'].map(file=>fs.readFileSync(path.join(ROOT,'public',file),'utf8')).join('\n');
  const forbidden=[['Opportunity','Intelligence'].join(' '),['ANALYSIS','RUNS'].join(' '),['材料','産業'].join(''),['data','run'].join('-')];
  for(const phrase of forbidden)assert.equal(files.includes(phrase),false,`${phrase} leaked into public UI`);
  assert.match(files,/AI Opportunity Monitor/);
  assert.match(files,/コンサルマップ/);
  assert.match(files,/事業会社のAI活用・提供状況/);
  assert.match(files,/更新履歴/);
  assert.match(files,/カテゴリ別ニュース/);
  assert.match(files,/コンサル分類/);
  assert.match(files,/企業・テーマを検索/);
  assert.match(files,/検索結果/);
  assert.match(files,/自社AI活用/);
  assert.match(files,/AI市場の動き/);
  assert.match(files,/示唆ボード/);
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
  const ontology=manifest.dependencies.find(item=>item.id==='palantir-ontology');
  for(const dependency of [foresight,ontology]){
    assert.equal(dependency.installable,true);assert.equal(dependency.source.type,'github');assert.match(dependency.source.url,/^https:\/\/github\.com\/0xpandadev\//);assert.match(dependency.source.ref,/^[0-9a-f]{40}$/);assert.ok(dependency.fallback);
  }
});

test('skill checker exposes the missing skill source and explicit install command',()=>{
  const result=spawnSync(process.execPath,['scripts/bootstrap-skills.cjs','--json','--target=claude'],{cwd:ROOT,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);
  const foresight=report.dependencies.find(item=>item.id==='foresight-radar');
  const ontology=report.dependencies.find(item=>item.id==='palantir-ontology');
  for(const item of [foresight,ontology]){
    assert.equal(item.targets[0].status,'missing');assert.match(item.source_url,/^https:\/\/github\.com\/0xpandadev\//);assert.match(item.install_command,/npm run skills:install/);
  }
});

test('board is explicit when empty and every populated signal is sourced',()=>{
  const data=dashboard();
  assert.equal(data.product.name,'AI Opportunity Monitor');
  assert.equal(data.metrics.watched,208);
  assert.equal(data.metrics.profiles_started,data.profile_coverage.profiles_started);
  assert.ok(data.metrics.profiles_started>=69);
  assert.equal(data.entities.filter(entity=>entity.group_id==='ai-companies'&&entity.profile).length,37);
  assert.ok(data.entities.find(entity=>entity.id==='pwc-consulting').profile.research_scope.some(item=>item.scope==='Global'));
  assert.equal(data.metrics.profiles_complete,0);
  assert.deepEqual(data.intelligence.evidence_states.map(item=>item.id),['unknown','observed','active','scaled']);
  assert.deepEqual(data.intelligence.matrices.consulting.dimensions.map(item=>item.id),['client-offerings','delivery-capability','internal-adoption','reusable-assets','external-ecosystem','ai-talent-org']);
  assert.deepEqual(data.intelligence.matrices.enterprises.dimensions.map(item=>item.id),['internal-use','product-embedding','ai-business','tech-research','org-talent','ecosystem']);
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

test('ontology surface derives relationships, honest trends, and sourced insights',()=>{
  const data=dashboard();const signalIds=new Set(data.signals.map(signal=>signal.id));
  assert.equal(data.ontology.schema_version,'1.0');
  assert.ok(data.knowledge_graph.summary.nodes>0);
  assert.ok(data.knowledge_graph.summary.edges>0);
  assert.equal(data.knowledge_graph.summary.watched_companies,data.metrics.watched);
  assert.ok(data.knowledge_graph.summary.relation_counts['changed-in']>0);
  for(const edge of data.knowledge_graph.edges){
    assert.ok(['item','profile','unverified'].includes(edge.evidence_scope),`${edge.id} has invalid evidence scope`);
    assert.equal(edge.evidence_count,edge.evidence_ids.length);
    for(const id of edge.evidence_ids)assert.ok(signalIds.has(id),`${edge.id} references unknown direct evidence ${id}`);
    for(const id of (edge.profile_evidence_ids||[]))assert.ok(signalIds.has(id)||String(id).startsWith('profile:'),`${edge.id} references unknown profile evidence ${id}`);
  }
  assert.ok(data.knowledge_graph.summary.relation_evidence_counts.offers.profile>0);
  assert.ok(data.knowledge_graph.summary.relation_evidence_counts['partners-with'].profile>0);
  assert.equal(data.trends.sufficient_for_line,false);
  assert.ok(Array.isArray(data.trends.momentum_themes));
  assert.ok(data.trends.momentum_themes.length>0);
  assert.ok(data.trends.momentum_themes.every(item=>item.category&&item.momentum));
  for(const insight of data.insights){
    assert.ok(insight.entity_ids.length>=2);
    assert.ok(insight.evidence_count>=2);
    assert.ok(insight.counterevidence);
    assert.ok(insight.next_watch);
    for(const id of insight.evidence_signal_ids)assert.ok(signalIds.has(id));
  }
});

test('profile batch contract supports parallel evidence-backed backfill',()=>{
  const batch={schema_version:'1.0',batch_id:'consulting-01',updated_at:'2026-08-31T08:00:00.000Z',baseline_window:{start:'2021-09-01',end:'2026-08-31'},profiles:[{entity_id:'mckinsey',status:'partial',current_position:'一次情報に基づく現在位置',maturity_stage:'commercial',development_methods:['in-house'],dimensions:{'client-offerings':'observed'},internal_use:[],offerings:[],partnerships:[],history:[{date:'2026-08-31',title:'公式更新',summary:'確認した内容',category:'AIオファリング',source:{title:'公式更新',url:'https://www.mckinsey.com/',publisher:'McKinsey',tier:'primary'}}]}]};
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
  response=await fetch(`http://127.0.0.1:${port}/api/dashboard`);body=await response.json();assert.equal(body.metrics.watched,208);assert.equal(body.groups.find(group=>group.id==='consulting').count,67);assert.equal(body.groups.find(group=>group.id==='startups').count,40);assert.equal(body.groups.find(group=>group.id==='ai-companies').count,37);assert.equal(body.entities.filter(entity=>entity.group_id==='ai-companies'&&entity.profile).length,37);assert.equal(body.profile_coverage.profiles_started,body.metrics.profiles_started);assert.ok(body.profile_coverage.profiles_started>=69);assert.ok(body.capabilities.capabilities.some(item=>item.id==='historical-baseline'));
  response=await fetch(`http://127.0.0.1:${port}/`);assert.equal(response.status,200);assert.match(await response.text(),/<title>AI Opportunity Monitor<\/title>/);
});
