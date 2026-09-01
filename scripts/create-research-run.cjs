const fs=require('node:fs');
const path=require('node:path');
const {writeJson}=require('../lib/data.cjs');

const root=path.join(__dirname,'..');
const now=new Date();
const requested=process.argv[2];
const date=requested||now.toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Usage: npm run research:run -- YYYY-MM-DD');
const runId=`weekly-${date}`;
const dir=path.join(root,'data','runs',runId);
if(fs.existsSync(dir))throw new Error(`${runId} は既にあります。既存ランを継続するか、別の日付を指定してください。`);
fs.mkdirSync(dir,{recursive:true});
const weekly=require('../config/weekly-research.json');
const capabilities=require('../config/research-capabilities.json');
const periodStart=new Date(`${date}T00:00:00.000Z`);periodStart.setUTCDate(periodStart.getUTCDate()-6);
const stamp=now.toISOString();
const manifest={
  schema_version:'1.0',run_id:runId,created_at:stamp,status:'draft',
  period:{start:periodStart.toISOString().slice(0,10),end:date,label:`${periodStart.toISOString().slice(0,10)}〜${date}`},
  purpose:'AI市場と固定ウォッチリストの週次定点観測',
  required_stages:['discovery','verification','ontology'],
  optional_stages:['scenario'],
  capabilities:capabilities.capabilities.map(item=>({id:item.id,required:item.required,preferred_skills:item.preferred_skills||[],status:'pending'})),
  publication:{status:'not_ready',confirmed_signals:0,candidate_signals:0,coverage_note:''},
  files:{discovery:'discovery.json',verification:'verification.json',ontology:'ontology-analysis.json',scenario:'scenario-analysis.json',weekly_update:'weekly-update.json',report:'run-report.md'}
};
const discovery={schema_version:'1.0',run_id:runId,generated_at:stamp,period:manifest.period,lanes:weekly.lanes,candidates:[],coverage:{checked_watchlist_groups:[],checked_sources:[],gaps:[]}};
const verification={schema_version:'1.0',run_id:runId,generated_at:stamp,items:[],source_health:[],limitations:[]};
const ontology={schema_version:'1.0',run_id:runId,generated_at:stamp,decision:'今週の確認済み変化のうち、会議で追加調査または検討すべき論点は何か',objects:{companies:[],activities:[],sources:[]},relations:[],patterns:[],review:{status:'pending',reason:'確認済みの複数企業シグナルを投入後に分析する'}};
const scenario={schema_version:'1.0',run_id:runId,status:'not_requested',question:'',seed_material:[],assumptions:[],scenarios:[],limitations:['MiroFishを実行していない限り、ここに予測や擬似的な結果を書かない。']};
const weeklyUpdate={schema_version:'1.0',updated_at:stamp,period:manifest.period,brief:{headline:'',summary:'',discussion_points:[],category_outlook:[]},signals:[],source_health:[],limitations:[]};
writeJson(path.join(dir,'manifest.json'),manifest);writeJson(path.join(dir,'discovery.json'),discovery);writeJson(path.join(dir,'verification.json'),verification);writeJson(path.join(dir,'ontology-analysis.json'),ontology);writeJson(path.join(dir,'scenario-analysis.json'),scenario);writeJson(path.join(dir,'weekly-update.json'),weeklyUpdate);
fs.writeFileSync(path.join(dir,'run-report.md'),`# ${runId} 調査ラン\n\n状態: draft\n\nこのフォルダ内のJSONを、週次オーケストレーション手順に従って埋めてください。\n`, 'utf8');
console.log(JSON.stringify({ok:true,run_id:runId,directory:dir,next:['discovery.json に発見候補と調査カバレッジを記録','verification.json に一次情報で確認した事実・反証・未確認を記録','ontology-analysis.json に根拠付きの関係・パターンを記録','必要時だけ scenario-analysis.json をMiroFishの入力・結果の索引として記録','npm run research:validate -- '+runId+' で検証','npm run research:publish -- '+runId+' で確認済み更新のみ公開データへ取込']},null,2));
