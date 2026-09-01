const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const manifest=require('../config/skill-dependencies.json');
const args=new Set(process.argv.slice(2));
const install=args.has('--install');
const asJson=args.has('--json');
const targetArg=process.argv.find(value=>value.startsWith('--target='))?.split('=')[1]||'auto';
const validTargets=new Set(['auto','codex','claude','both']);
if(!validTargets.has(targetArg))throw new Error('--targetはauto、codex、claude、bothのいずれかです');

const home=os.homedir();
const targetRoots={
  codex:path.join(process.env.CODEX_HOME||path.join(home,'.codex'),'skills'),
  claude:path.join(process.env.CLAUDE_CONFIG_DIR||path.join(home,'.claude'),'skills')
};
function commandExists(command){return spawnSync(process.platform==='win32'?'where':'which',[command],{stdio:'ignore'}).status===0;}
function selectedTargets(){
  if(targetArg==='both')return ['codex','claude'];
  if(targetArg!=='auto')return [targetArg];
  const found=[];
  if(process.env.CODEX_HOME||fs.existsSync(path.join(home,'.codex'))||commandExists('codex'))found.push('codex');
  if(process.env.CLAUDE_CONFIG_DIR||fs.existsSync(path.join(home,'.claude'))||commandExists('claude'))found.push('claude');
  return found.length?found:['codex'];
}
function projectSkillFound(dependency){
  return (dependency.project_paths||[]).map(file=>path.join(root,file)).find(file=>fs.existsSync(file))||null;
}
function installedSkill(target,dependency){
  return (dependency.aliases||[dependency.id]).map(name=>path.join(targetRoots[target],name,'SKILL.md')).find(file=>fs.existsSync(file))||null;
}
function validateSource(dependency,sourceDirectory){
  const skillFile=path.join(sourceDirectory,'SKILL.md');
  if(!fs.existsSync(skillFile))throw new Error(`${dependency.id}: sourceにSKILL.mdがありません`);
  const text=fs.readFileSync(skillFile,'utf8');
  const declared=text.match(/^name:\s*([^\r\n]+)$/m)?.[1]?.trim();
  if(declared&&!dependency.aliases.includes(declared))throw new Error(`${dependency.id}: SKILL.mdのname=${declared}が許可aliasと一致しません`);
}
function stageGitHubSource(dependency){
  const source=dependency.source;
  if(source?.type!=='github'||!source.url.startsWith('https://github.com/'))throw new Error(`${dependency.id}: 許可されたGitHub sourceではありません`);
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'aiom-skill-'));
  const checkout=path.join(temporary,'checkout');
  let clone;
  if(/^[0-9a-f]{40}$/i.test(source.ref)){
    clone=spawnSync('git',['init',checkout],{encoding:'utf8'});
    if(clone.status===0)clone=spawnSync('git',['-C',checkout,'remote','add','origin',source.url],{encoding:'utf8'});
    if(clone.status===0)clone=spawnSync('git',['-C',checkout,'fetch','--depth','1','origin',source.ref],{encoding:'utf8'});
    if(clone.status===0)clone=spawnSync('git',['-C',checkout,'checkout','--detach','FETCH_HEAD'],{encoding:'utf8'});
  }else{
    clone=spawnSync('git',['clone','--depth','1','--branch',source.ref,source.url,checkout],{encoding:'utf8'});
  }
  if(clone.status!==0){fs.rmSync(temporary,{recursive:true,force:true});throw new Error(`${dependency.id}: checkout失敗: ${(clone.stderr||clone.stdout||'unknown error').trim()}`);}
  const sourceDirectory=path.resolve(checkout,source.path||'.');
  if(!sourceDirectory.startsWith(path.resolve(checkout)))throw new Error(`${dependency.id}: source.pathがcheckout外です`);
  validateSource(dependency,sourceDirectory);
  return {temporary,sourceDirectory};
}
function copySkill(dependency,sourceDirectory,target){
  const destination=path.join(targetRoots[target],dependency.id);
  if(fs.existsSync(destination))return {status:'skipped-existing',destination};
  fs.mkdirSync(targetRoots[target],{recursive:true});
  fs.cpSync(sourceDirectory,destination,{recursive:true,filter:source=>path.basename(source)!=='.git'});
  validateSource(dependency,destination);
  return {status:'installed',destination};
}

const targets=selectedTargets();
const report=[];
for(const dependency of manifest.dependencies){
  const projectLocation=projectSkillFound(dependency);
  const targetStatus=targets.map(target=>({target,location:installedSkill(target,dependency)}));
  const row={
    id:dependency.id,
    requirement:dependency.requirement,
    delivery:dependency.delivery,
    project_location:projectLocation,
    targets:targetStatus.map(item=>({target:item.target,status:item.location?'already-installed':'missing',location:item.location})),
    installable:Boolean(dependency.installable),
    fallback:dependency.fallback||null,
    source_status:dependency.source_status||dependency.source?.pin_status||'not-applicable',
    source_url:dependency.source?.web_url||dependency.source?.url||null,
    source_ref:dependency.source?.ref||null,
    install_command:dependency.installable?`npm run skills:install -- --target=${targetArg==='auto'?'codex|claude|both':targetArg}`:null,
    actions:[]
  };
  const missing=targetStatus.filter(item=>!item.location);
  if(install&&dependency.installable&&missing.length){
    let staged;
    try{
      staged=stageGitHubSource(dependency);
      for(const item of missing)row.actions.push({target:item.target,...copySkill(dependency,staged.sourceDirectory,item.target)});
    }catch(error){row.actions.push({status:'failed',message:error.message});process.exitCode=1;}
    finally{if(staged?.temporary)fs.rmSync(staged.temporary,{recursive:true,force:true});}
  }else if(install&&missing.length&&!dependency.installable){
    row.actions.push({status:projectLocation?'repository-provided':dependency.fallback?'embedded-fallback':'manual-action-required',message:dependency.release_action||null});
  }
  report.push(row);
}

const unresolved=report.filter(item=>item.requirement==='required'&&!item.project_location&&!item.targets.some(target=>target.status==='already-installed')&&!item.fallback);
const output={ok:unresolved.length===0,mode:install?'install':'check',targets,policy:manifest.policy,dependencies:report,unresolved_required:unresolved.map(item=>item.id),note:'既存スキルは上書きしません。外部インストールは--install指定時だけ実行します。'};
if(asJson)console.log(JSON.stringify(output,null,2));
else{
  console.log(`AI Opportunity Monitor skill bootstrap (${output.mode})`);
  for(const item of report){
    const locations=[item.project_location,...item.targets.map(target=>target.location)].filter(Boolean);
    const state=locations.length?'available':item.fallback?'fallback-ready':'missing';
    console.log(`${state.padEnd(14)} ${item.id.padEnd(31)} ${locations[0]||item.source_status}`);
    if(!locations.length&&item.source_url)console.log(`  source: ${item.source_url}`);
    if(!locations.length&&item.install_command)console.log(`  install: ${item.install_command}`);
    for(const action of item.actions)console.log(`  -> ${action.target||''} ${action.status} ${action.destination||action.message||''}`.trimEnd());
  }
  console.log(output.note);
}
if(!output.ok)process.exitCode=1;
