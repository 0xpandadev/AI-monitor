const crypto=require('node:crypto');

function idPart(value){
  const text=String(value||'').normalize('NFKC').toLowerCase();
  const ascii=text.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,52);
  return ascii||crypto.createHash('sha256').update(text).digest('hex').slice(0,12);
}

function featureRecord(value,profileEvidence=[]){
  if(value&&typeof value==='object')return {name:String(value.name||value.label||'').trim(),evidence_ids:Array.isArray(value.evidence_signal_ids)?value.evidence_signal_ids:profileEvidence,evidence_scope:Array.isArray(value.evidence_signal_ids)?'item':'profile'};
  return {name:String(value||'').trim(),evidence_ids:profileEvidence,evidence_scope:'profile'};
}

function unique(values){return [...new Set(values.filter(Boolean))];}

function buildKnowledgeGraph({entities,signals,ontology}){
  const nodes=new Map();const edges=new Map();const signalMap=new Map(signals.map(signal=>[signal.id,signal]));
  const addNode=node=>{if(!nodes.has(node.id))nodes.set(node.id,node);};
  const addEdge=edge=>{
    const existing=edges.get(edge.id);
    if(existing){existing.evidence_ids=unique([...existing.evidence_ids,...edge.evidence_ids]);existing.evidence_count=existing.evidence_ids.length;return;}
    edges.set(edge.id,{...edge,evidence_ids:unique(edge.evidence_ids),evidence_count:unique(edge.evidence_ids).length});
  };
  const activeEntities=entities.filter(entity=>entity.profile||entity.signal_count);
  for(const entity of activeEntities){
    const relatedSignals=signals.filter(signal=>signal.entity_id===entity.id);
    addNode({id:`company:${entity.id}`,object_type:'company',entity_id:entity.id,label:entity.name,group_id:entity.group_id,group_label:entity.group_label,segment:entity.segment||'未分類',evidence_count:relatedSignals.length,latest_at:relatedSignals[0]?.published_at||entity.profile?.last_reviewed||null});
    for(const signal of relatedSignals){
      const topicId=`topic:${idPart(signal.category)}`;
      addNode({id:topicId,object_type:'topic',label:signal.category,evidence_count:0});
      addEdge({id:`changed-in:${entity.id}:${topicId}`,from:`company:${entity.id}`,to:topicId,relation_type:'changed-in',label:'変化を確認',evidence_ids:[signal.id],evidence_scope:'item'});
    }
    const profileEvidence=unique([
      ...(entity.profile?.activity_signal_ids||[]).filter(id=>signalMap.has(id)),
      ...(entity.profile?.history||[]).map(item=>`profile:${entity.id}:${idPart(`${item.date}-${item.title}-${item.source?.url||''}`)}`)
    ]);
    for(const raw of entity.profile?.offerings||[]){
      const item=featureRecord(raw,profileEvidence);if(!item.name)continue;
      const offeringId=`offering:${entity.id}:${idPart(item.name)}`;
      addNode({id:offeringId,object_type:'offering',label:item.name,owner_entity_id:entity.id,evidence_count:item.evidence_ids.length});
      addEdge({id:`offers:${entity.id}:${offeringId}`,from:`company:${entity.id}`,to:offeringId,relation_type:'offers',label:'提供',evidence_ids:item.evidence_ids,evidence_scope:item.evidence_scope});
    }
    for(const raw of entity.profile?.partnerships||[]){
      const item=featureRecord(raw,profileEvidence);if(!item.name)continue;
      const partnerId=`partner:${idPart(item.name)}`;
      addNode({id:partnerId,object_type:'partner',label:item.name,evidence_count:item.evidence_ids.length});
      addEdge({id:`partners-with:${entity.id}:${partnerId}`,from:`company:${entity.id}`,to:partnerId,relation_type:'partners-with',label:'提携',evidence_ids:item.evidence_ids,evidence_scope:item.evidence_scope});
    }
  }
  for(const edge of edges.values()){
    const target=nodes.get(edge.to);if(target)target.evidence_count=Math.max(target.evidence_count||0,edge.evidence_count);
  }
  const relationCounts=[...edges.values()].reduce((result,edge)=>{result[edge.relation_type]=(result[edge.relation_type]||0)+1;return result;},{});
  return {
    schema_version:ontology.schema_version,
    generated_from:'entity-profiles-and-weekly-signals',
    nodes:[...nodes.values()],
    edges:[...edges.values()],
    summary:{nodes:nodes.size,edges:edges.size,companies:activeEntities.length,watched_companies:entities.length,relation_counts:relationCounts},
    caveat:'未確認は関係が存在しないことを意味しません。プロフィール単位の根拠は、個別関係との紐付けを次回レビューで精密化します。'
  };
}

const implicationByCategory={
  'AIエージェント':'機能比較だけでなく、実行範囲、権限、承認、監査まで比較対象にする。',
  'ガバナンス':'AI導入支援に統制、障害対応、監査証跡を含める必要性を検討する。',
  '基盤モデル':'モデル単体ではなく、提供経路、計算基盤、パートナー依存を併せて追う。',
  'AIオファリング':'競合の提案が構想支援から実装資産・運用へ移っているか確認する。',
  'SaaS再定義':'既存機能へのAI追加から、業務実行と新しい価格体系への移行を追う。',
  '内製開発':'外部導入だけでなく、独自基盤を競争力として持つ企業を比較する。'
};

function buildInsights({entities,signals,ontology,profileCoverage}){
  const policy=ontology.insight_policy;const entityMap=new Map(entities.map(entity=>[entity.id,entity]));
  const eligible=signals.filter(signal=>signal.verification==='confirmed'&&(!policy.require_primary_source||signal.source?.tier==='primary'));
  const categoryGroups=new Map();
  for(const signal of eligible){const list=categoryGroups.get(signal.category)||[];list.push(signal);categoryGroups.set(signal.category,list);}
  const insights=[];
  for(const [category,items] of categoryGroups){
    const entityIds=unique(items.map(item=>item.entity_id));
    if(items.length<policy.minimum_confirmed_signals||entityIds.length<policy.minimum_entities)continue;
    const confidence=items.length>=policy.high_confidence_signals?'high':'medium';
    insights.push({
      id:`category-cluster:${idPart(category)}`,
      type:'observed-cluster',
      status:'evidence-backed',
      title:`${category}で複数社の変化を確認`,
      conclusion:`${entityIds.length}社から${items.length}件の公式更新が同じ分類に集中しています。`,
      rationale:`${entityIds.map(id=>entityMap.get(id)?.name||id).join('、')}の一次情報を同一期間で確認しました。`,
      implication:implicationByCategory[category]||'同じ動きが他社・他業界へ広がるか、次回更新で継続確認する。',
      counterevidence:`3〜5年ベースライン完了は${profileCoverage.profiles_complete||0} / ${profileCoverage.total_entities||entities.length}社のため、長期トレンドとはまだ断定しません。`,
      next_watch:`次週も「${category}」の新規発表、導入事例、価格・提供範囲の変更を確認する。`,
      confidence,
      entity_ids:entityIds,
      evidence_signal_ids:items.map(item=>item.id),
      evidence_count:items.length,
      source_count:unique(items.map(item=>item.source?.url)).length
    });
  }
  return insights.sort((a,b)=>b.evidence_count-a.evidence_count||a.title.localeCompare(b.title,'ja')).slice(0,6);
}

function buildTrends({signals}){
  const confirmed=signals.filter(signal=>signal.verification==='confirmed');
  const monthGroups=new Map();const categoryGroups=new Map();
  for(const signal of confirmed){
    const month=String(signal.published_at||'').slice(0,7);if(month.length===7){const list=monthGroups.get(month)||[];list.push(signal);monthGroups.set(month,list);}
    const list=categoryGroups.get(signal.category)||[];list.push(signal);categoryGroups.set(signal.category,list);
  }
  const monthly=[...monthGroups].sort(([a],[b])=>a.localeCompare(b)).map(([month,items])=>({month,confirmed_changes:items.length,companies:unique(items.map(item=>item.entity_id)).length,sources:unique(items.map(item=>item.source?.url)).length}));
  const categories=[...categoryGroups].map(([category,items])=>({category,confirmed_changes:items.length,companies:unique(items.map(item=>item.entity_id)).length,sources:unique(items.map(item=>item.source?.url)).length})).sort((a,b)=>b.confirmed_changes-a.confirmed_changes||a.category.localeCompare(b.category,'ja'));
  return {monthly,categories,temporal_points:monthly.length,sufficient_for_line:monthly.length>=8,minimum_temporal_points:8,note:monthly.length>=8?'確認済み月のみを線で接続しています。':'時系列の形を判断するには最低8か月の確認済みデータが必要です。現在は分類別の件数と更新一覧を表示します。'};
}

function buildIntelligenceSurface(input){
  return {ontology:input.ontology,knowledge_graph:buildKnowledgeGraph(input),insights:buildInsights(input),trends:buildTrends(input)};
}

module.exports={buildInsights,buildIntelligenceSurface,buildKnowledgeGraph,buildTrends};
