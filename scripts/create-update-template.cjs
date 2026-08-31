const path=require('node:path');
const {PATHS,writeJson}=require('../lib/data.cjs');

const now=new Date();
const offset=9*60*60*1000;
const jst=new Date(now.getTime()+offset);
const day=jst.getUTCDay();
const diff=day===0?-6:1-day;
jst.setUTCDate(jst.getUTCDate()+diff);jst.setUTCHours(0,0,0,0);
const start=new Date(jst.getTime()-offset);
const date=value=>value.toISOString().slice(0,10);
const file=path.join(path.dirname(PATHS.signals),'drafts','weekly-update.json');
writeJson(file,{
  schema_version:'1.0',updated_at:now.toISOString(),period:{start:date(start),end:date(now),label:`${date(start)}〜${date(now)}`},
  brief:{headline:'',summary:'',discussion_points:[],category_outlook:[]},signals:[],source_health:[],limitations:[]
});
console.log(JSON.stringify({ok:true,file,next:`一次情報を確認して ${file} を完成させ、npm run update:import -- ${file} を実行してください。`},null,2));
