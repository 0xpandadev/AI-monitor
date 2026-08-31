const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const root=path.join(__dirname,'..');
const config=require('../config/research-capabilities.json');
const home=os.homedir();

function candidates(name){
  return [
    path.join(root,'.agents','skills',name,'SKILL.md'),
    path.join(root,'.claude','skills',name,'SKILL.md'),
    path.join(home,'.codex','skills',name,'SKILL.md'),
    path.join(home,'.agents','skills',name,'SKILL.md'),
    path.join(home,'.claude','skills',name,'SKILL.md')
  ];
}

const capabilities=config.capabilities.map(capability=>{
  const skills=(capability.preferred_skills||[]).map(name=>{
    const found=candidates(name).find(file=>fs.existsSync(file));
    return {name,available:Boolean(found),location:found||null};
  });
  return {
    id:capability.id,
    required:capability.required,
    preferred_skills:skills,
    connector:capability.connector?{...capability.connector,probe:'not-run'}:null,
    runnable:skills.some(skill=>skill.available)||Boolean(capability.fallback),
    selected:skills.find(skill=>skill.available)?.name||'embedded-fallback'
  };
});

const ok=capabilities.every(capability=>capability.runnable);
console.log(JSON.stringify({ok,runtime:config.runtime,capabilities,note:'available=falseでもembedded-fallbackで同じデータ契約を生成できます。外部APIの疎通は週次実行時に確認します。'},null,2));
if(!ok)process.exitCode=1;
