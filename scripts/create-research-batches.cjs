const {registry}=require('../lib/data.cjs');

const requested=process.argv[2]||'all';
const size=Math.max(1,Math.min(40,Number(process.argv[3]||15)));
const {groups}=registry();
const selected=requested==='all'?groups:groups.filter(group=>group.id===requested);
if(!selected.length)throw new Error(`Unknown group: ${requested}`);

const batches=[];
for(const group of selected){
  for(let index=0;index<group.members.length;index+=size){
    batches.push({
      batch_id:`${group.id}-${String(index/size+1).padStart(2,'0')}`,
      group_id:group.id,
      group_label:group.label,
      entity_ids:group.members.slice(index,index+size).map(entity=>entity.id),
      output:`data/drafts/profiles-${group.id}-${String(index/size+1).padStart(2,'0')}.json`
    });
  }
}
console.log(JSON.stringify({group:requested,batch_size:size,batch_count:batches.length,batches},null,2));
