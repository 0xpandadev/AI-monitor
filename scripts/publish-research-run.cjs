const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {importUpdate,writeJson}=require('../lib/data.cjs');
const root=path.join(__dirname,'..');
const runId=process.argv[2];
if(!runId)throw new Error('Usage: npm run research:publish -- weekly-YYYY-MM-DD');
const checked=spawnSync(process.execPath,[path.join(__dirname,'validate-research-run.cjs'),runId],{encoding:'utf8'});
process.stdout.write(checked.stdout);if(checked.status!==0)process.exit(checked.status||1);
const dir=path.join(root,'data','runs',runId);const update=JSON.parse(fs.readFileSync(path.join(dir,'weekly-update.json'),'utf8'));const rankings=JSON.parse(fs.readFileSync(path.join(dir,'rankings.json'),'utf8'));const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const result=importUpdate(update);if(!result.ok)throw new Error(result.errors.join('\n'));
manifest.status='published';manifest.published_at=new Date().toISOString();manifest.publication={status:'published',confirmed_signals:update.signals.filter(item=>item.verification==='confirmed').length,candidate_signals:0,coverage_note:'確認済みの週次更新のみをアプリデータへ取り込んだ'};writeJson(path.join(dir,'manifest.json'),manifest);
const confirmedRankings=(rankings.sources||[]).filter(item=>item.status==='confirmed'&&Array.isArray(item.rows)&&item.rows.length);
if(confirmedRankings.length){
  const target=path.join(root,'data','rankings.json');
  const existing=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):{schema_version:'1.0',sources:[]};
  const merged=new Map((existing.sources||[]).map(item=>[item.id,item]));
  for(const item of confirmedRankings)merged.set(item.id,item);
  writeJson(target,{schema_version:'1.0',updated_at:manifest.published_at,policy:'ランキングは測定軸ごとに表示し、異なるランキングを合算しない。',sources:[...merged.values()]});
}
console.log(JSON.stringify({ok:true,run_id:runId,rankings_updated:confirmedRankings.length,...result},null,2));
