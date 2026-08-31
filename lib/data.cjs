const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {buildIntelligenceSurface}=require('./intelligence.cjs');

const ROOT=path.join(__dirname,'..');
const PATHS={
  product:path.join(ROOT,'config','product.json'),
  watchlist:path.join(ROOT,'config','watchlist.json'),
  localWatchlist:path.join(ROOT,'data','local-watchlist.json'),
  sources:path.join(ROOT,'config','sources.json'),
  topics:path.join(ROOT,'config','topics.json'),
  intelligence:path.join(ROOT,'config','entity-intelligence.json'),
  capabilities:path.join(ROOT,'config','research-capabilities.json'),
  ontology:path.join(ROOT,'config','ontology.json'),
  profiles:path.join(ROOT,'data','entity-profiles.json'),
  brief:path.join(ROOT,'data','brief.json'),
  signals:path.join(ROOT,'data','signals.json'),
  archiveIndex:path.join(ROOT,'data','archive','index.json'),
  archive:path.join(ROOT,'data','archive')
};

function readJson(file,fallback=null){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.${process.pid}.${Date.now()}.tmp`;fs.writeFileSync(temp,`${JSON.stringify(value,null,2)}\n`,'utf8');fs.renameSync(temp,file);}
function asciiId(value){const normalized=String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64);return normalized||`entity-${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0,10)}`;}

function registry(){
  const seed=readJson(PATHS.watchlist,{groups:[]});
  const local=readJson(PATHS.localWatchlist,{members:[]});
  const groups=seed.groups.map(group=>({...group,members:group.members.map(member=>({...member,group_id:group.id,group_label:group.label,region:member.region||group.region}))}));
  if(local.members?.length) groups.push({id:'additional',label:'追加ウォッチ',region:'Mixed',members:local.members.map(member=>({...member,group_id:'additional',group_label:'追加ウォッチ'}))});
  const entities=groups.flatMap(group=>group.members);
  return {groups,entities};
}

function dashboard(){
  const {groups,entities}=registry();
  const stored=readJson(PATHS.signals,{updated_at:null,signals:[]});
  const brief=readJson(PATHS.brief,{});
  const intelligence=readJson(PATHS.intelligence,{matrices:{},evidence_states:[],maturity_stages:[],development_methods:[]});
  const profileStore=readJson(PATHS.profiles,{coverage:{status:'not_started',profiles_started:0,profiles_complete:0,total_entities:entities.length},profiles:[]});
  const profileMap=new Map((profileStore.profiles||[]).map(profile=>[profile.entity_id,profile]));
  const signals=(stored.signals||[]).slice().sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)));
  const latestByEntity=new Map();
  for(const signal of signals)if(!latestByEntity.has(signal.entity_id))latestByEntity.set(signal.entity_id,signal);
  const enriched=entities.map(entity=>({...entity,profile:profileMap.get(entity.id)||null,latest_signal:latestByEntity.get(entity.id)||null,signal_count:signals.filter(signal=>signal.entity_id===entity.id).length}));
  const entityMap=new Map(enriched.map(entity=>[entity.id,entity]));
  const enrichedSignals=signals.map(signal=>({...signal,entity:entityMap.get(signal.entity_id)||null}));
  const surface=buildIntelligenceSurface({entities:enriched,signals:enrichedSignals,ontology:readJson(PATHS.ontology,{schema_version:'1.0',insight_policy:{minimum_entities:2,minimum_confirmed_signals:2,high_confidence_signals:3,require_primary_source:true}}),profileCoverage:profileStore.coverage});
  return {
    product:readJson(PATHS.product),
    updated_at:stored.updated_at,
    brief,
    metrics:{
      watched:entities.length,
      confirmed:signals.filter(signal=>signal.verification==='confirmed').length,
      important:signals.filter(signal=>signal.importance==='critical'||signal.importance==='high').length,
      this_period:signals.filter(signal=>!brief.period||signal.published_at>=brief.period.start).length,
      profiles_started:profileMap.size,
      profiles_complete:[...profileMap.values()].filter(profile=>profile.status==='complete').length
    },
    groups:groups.map(group=>({id:group.id,label:group.label,region:group.region,count:group.members.length,signal_count:signals.filter(signal=>entityMap.get(signal.entity_id)?.group_id===group.id).length})),
    entities:enriched,
    signals:enrichedSignals,
    topics:readJson(PATHS.topics,{topics:[]}).topics,
    sources:readJson(PATHS.sources,{policy:{},sources:[]}),
    intelligence,
    capabilities:readJson(PATHS.capabilities,{capabilities:[],portability:{}}),
    profile_coverage:profileStore.coverage,
    archive:readJson(PATHS.archiveIndex,{months:[]}).months,
    ontology:surface.ontology,
    knowledge_graph:surface.knowledge_graph,
    insights:surface.insights,
    trends:surface.trends
  };
}

function addEntity(input){
  const current=registry().entities;
  const name=String(input.name||'').trim();
  const id=String(input.id||asciiId(name));
  const errors=[];
  if(name.length<2||name.length>120)errors.push('企業名は2〜120文字で入力してください');
  if(!/^[a-z0-9_-]+$/.test(id))errors.push('IDは英小文字・数字・ハイフン・アンダースコアのみです');
  if(current.some(entity=>entity.id===id))errors.push('同じ企業が登録されています');
  if(input.official_url){try{const url=new URL(input.official_url);if(!['http:','https:'].includes(url.protocol))errors.push('公式URLはhttpまたはhttpsで入力してください');}catch{errors.push('公式URLを確認してください');}}
  if(errors.length)return {ok:false,errors};
  const file=readJson(PATHS.localWatchlist,{updated_at:null,members:[]});
  const entity={id,name,region:input.region||'Japan',segment:input.segment||'未分類',official_url:input.official_url||null,group_id:'additional',group_label:'追加ウォッチ'};
  file.members=[...(file.members||[]),entity];file.updated_at=new Date().toISOString();writeJson(PATHS.localWatchlist,file);
  return {ok:true,entity};
}

function validateUpdate(update){
  const errors=[];
  const ids=new Set(registry().entities.map(entity=>entity.id));
  if(!update||typeof update!=='object')return ['更新データがJSONオブジェクトではありません'];
  if(update.schema_version!=='1.0')errors.push('schema_versionは1.0です');
  if(!update.updated_at||Number.isNaN(Date.parse(update.updated_at)))errors.push('updated_atをISO日時で入力してください');
  for(const field of ['start','end','label'])if(!update.period?.[field])errors.push(`period.${field}が必要です`);
  if(!update.brief?.headline||!update.brief?.summary||!Array.isArray(update.brief?.discussion_points)||!Array.isArray(update.brief?.category_outlook))errors.push('briefが不足しています');
  if(!Array.isArray(update.signals))errors.push('signalsは配列です');
  for(const [index,signal] of (update.signals||[]).entries()){
    const required=['id','entity_id','title','summary','why_it_matters','category','published_at','importance','verification'];
    for(const field of required)if(!signal[field])errors.push(`signals[${index}].${field}が必要です`);
    if(!ids.has(signal.entity_id))errors.push(`signals[${index}].entity_idは監視対象にありません`);
    if(!['critical','high','medium','watch'].includes(signal.importance))errors.push(`signals[${index}].importanceが不正です`);
    if(!['confirmed','candidate','updated','retracted'].includes(signal.verification))errors.push(`signals[${index}].verificationが不正です`);
    if(!signal.source?.url||!signal.source?.publisher||!signal.source?.tier)errors.push(`signals[${index}].sourceが不足しています`);
    else try{const url=new URL(signal.source.url);if(!['http:','https:'].includes(url.protocol))errors.push(`signals[${index}].source.urlが不正です`);}catch{errors.push(`signals[${index}].source.urlが不正です`);}
  }
  if(!Array.isArray(update.source_health))errors.push('source_healthは配列です');
  if(!Array.isArray(update.limitations))errors.push('limitationsは配列です');
  return errors;
}

function validateProfileBatch(batch){
  const errors=[];
  const entities=registry().entities;
  const entityMap=new Map(entities.map(entity=>[entity.id,entity]));
  const intelligence=readJson(PATHS.intelligence,{matrices:{},evidence_states:[],maturity_stages:[],development_methods:[]});
  const evidenceStates=new Set(intelligence.evidence_states.map(state=>state.id));
  const maturityStages=new Set(intelligence.maturity_stages.map(stage=>stage.id));
  const developmentMethods=new Set(intelligence.development_methods.map(method=>method.id));
  if(!batch||typeof batch!=='object')return ['プロフィールバッチがJSONオブジェクトではありません'];
  if(batch.schema_version!=='1.0')errors.push('schema_versionは1.0です');
  if(!batch.updated_at||Number.isNaN(Date.parse(batch.updated_at)))errors.push('updated_atをISO日時で入力してください');
  if(!batch.baseline_window?.start||!batch.baseline_window?.end)errors.push('baseline_windowが必要です');
  if(!Array.isArray(batch.profiles))errors.push('profilesは配列です');
  const seen=new Set();
  for(const [index,profile] of (batch.profiles||[]).entries()){
    const prefix=`profiles[${index}]`;
    const entity=entityMap.get(profile.entity_id);
    if(!entity)errors.push(`${prefix}.entity_idは監視対象にありません`);
    if(seen.has(profile.entity_id))errors.push(`${prefix}.entity_idが重複しています`);seen.add(profile.entity_id);
    if(!['partial','complete'].includes(profile.status))errors.push(`${prefix}.statusが不正です`);
    if(!profile.current_position)errors.push(`${prefix}.current_positionが必要です`);
    if(!maturityStages.has(profile.maturity_stage))errors.push(`${prefix}.maturity_stageが不正です`);
    if(!Array.isArray(profile.development_methods)||profile.development_methods.some(method=>!developmentMethods.has(method)))errors.push(`${prefix}.development_methodsが不正です`);
    if(!profile.dimensions||typeof profile.dimensions!=='object')errors.push(`${prefix}.dimensionsが必要です`);
    const matrix=intelligence.matrices[entity?.group_id];
    const allowedDimensions=new Set((matrix?.dimensions||[]).map(dimension=>dimension.id));
    for(const [dimension,state] of Object.entries(profile.dimensions||{})){
      if(!allowedDimensions.has(dimension))errors.push(`${prefix}.dimensions.${dimension}は分類にありません`);
      if(!evidenceStates.has(state))errors.push(`${prefix}.dimensions.${dimension}の状態が不正です`);
    }
    if(!Array.isArray(profile.history))errors.push(`${prefix}.historyは配列です`);
    for(const [historyIndex,item] of (profile.history||[]).entries()){
      const historyPrefix=`${prefix}.history[${historyIndex}]`;
      for(const field of ['date','title','category','summary'])if(!item[field])errors.push(`${historyPrefix}.${field}が必要です`);
      if(!item.source?.url||!item.source?.publisher||!item.source?.tier)errors.push(`${historyPrefix}.sourceが不足しています`);
      else try{const url=new URL(item.source.url);if(!['http:','https:'].includes(url.protocol))errors.push(`${historyPrefix}.source.urlが不正です`);}catch{errors.push(`${historyPrefix}.source.urlが不正です`);}
    }
  }
  return errors;
}

function importProfileBatch(batch){
  const errors=validateProfileBatch(batch);if(errors.length)return {ok:false,errors};
  const current=readJson(PATHS.profiles,{updated_at:null,baseline_window:batch.baseline_window,coverage:{},profiles:[]});
  const merged=new Map((current.profiles||[]).map(profile=>[profile.entity_id,profile]));
  for(const profile of batch.profiles){
    const previous=merged.get(profile.entity_id)||{};
    merged.set(profile.entity_id,{...previous,...profile,history:profile.history||previous.history||[],last_reviewed:batch.updated_at});
  }
  const profiles=[...merged.values()];
  const total=registry().entities.length;
  const coverage={status:profiles.filter(profile=>profile.status==='complete').length===total?'complete':'in_progress',profiles_started:profiles.length,profiles_complete:profiles.filter(profile=>profile.status==='complete').length,total_entities:total,note:'completeは指定した基準窓の一次情報確認が完了したプロフィールのみ'};
  writeJson(PATHS.profiles,{updated_at:batch.updated_at,baseline_window:batch.baseline_window,coverage,profiles});
  return {ok:true,profiles_imported:batch.profiles.length,profiles_started:profiles.length,profiles_complete:coverage.profiles_complete,total_entities:total};
}

function importUpdate(update){
  const errors=validateUpdate(update);if(errors.length)return {ok:false,errors};
  const current=readJson(PATHS.signals,{updated_at:null,signals:[]});
  const merged=new Map((current.signals||[]).map(signal=>[signal.id,signal]));
  for(const signal of update.signals)merged.set(signal.id,signal);
  writeJson(PATHS.signals,{updated_at:update.updated_at,signals:[...merged.values()]});
  writeJson(PATHS.brief,{updated_at:update.updated_at,period:update.period,...update.brief,source_health:update.source_health,limitations:update.limitations});
  const month=String(update.period.end).slice(0,7);const archiveFile=path.join(PATHS.archive,`${month}.json`);writeJson(archiveFile,update);
  const index=readJson(PATHS.archiveIndex,{months:[]});
  const entry={month,label:update.period.label,updated_at:update.updated_at,headline:update.brief.headline,signal_count:update.signals.length,file:`${month}.json`};
  index.months=[entry,...(index.months||[]).filter(item=>item.month!==month)].sort((a,b)=>b.month.localeCompare(a.month));writeJson(PATHS.archiveIndex,index);
  return {ok:true,updated_at:update.updated_at,signals_added:update.signals.length,total_signals:merged.size};
}

module.exports={PATHS,addEntity,dashboard,importProfileBatch,importUpdate,readJson,registry,validateProfileBatch,validateUpdate,writeJson};
