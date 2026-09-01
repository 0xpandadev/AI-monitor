const fs=require('node:fs');
const path=require('node:path');
const {validateUpdate}=require('../lib/data.cjs');
const root=path.join(__dirname,'..');
const runId=process.argv[2];
if(!runId)throw new Error('Usage: npm run research:validate -- weekly-YYYY-MM-DD');
if(!/^weekly-\d{4}-\d{2}-\d{2}$/.test(runId))throw new Error('run_idの形式が不正です');
const dir=path.join(root,'data','runs',runId);
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const errors=[];let manifest,discovery,verification,ontology,scenario,update;
try{manifest=read('manifest.json');discovery=read('discovery.json');verification=read('verification.json');ontology=read('ontology-analysis.json');scenario=read('scenario-analysis.json');update=read('weekly-update.json');}catch(error){throw new Error(`ランの必須ファイルを読めません: ${error.message}`);}
if(manifest.run_id!==runId)errors.push('manifest.run_idがディレクトリ名と一致しません');
if(discovery.run_id!==runId||verification.run_id!==runId||ontology.run_id!==runId||scenario.run_id!==runId)errors.push('分析ファイルのrun_idが一致しません');
for(const [index,item] of (discovery.candidates||[]).entries()){
  const p=`discovery.candidates[${index}]`;
  if(!item.id||!item.title||!item.category||!item.discovered_from?.url)errors.push(`${p} は id/title/category/discovered_from.url が必要です`);
  if(!['aihot','foresight-radar','opportunity-intelligence','official-source','manual'].includes(item.discovery_method))errors.push(`${p}.discovery_methodが不正です`);
}
const candidates=new Set((discovery.candidates||[]).map(item=>item.id));
for(const [index,item] of (verification.items||[]).entries()){
  const p=`verification.items[${index}]`;
  if(!item.candidate_id||!candidates.has(item.candidate_id))errors.push(`${p}.candidate_idが発見候補にありません`);
  if(!['confirmed','candidate','retracted','not_verified'].includes(item.status))errors.push(`${p}.statusが不正です`);
  if(item.status==='confirmed'&&(!Array.isArray(item.primary_sources)||item.primary_sources.length===0))errors.push(`${p} confirmedには一次情報が必要です`);
}
const confirmed=new Set((verification.items||[]).filter(item=>item.status==='confirmed').map(item=>item.id));
for(const [index,pattern] of (ontology.patterns||[]).entries()){
  if(!pattern.statement||!Array.isArray(pattern.evidence_verification_ids)||pattern.evidence_verification_ids.length<2)errors.push(`ontology.patterns[${index}] は statement と2件以上の根拠が必要です`);
  for(const id of pattern.evidence_verification_ids||[])if(!confirmed.has(id))errors.push(`ontology.patterns[${index}] の根拠 ${id} はconfirmedではありません`);
}
if(scenario.status==='completed'){
  if(!scenario.engine||!Array.isArray(scenario.seed_material)||scenario.seed_material.length===0||!Array.isArray(scenario.scenarios)||scenario.scenarios.length===0)errors.push('scenario completedにはengine、seed_material、scenariosが必要です');
}
const updateErrors=validateUpdate(update);errors.push(...updateErrors.map(error=>`weekly-update: ${error}`));
const verificationById=new Map((verification.items||[]).map(item=>[item.id,item]));
for(const [index,signal] of (update.signals||[]).entries()){
  const verificationId=signal.verification_id;
  const item=verificationById.get(verificationId);
  if(!verificationId||!item)errors.push(`weekly-update.signals[${index}] はverification_idで確認結果に接続してください`);
  else if(signal.verification==='confirmed'&&item.status!=='confirmed')errors.push(`weekly-update.signals[${index}] confirmedの根拠がconfirmedではありません`);
}
const result={ok:errors.length===0,run_id:runId,errors,coverage:{candidates:(discovery.candidates||[]).length,verified:(verification.items||[]).filter(item=>item.status==='confirmed').length,publishable_signals:(update.signals||[]).filter(item=>item.verification==='confirmed').length,scenario_status:scenario.status}};
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
