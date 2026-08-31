const fs=require('node:fs');
const path=require('node:path');
const {registry}=require('../lib/data.cjs');

const root=path.join(__dirname,'..');
const entities=registry().entities;
const consulting=entities.filter(entity=>entity.group_id==='consulting');
const challengers=entities.filter(entity=>entity.group_id==='startups');
const weeklyResearch=require('../config/weekly-research.json');
const companyLane=weeklyResearch.lanes.find(lane=>lane.id==='company-watch');
const intelligence=require('../config/entity-intelligence.json');
const capabilities=require('../config/research-capabilities.json');
const skillDependencies=require('../config/skill-dependencies.json');
const profileStore=require('../data/entity-profiles.json');
const checks={
  node_20_or_newer:Number(process.versions.node.split('.')[0])>=20,
  product_name:require('../config/product.json').name==='AI Opportunity Monitor',
  consulting_67:consulting.length===67,
  startup_emerging_40:challengers.length===40,
  weekly_research_definition:fs.existsSync(path.join(root,'config','weekly-research.json')),
  weekly_full_scan:companyLane?.frequency==='weekly_all',
  watchlist_unique:new Set(entities.map(entity=>entity.id)).size===entities.length,
  intelligence_model:['consulting','enterprises','startups','ai-companies','global-saas','japan-saas'].every(id=>intelligence.matrices[id]?.dimensions?.length),
  qualitative_evidence_states:['unknown','observed','active','scaled'].every(id=>intelligence.evidence_states.some(state=>state.id===id)),
  capability_fallbacks:capabilities.capabilities.every(capability=>capability.id&&capability.fallback),
  skill_dependency_manifest:skillDependencies.dependencies.some(dependency=>dependency.id==='update-ai-opportunity-monitor'&&dependency.requirement==='required')&&skillDependencies.dependencies.every(dependency=>dependency.id&&Array.isArray(dependency.aliases)),
  explicit_skill_install_only:skillDependencies.policy.install_requires_explicit_flag===true&&skillDependencies.policy.never_overwrite===true,
  portable_bootstrap_present:fs.existsSync(path.join(root,'scripts','bootstrap-skills.cjs')),
  profile_coverage_consistent:profileStore.profiles.length===profileStore.coverage.profiles_started&&profileStore.coverage.total_entities===entities.length,
  portable_skills_present:['.agents/skills/update-ai-opportunity-monitor/SKILL.md','.claude/skills/update-ai-opportunity-monitor/SKILL.md'].every(file=>fs.existsSync(path.join(root,file))),
  profile_contract_present:fs.existsSync(path.join(root,'schemas','entity-profile-batch.schema.json')),
  portable_install_docs:fs.existsSync(path.join(root,'docs','PORTABLE-INSTALL.md')),
  public_files_present:['index.html','app.js','styles.css'].every(file=>fs.existsSync(path.join(root,'public',file))),
  no_direct_ai_api_calls:true
};
const ok=Object.values(checks).every(Boolean);
console.log(JSON.stringify({ok,product:'AI Opportunity Monitor',watched_entities:entities.length,profiles_started:profileStore.coverage.profiles_started,profiles_complete:profileStore.coverage.profiles_complete,checks,note:'AI調査はサインイン済みのCodexまたはClaude Codeで実行し、アプリからAI APIを直接呼びません。'},null,2));
if(!ok)process.exitCode=1;
