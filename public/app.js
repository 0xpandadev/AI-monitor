const state={data:null,view:'digest',query:'',meetingSlide:0,graphFilter:'changed-in'};
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const viewMeta={
  digest:['WEEKLY AI LANDSCAPE','今週のダイジェスト'],
  ledger:['CHANGE LEDGER','変更台帳'],
  relationships:['ONTOLOGY / TREND','関係・トレンド'],
  insights:['EVIDENCE TO DECISION','示唆ボード'],
  'ai-companies':['MODEL / PLATFORM WATCH','主要AI企業'],
  consulting:['CONSULTING AI MAP','コンサルマップ'],
  enterprises:['JAPAN ENTERPRISE ADOPTION','日本企業AI利活用'],
  startups:['JAPAN AI CHALLENGERS','スタートアップ・新興企業'],
  saas:['SAAS REPOSITIONING','SaaSのAI戦略'],
  archive:['MONTHLY MEMORY','月次アーカイブ'],
  settings:['COVERAGE / SOURCES','監視設定・情報源']
};
const stateGlyph={unknown:'—',observed:'●',active:'▲',scaled:'■'};

function esc(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function safeUrl(value=''){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:'#';}catch{return '#';}}
function formatDate(value){if(!value)return '未更新';try{return new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return value;}}
function toast(message){const element=$('#toast');element.textContent=message;element.classList.add('show');setTimeout(()=>element.classList.remove('show'),2600);}
function group(id){return state.data.groups.find(item=>item.id===id);}
function entities(ids){const allowed=new Set(Array.isArray(ids)?ids:[ids]);return state.data.entities.filter(entity=>allowed.has(entity.group_id));}
function signalsFor(ids){const allowed=new Set(entities(ids).map(entity=>entity.id));return state.data.signals.filter(signal=>allowed.has(signal.entity_id));}
function stateDefinition(id){return state.data.intelligence.evidence_states.find(item=>item.id===id)||{id:'unknown',label:'未確認',definition:'一次情報による確認がまだない'};}
function maturityLabel(id){return state.data.intelligence.maturity_stages.find(item=>item.id===id)?.label||'未確認';}
function methodLabel(id){return state.data.intelligence.development_methods.find(item=>item.id===id)?.label||id;}
function profileState(entity,dimension){return entity.profile?.dimensions?.[dimension]||'unknown';}
function matrixFor(id){return state.data.intelligence.matrices[id]||{label:'企業AI現在地',dimensions:[]};}
function watchLabel(entity){if(entity.profile?.status==='complete')return '3年基準完了';if(entity.profile)return '基礎情報は部分確認';return '3年基準を調査待ち';}
function shortLabel(value,max=28){const text=String(value||'');return text.length>max?`${text.slice(0,max-1)}…`:text;}

async function api(path,options={}){
  const response=await fetch(path,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.details?.join(' / ')||data.message||data.error||`HTTP ${response.status}`);
  return data;
}

async function init(){
  try{
    const [health,data]=await Promise.all([api('/api/health'),api('/api/dashboard')]);state.data=data;
    $('#health-dot').classList.add('online');$('#health-label').textContent=`稼働中 · ${health.version}`;
    $('#updated-at').textContent=formatDate(data.updated_at);$('#nav-important').textContent=data.metrics.important;$('#nav-ledger').textContent=data.signals.length;$('#nav-graph').textContent=data.knowledge_graph?.summary?.edges||0;$('#nav-insights').textContent=data.insights?.length||0;
    $$('[data-count-group]').forEach(element=>{const id=element.dataset.countGroup;element.textContent=id==='saas'?(group('global-saas')?.count||0)+(group('japan-saas')?.count||0):group(id)?.count||0;});
    bind();render();
  }catch(error){$('#health-label').textContent='サーバー未接続';$('#content').innerHTML=`<section class="empty-panel"><h2>画面を読み込めません</h2><p>${esc(error.message)}</p><p><code>npm start</code>を実行して再読み込みしてください。</p></section>`;}
}

function bind(){
  $('#primary-nav').addEventListener('click',navigate);$('.sidebar-secondary').addEventListener('click',navigate);
  $('#global-search').addEventListener('input',event=>{state.query=event.target.value.trim().toLowerCase();render();});
  $('#meeting-mode-button').addEventListener('click',openMeetingMode);
  $('#content').addEventListener('click',event=>{
    const entity=event.target.closest('[data-entity]');if(entity){openEntity(entity.dataset.entity);return;}
    const signal=event.target.closest('[data-signal]');if(signal){openSignal(signal.dataset.signal);return;}
    const insight=event.target.closest('[data-insight]');if(insight){openInsight(insight.dataset.insight);return;}
    const graphFilter=event.target.closest('[data-graph-filter]');if(graphFilter){state.graphFilter=graphFilter.dataset.graphFilter;render();return;}
    const jump=event.target.closest('[data-jump]');if(jump)setView(jump.dataset.jump);
    const method=event.target.closest('[data-method]');if(method)openMethod();
  });
  $('#content').addEventListener('submit',submitEntity);
  $('#drawer-content').addEventListener('click',event=>{
    const signal=event.target.closest('[data-signal]');if(signal)openSignal(signal.dataset.signal);
  });
  $('#drawer-close').addEventListener('click',closeDrawer);$('#drawer-backdrop').addEventListener('click',closeDrawer);
  $('#meeting-close').addEventListener('click',closeMeetingMode);$('#meeting-prev').addEventListener('click',()=>moveMeeting(-1));$('#meeting-next').addEventListener('click',()=>moveMeeting(1));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeDrawer();closeMeetingMode();}if(!$('#meeting-mode').hidden&&event.key==='ArrowRight')moveMeeting(1);if(!$('#meeting-mode').hidden&&event.key==='ArrowLeft')moveMeeting(-1);});
}
function navigate(event){const button=event.target.closest('[data-view]');if(button)setView(button.dataset.view);}
function setView(view){state.view=view;state.query='';$('#global-search').value='';$$('[data-view]').forEach(item=>item.classList.toggle('active',item.dataset.view===view));render();window.scrollTo({top:0,behavior:'smooth'});}

function render(){
  const [kicker,title]=viewMeta[state.view];$('#view-kicker').textContent=kicker;$('#view-title').textContent=title;
  const views={digest:renderDigest,ledger:()=>renderLedgerPage(state.data.signals),relationships:renderRelationships,insights:renderInsights,'ai-companies':()=>renderCategory(['ai-companies'],'世界のモデル・プラットフォーム企業を、モデル、製品、エージェント、基盤、提携、安全性、研究で比較します。'),consulting:()=>renderCategory(['consulting'],'各社の社内AI活用、外部オファリング、開発・導入・運用、製品資産、提携を3年の基準情報として比較します。'),enterprises:()=>renderCategory(['enterprises'],'日本企業の全社AI、独自開発、製造・R&D、顧客向けAI、SCM、統制、組織を業界別・企業別に確認します。'),startups:()=>renderCategory(['startups'],'日本発のAIスタートアップ・新興企業を、独自技術、製品、顧客、提携、資金調達、研究で比較します。'),saas:()=>renderCategory(['global-saas','japan-saas'],'国内外SaaSが、支援AIから業務エージェント、開発基盤、統制、価格、連携網へどう移っているかを比較します。'),archive:renderArchive,settings:renderSettings};
  $('#content').innerHTML=(views[state.view]||renderDigest)();
}

function renderDigest(){
  const d=state.data,b=d.brief,period=b.period?.label||'初回更新前';
  const outlook=new Map((b.category_outlook||[]).map(item=>[item.group_id,item]));
  return `<section class="brief-stage"><div class="brief-copy"><span>${esc(period)}</span><h2>${esc(b.headline)}</h2><p>${esc(b.summary)}</p></div><aside class="partner-agenda"><span>会議で見る論点</span>${b.discussion_points?.length?`<ol>${b.discussion_points.map(item=>`<li>${esc(item)}</li>`).join('')}</ol>`:'<p>重要な示唆を3〜5点に絞って表示します。</p>'}</aside></section>
  <section class="metric-line five"><div><span>監視企業</span><b>${d.metrics.watched}</b></div><div><span>今週の変更</span><b>${d.metrics.this_period}</b></div><div><span>重要変更</span><b>${d.metrics.important}</b></div><div><span>基礎情報あり</span><b>${d.metrics.profiles_started}</b><small>/ ${d.metrics.watched}社</small></div><div><span>3年基準完了</span><b>${d.metrics.profiles_complete}</b></div></section>
  <section class="coverage-warning"><b>3年ベースラインは作成中</b><p>${esc(d.profile_coverage.note||'基礎情報の確認を進めています。')}</p><button data-jump="settings">調査範囲と方法を見る</button></section>
  <section class="landscape-strip"><header><div><span>企業インテリジェンス</span><h2>名前ではなく、各社のAI現在地を見る</h2></div><p>件数は監視・調査カバレッジです。市場の強さや優劣を示すスコアではありません。</p></header><div class="landscape-track">${d.groups.filter(item=>item.id!=='additional').map(item=>{const target=item.id==='global-saas'||item.id==='japan-saas'?'saas':item.id;const note=outlook.get(item.id);const profiled=entities(item.id).filter(entity=>entity.profile).length;return `<button data-jump="${target}" class="landscape-cell ${item.signal_count?'changed':''}"><span>${esc(item.label)}</span><b>${profiled}<small> / ${item.count}社</small></b><small>${note?esc(note.summary):'基礎情報を調査中'}</small></button>`;}).join('')}</div></section>
  <section class="intelligence-shortcuts"><button data-jump="relationships"><span>RELATIONSHIP MAP</span><b>${d.knowledge_graph.summary.companies}社 · ${d.knowledge_graph.summary.edges}関係</b><small>企業、変化テーマ、オファリング、提携を接続</small></button><button data-jump="insights"><span>INSIGHT BOARD</span><b>${d.insights.length}件の観測パターン</b><small>結論、根拠、反証、次回観測を一体表示</small></button></section>
  <section class="ledger-board"><header><div><span>変更台帳</span><h2>今週、何が変わったか</h2></div><button data-jump="ledger">${d.signals.length}件をすべて見る →</button></header>${renderLedgerTable(d.signals.slice(0,8))}</section>`;
}

function renderRelationships(){
  const graph=state.data.knowledge_graph,trends=state.data.trends,relationMeta={
    'changed-in':{label:'変化テーマ',note:'週次の公式更新を分類別に接続'},
    offers:{label:'AIオファリング',note:'企業プロフィールの外部提供サービスを接続'},
    'partners-with':{label:'提携',note:'プロフィールで確認した提携先を接続'}
  };
  const meta=relationMeta[state.graphFilter]||relationMeta['changed-in'];
  return `<section class="category-intro ontology-intro"><div><span>LOCAL ONTOLOGY</span><h2>企業名を、活動と関係へ接続する</h2><p>${esc(state.data.ontology.principle)}</p></div><dl><div><dt>接続企業</dt><dd>${graph.summary.companies}</dd></div><div><dt>関係</dt><dd>${graph.summary.edges}</dd></div><div><dt>全監視</dt><dd>${graph.summary.watched_companies}</dd></div></dl></section>
  <section class="graph-panel"><header><div><span>関係マップ</span><h2>${esc(meta.label)}</h2><p>${esc(meta.note)}。企業ノードをクリックすると公式根拠を含む詳細を開きます。</p></div><div class="graph-filters">${Object.entries(relationMeta).map(([id,item])=>`<button class="${state.graphFilter===id?'active':''}" data-graph-filter="${id}">${esc(item.label)} <b>${graph.summary.relation_counts[id]||0}</b></button>`).join('')}</div></header>${renderNetworkGraph(graph,state.graphFilter)}<footer>${esc(graph.caveat)}</footer></section>
  ${renderTrendPanel(trends)}`;
}

function renderNetworkGraph(graph,relationType){
  const nodeMap=new Map(graph.nodes.map(node=>[node.id,node]));const edges=graph.edges.filter(edge=>edge.relation_type===relationType);
  if(!edges.length)return '<div class="empty-inline"><b>確認済みの関係はまだありません</b><p>3年ベースラインの取込後に自動表示されます。</p></div>';
  const companies=[...new Map(edges.map(edge=>{const node=nodeMap.get(edge.from);return [node.id,node];})).values()].sort((a,b)=>a.label.localeCompare(b.label,'ja'));
  const targets=[...new Map(edges.map(edge=>{const node=nodeMap.get(edge.to);return [node.id,node];})).values()].sort((a,b)=>(b.evidence_count||0)-(a.evidence_count||0)||a.label.localeCompare(b.label,'ja'));
  const width=1120,row=62,pad=46,height=Math.max(520,Math.max(companies.length,targets.length)*row+pad*2);const leftX=55,rightX=720,nodeWidth=330;
  const position=(items,index)=>pad+(height-pad*2)*(items.length===1?.5:index/(items.length-1));
  const companyY=new Map(companies.map((node,index)=>[node.id,position(companies,index)]));const targetY=new Map(targets.map((node,index)=>[node.id,position(targets,index)]));
  const edgeSvg=edges.map(edge=>{const y1=companyY.get(edge.from),y2=targetY.get(edge.to);const weight=Math.min(4,1+edge.evidence_count*.55);return `<path class="graph-edge ${esc(edge.relation_type)}" d="M ${leftX+nodeWidth} ${y1} C 555 ${y1}, 565 ${y2}, ${rightX} ${y2}" style="stroke-width:${weight}" aria-label="${esc(edge.label)}・根拠${edge.evidence_count}件"><title>${esc(`${edge.label} / 根拠${edge.evidence_count}件 / ${edge.evidence_scope==='item'?'個別紐付け':'プロフィール単位'}`)}</title></path>`;}).join('');
  const companySvg=companies.map(node=>{const y=companyY.get(node.id);return `<g class="graph-node company" data-entity="${esc(node.entity_id)}" transform="translate(${leftX} ${y-22})" tabindex="0" role="button"><rect width="${nodeWidth}" height="44"></rect><text x="13" y="18">${esc(shortLabel(node.label,34))}</text><text class="sub" x="13" y="34">${esc(shortLabel(node.group_label,35))} · 根拠 ${node.evidence_count}</text></g>`;}).join('');
  const targetSvg=targets.map(node=>{const y=targetY.get(node.id);return `<g class="graph-node target ${esc(node.object_type)}" transform="translate(${rightX} ${y-22})"><rect width="${nodeWidth}" height="44"></rect><text x="13" y="18">${esc(shortLabel(node.label,36))}</text><text class="sub" x="13" y="34">${esc(node.object_type)} · 根拠 ${node.evidence_count||0}</text><title>${esc(node.label)}</title></g>`;}).join('');
  return `<div class="graph-canvas"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="企業と${esc(relationType)}の関係マップ">${edgeSvg}${companySvg}${targetSvg}</svg></div>`;
}

function renderTrendPanel(trends){
  const max=Math.max(1,...trends.categories.map(item=>item.confirmed_changes));
  return `<section class="trend-panel"><header><div><span>確認済み変更の分布</span><h2>${trends.sufficient_for_line?'月次トレンド':'時系列は蓄積中'}</h2><p>${esc(trends.note)}</p></div><div class="trend-readiness"><b>${trends.temporal_points} / ${trends.minimum_temporal_points}</b><span>確認済み月</span></div></header>${trends.sufficient_for_line?renderMonthlyLine(trends.monthly):`<div class="category-bars">${trends.categories.map(item=>`<div><span>${esc(item.category)}</span><i><b style="width:${Math.max(6,item.confirmed_changes/max*100)}%"></b></i><strong>${item.confirmed_changes}件</strong><small>${item.companies}社 · ${item.sources}情報源</small></div>`).join('')}</div>`}<footer>件数は登録済み一次情報のカバレッジであり、市場規模や企業評価ではありません。</footer></section>`;
}

function renderMonthlyLine(points){
  const width=1040,height=270,padX=52,padY=34,max=Math.max(1,...points.map(item=>item.confirmed_changes));
  const coords=points.map((item,index)=>({item,x:padX+(width-padX*2)*(points.length===1?.5:index/(points.length-1)),y:height-padY-(height-padY*2)*(item.confirmed_changes/max)}));
  return `<div class="monthly-line"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="月次の確認済み変更件数"><line x1="${padX}" y1="${height-padY}" x2="${width-padX}" y2="${height-padY}"></line><polyline points="${coords.map(point=>`${point.x},${point.y}`).join(' ')}"></polyline>${coords.map(point=>`<g><circle cx="${point.x}" cy="${point.y}" r="5"></circle><text x="${point.x}" y="${point.y-12}">${point.item.confirmed_changes}</text><text class="axis" x="${point.x}" y="${height-10}">${esc(point.item.month)}</text></g>`).join('')}</svg></div>`;
}

function renderInsights(){
  const insights=state.data.insights||[];
  return `<section class="category-intro insight-intro"><div><span>DETERMINISTIC INSIGHT ENGINE</span><h2>変化を、会議で使える問いに変える</h2><p>同一期間に複数社・複数の一次情報が集まったパターンだけを抽出します。自由生成による予測ではありません。</p></div><dl><div><dt>観測パターン</dt><dd>${insights.length}</dd></div><div><dt>高確度</dt><dd>${insights.filter(item=>item.confidence==='high').length}</dd></div></dl></section>
  <section class="insight-method"><b>出力契約</b><span>結論</span><span>公式根拠</span><span>反証・制約</span><span>自社への示唆</span><span>次回観測</span></section>
  ${insights.length?`<div class="insight-grid">${insights.map((item,index)=>`<article><header><span>${String(index+1).padStart(2,'0')} · ${esc(item.type)}</span><b class="confidence ${esc(item.confidence)}">${item.confidence==='high'?'高確度':'中確度'}</b></header><h2>${esc(item.title)}</h2><p class="insight-conclusion">${esc(item.conclusion)}</p><dl><div><dt>根拠</dt><dd>${item.evidence_count}件 / ${item.source_count}情報源 / ${item.entity_ids.length}社</dd></div><div><dt>制約</dt><dd>${esc(item.counterevidence)}</dd></div><div><dt>示唆</dt><dd>${esc(item.implication)}</dd></div></dl><button data-insight="${esc(item.id)}">根拠と次回観測を見る →</button></article>`).join('')}</div>`:'<section class="empty-panel"><h2>複数社で確認できたパターンはまだありません</h2><p>週次更新が蓄積されると自動生成されます。</p></section>'}`;
}

function renderLedgerPage(signals){
  let filtered=signals;
  if(state.query)filtered=signals.filter(signal=>`${signal.title} ${signal.summary} ${signal.entity?.name||''} ${signal.category}`.toLowerCase().includes(state.query));
  return `<section class="category-intro"><div><span>Evidence-backed changes</span><h2>ニュースではなく、変更履歴として残す</h2><p>変更内容、前回との差分、公式根拠を1行で追える台帳です。初回基準のため、現在はすべて「基準へ追加」と表示します。</p></div><dl><div><dt>確認済み変更</dt><dd>${filtered.length}</dd></div><div><dt>一次情報</dt><dd>${filtered.filter(item=>item.source?.tier==='primary').length}</dd></div></dl></section><section class="ledger-board standalone"><header><div><span>変更台帳</span><h2>${esc(state.data.brief.period?.label||'全期間')}</h2></div><button data-method>定義を見る</button></header>${renderLedgerTable(filtered)}</section>`;
}

function renderLedgerTable(signals){
  if(!signals.length)return '<div class="empty-inline"><b>該当する変更はありません</b><p>検索条件を変更してください。</p></div>';
  return `<div class="table-scroll"><table class="change-ledger"><thead><tr><th>番号</th><th>重要度</th><th>企業</th><th>変更内容</th><th>分類</th><th>前回との差分</th><th>根拠</th></tr></thead><tbody>${signals.map((signal,index)=>`<tr><td>${String(index+1).padStart(2,'0')}</td><td><span class="importance ${esc(signal.importance)}">${esc(signal.importance)}</span></td><td><button data-entity="${esc(signal.entity_id)}">${esc(signal.entity?.name||signal.entity_id)}</button></td><td><button class="ledger-title" data-signal="${esc(signal.id)}">${esc(signal.title)}</button></td><td>${esc(signal.category)}</td><td>${esc(signal.change?.delta||'初回基準へ追加')}</td><td><a href="${safeUrl(signal.source.url)}" target="_blank" rel="noreferrer">${esc(signal.source.publisher)} ↗</a></td></tr>`).join('')}</tbody></table></div>`;
}

function renderCategory(ids,description){
  let list=entities(ids),signals=signalsFor(ids);
  if(state.query){list=list.filter(entity=>`${entity.name} ${entity.segment||''} ${entity.profile?.current_position||''}`.toLowerCase().includes(state.query));signals=signals.filter(signal=>`${signal.title} ${signal.summary} ${signal.entity?.name||''}`.toLowerCase().includes(state.query));}
  const matrixId=ids.length>1?'global-saas':ids[0];const matrix=matrixFor(matrixId);const started=list.filter(entity=>entity.profile).length;
  const enterpriseIndustry=ids.includes('enterprises')?renderIndustryMatrix(list,matrix):'';
  return `<section class="category-intro"><div><span>3 YEAR COMPANY BASELINE</span><h2>${esc(viewMeta[state.view][1])}</h2><p>${esc(description)}</p></div><dl><div><dt>監視企業</dt><dd>${list.length}</dd></div><div><dt>基礎情報あり</dt><dd>${started}</dd></div><div><dt>変更履歴</dt><dd>${signals.length}</dd></div></dl></section>
  <section class="method-strip"><div><b>セルの意味</b>${state.data.intelligence.evidence_states.map(item=>`<span class="matrix-key ${item.id}">${stateGlyph[item.id]} ${esc(item.label)}</span>`).join('')}</div><button data-method>判定方法・注意点</button></section>
  ${enterpriseIndustry}
  <section class="matrix-panel"><header><div><span>企業比較</span><h2>${esc(matrix.label)}</h2></div><p>企業名をクリックすると、現在位置・3年履歴・公式根拠を表示します。</p></header>${renderEntityMatrix(list,matrix)}</section>
  <section class="ledger-board"><header><div><span>この領域の変更台帳</span><h2>確認済みの更新</h2></div><b>${signals.length}件</b></header>${renderLedgerTable(signals)}</section>`;
}

function renderEntityMatrix(list,matrix){
  if(!list.length)return '<div class="empty-inline"><b>該当する企業がありません</b><p>検索条件を変更してください。</p></div>';
  return `<div class="table-scroll matrix-scroll"><table class="entity-matrix"><thead><tr><th>企業 / 現在地</th>${matrix.dimensions.map(item=>`<th>${esc(item.label)}</th>`).join('')}</tr></thead><tbody>${list.map(entity=>`<tr><th><button data-entity="${esc(entity.id)}"><b>${esc(entity.name)}</b><span>${esc(entity.profile?.current_position||watchLabel(entity))}</span></button></th>${matrix.dimensions.map(dimension=>{const value=profileState(entity,dimension.id),definition=stateDefinition(value);return `<td><button class="matrix-cell ${value}" data-entity="${esc(entity.id)}" title="${esc(`${dimension.label}: ${definition.label}。${definition.definition}`)}"><b>${stateGlyph[value]}</b><span>${esc(definition.label)}</span></button></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderIndustryMatrix(list,matrix){
  const segments=Object.entries(list.reduce((result,entity)=>{const key=entity.segment||'未分類';(result[key]||=[]).push(entity);return result;},{}));
  const dimensions=matrix.dimensions.filter(item=>['enterprise-ai','proprietary-ai','manufacturing-rd','customer-ai','organization'].includes(item.id));
  const order=['unknown','observed','active','scaled'];
  return `<section class="matrix-panel industry"><header><div><span>業界別AI導入状況</span><h2>調査済み企業から見える現在地</h2></div><p>業界全体の導入率ではありません。各業界で基礎情報を確認できた企業の最も進んだ状態です。</p></header><div class="table-scroll"><table class="industry-matrix"><thead><tr><th>業界 / 調査カバレッジ</th>${dimensions.map(item=>`<th>${esc(item.label)}</th>`).join('')}</tr></thead><tbody>${segments.map(([segment,members])=>{const profiled=members.filter(item=>item.profile).length;return `<tr><th>${esc(segment)}<span>${profiled} / ${members.length}社</span></th>${dimensions.map(dimension=>{const values=members.map(entity=>profileState(entity,dimension.id));const value=values.sort((a,b)=>order.indexOf(b)-order.indexOf(a))[0]||'unknown';return `<td><span class="industry-cell ${value}" title="調査済み企業の最上位確認状態">${stateGlyph[value]} ${esc(stateDefinition(value).label)}</span></td>`;}).join('')}</tr>`;}).join('')}</tbody></table></div></section>`;
}

function renderArchive(){
  const months=state.data.archive||[];
  return `<section class="category-intro"><div><span>月次の蓄積</span><h2>変化を時系列で残す</h2><p>毎週の変更を月単位で保存し、企業プロフィールの3年履歴へ接続します。</p></div><dl><div><dt>保存月</dt><dd>${months.length}</dd></div></dl></section>${months.length?`<div class="archive-list">${months.map(month=>`<article><time>${esc(month.month)}</time><div><h3>${esc(month.headline)}</h3><p>${esc(month.label)}</p></div><b>${month.signal_count}件</b></article>`).join('')}</div>`:'<section class="empty-panel"><h2>月次記録はまだありません</h2></section>'}`;
}

function renderSettings(){
  const d=state.data,source=d.sources,coverage=d.profile_coverage,portability=d.capabilities.portability||{};
  return `<section class="baseline-status"><div><span>3年ベースライン</span><h2>${coverage.profiles_started||0} / ${coverage.total_entities||d.metrics.watched}社を着手</h2><p>${esc(coverage.note||'企業プロフィールを調査中です。')}</p></div><dl><div><dt>完了</dt><dd>${coverage.profiles_complete||0}</dd></div><div><dt>期間</dt><dd>${esc(d.intelligence.baseline_window.start)}<br>${esc(d.intelligence.baseline_window.end)}</dd></div></dl></section>
  <section class="capability-panel"><header><span>横展開</span><h2>スキル名ではなく、調査能力で接続する</h2><p>${esc(d.capabilities.principle)}</p></header><div class="capability-grid">${d.capabilities.capabilities.map(item=>`<article><span>${esc(item.id)}</span><h3>${esc(item.purpose)}</h3><p><b>優先:</b> ${esc(item.preferred_skills.join(' / '))}</p><p><b>代替:</b> ${esc(item.fallback)}</p></article>`).join('')}</div><footer><b>Codex</b> ${esc(portability.codex_entry||'')}<br><b>Claude Code</b> ${esc(portability.claude_entry||'')}</footer></section>
  <section class="settings-grid"><div class="source-governance"><header><span>情報源のルール</span><h2>発見と確認を分ける</h2></header><div class="policy-row"><b>確認済み</b><p>${esc(source.policy.confirmed)}</p></div><div class="policy-row"><b>発見用</b><p>${esc(source.policy.discovery)}</p></div><div class="source-list">${source.sources.map(item=>`<article><div><b>${esc(item.name)}</b><span>${esc(item.role)}</span></div><p>${esc(item.note)}</p><span class="source-state">${esc(item.state)}</span>${item.url?`<a href="${safeUrl(item.url)}" target="_blank" rel="noreferrer">開く ↗</a>`:''}</article>`).join('')}</div></div><form id="add-entity-form" class="add-entity-form"><header><span>監視対象を追加</span><h2>企業を追加する</h2><p>追加後は3年ベースラインの調査対象にも入ります。</p></header><label><span>企業名</span><input name="name" required minlength="2"></label><label><span>地域</span><select name="region"><option>Japan</option><option>Global</option></select></label><label><span>分類</span><input name="segment" placeholder="例：AIコンサル"></label><label><span>公式URL</span><input name="official_url" type="url" placeholder="https://example.com/news"></label><button type="submit">監視対象に追加</button></form></section>`;
}

async function submitEntity(event){
  if(event.target.id!=='add-entity-form')return;event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;
  try{const values=Object.fromEntries(new FormData(form));await api('/api/watchlist',{method:'POST',body:JSON.stringify(values)});state.data=await api('/api/dashboard');form.reset();render();toast('監視対象とベースライン調査キューに追加しました');}catch(error){toast(`追加できません: ${error.message}`);}finally{button.disabled=false;}
}

function renderEvidenceRadar(entity,matrix){
  const dimensions=matrix.dimensions.slice(0,8),values={unknown:0,observed:1,active:2,scaled:3};
  const known=dimensions.filter(item=>profileState(entity,item.id)!=='unknown').length;
  if(known<4)return `<div class="radar-empty"><b>レーダー表示には根拠が不足しています</b><p>${known} / ${dimensions.length}軸を確認済み。4軸以上になると表示します。</p></div>`;
  const width=430,height=300,cx=205,cy=145,radius=96,count=dimensions.length;
  const point=(index,level,extra=0)=>{const angle=-Math.PI/2+Math.PI*2*index/count,r=radius*(level/3)+extra;return {x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,angle};};
  const rings=[1,2,3].map(level=>`<polygon class="radar-ring" points="${dimensions.map((_,index)=>{const p=point(index,level);return `${p.x},${p.y}`;}).join(' ')}"></polygon>`).join('');
  const axes=dimensions.map((item,index)=>{const end=point(index,3),label=point(index,3,28),anchor=Math.abs(Math.cos(label.angle))<.25?'middle':Math.cos(label.angle)>0?'start':'end';return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}"></line><text class="radar-label" x="${label.x}" y="${label.y}" text-anchor="${anchor}">${esc(shortLabel(item.label,10))}</text>`;}).join('');
  const polygon=dimensions.map((item,index)=>{const p=point(index,values[profileState(entity,item.id)]);return `${p.x},${p.y}`;}).join(' ');
  const dots=dimensions.map((item,index)=>{const p=point(index,values[profileState(entity,item.id)]);return `<circle cx="${p.x}" cy="${p.y}" r="3"><title>${esc(`${item.label}: ${stateDefinition(profileState(entity,item.id)).label}`)}</title></circle>`;}).join('');
  return `<div class="evidence-radar"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(entity.name)}の定性的なAI活動レーダー">${rings}${axes}<polygon class="radar-shape" points="${polygon}"></polygon>${dots}</svg><div class="radar-legend"><span>中心 未確認</span><span>1 確認あり</span><span>2 継続展開</span><span>3 全社・商用</span></div></div>`;
}

function openEntity(id){
  const entity=state.data.entities.find(item=>item.id===id);if(!entity)return;const profile=entity.profile,related=state.data.signals.filter(signal=>signal.entity_id===id);const matrix=matrixFor(entity.group_id);const history=[...(profile?.history||[]).map(item=>({...item,kind:'history'})),...related.map(signal=>({date:signal.published_at,title:signal.title,summary:signal.summary,source:signal.source,signal_id:signal.id,kind:'signal'}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const sources=[...new Map(history.filter(item=>item.source?.url).map(item=>[item.source.url,item.source])).values()];
  showDrawer(`<section class="profile-head"><span class="drawer-kicker">${esc(entity.group_label)} / ${esc(entity.segment||'未分類')}</span><h2>${esc(entity.name)}</h2><p>${esc(profile?.current_position||'3年ベースラインはまだ調査されていません。企業名だけを現在地として扱わず、一次情報を確認するまで未確認で表示します。')}</p><div class="profile-status"><span>${profile?.status==='complete'?'3年基準完了':profile?'部分確認':'調査待ち'}</span><b>${esc(maturityLabel(profile?.maturity_stage||'unknown'))}</b><small>${esc(watchLabel(entity))}</small></div></section>
  <section class="profile-matrix"><h3>AI現在地</h3><div>${matrix.dimensions.map(dimension=>{const value=profileState(entity,dimension.id);return `<span class="matrix-key ${value}">${stateGlyph[value]} ${esc(dimension.label)} · ${esc(stateDefinition(value).label)}</span>`;}).join('')}</div></section>
  <section class="profile-radar"><div><span>EVIDENCE PROFILE</span><h3>AI活動の形</h3><p>定性的な確認状態を可視化したもので、企業評価や総合点ではありません。</p></div>${renderEvidenceRadar(entity,matrix)}<aside><b>${sources.length}</b><span>公式根拠</span><b>${related.length+(profile?.history?.length||0)}</b><span>確認済み履歴</span><small>${profile?.status==='complete'?'3年窓の確認完了':profile?'部分確認のため比較には使用しない':'調査待ちのため比較には使用しない'}</small></aside></section>
  <section class="profile-columns"><article><span>企業情報</span><h3>現在のAI戦略</h3><dl><dt>導入段階</dt><dd>${esc(maturityLabel(profile?.maturity_stage||'unknown'))}</dd><dt>開発方法</dt><dd>${profile?.development_methods?.length?profile.development_methods.map(method=>esc(methodLabel(method))).join(' / '):'未確認'}</dd></dl><h4>社内活用</h4>${listOrUnknown(profile?.internal_use)}<h4>外部向けオファリング</h4>${listOrUnknown(profile?.offerings)}<h4>AI関連の提携</h4>${listOrUnknown(profile?.partnerships)}</article><article><span>12か月・3年の変更履歴</span><h3>${history.length}件の確認済み履歴</h3>${history.length?`<div class="profile-timeline">${history.map(item=>`<button ${item.signal_id?`data-signal="${esc(item.signal_id)}"`:''}><time>${esc(item.date)}</time><b>${esc(item.title)}</b><p>${esc(item.summary)}</p></button>`).join('')}</div>`:'<p class="unknown-copy">一次情報のバックフィル待ちです。</p>'}</article><article><span>公式根拠</span><h3>${sources.length}件</h3>${sources.length?sources.map(source=>`<a class="profile-source" href="${safeUrl(source.url)}" target="_blank" rel="noreferrer"><b>${esc(source.publisher)}</b><small>${esc(source.title||source.url)}</small></a>`).join(''):'<p class="unknown-copy">根拠資料はまだ登録されていません。</p>'}<p class="evidence-note">ヒートマップはこの根拠に基づく定性的な現在地です。ニュース件数や検索件数によるランキングではありません。</p></article></section>`,'profile');
}
function listOrUnknown(items){return items?.length?`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:'<p class="unknown-copy">未確認</p>';}
function openSignal(id){
  const signal=state.data.signals.find(item=>item.id===id);if(!signal)return;
  showDrawer(`<span class="drawer-kicker">${esc(signal.entity?.name||signal.entity_id)} / ${esc(signal.category)}</span><h2>${esc(signal.title)}</h2><div class="drawer-signal-meta"><span class="importance ${esc(signal.importance)}">${esc(signal.importance)}</span><time>${esc(signal.published_at)}</time><b>${esc(signal.verification)}</b></div><section class="drawer-section"><h3>確認した事実</h3><p>${esc(signal.summary)}</p></section><section class="drawer-section emphasis"><h3>会議で見る意味</h3><p>${esc(signal.why_it_matters)}</p></section><section class="drawer-section"><h3>前回との差分</h3><p>${esc(signal.change?.delta||'初回ベースラインへ追加。次回から前回状態との変更を記録します。')}</p></section><section class="drawer-source"><span>一次情報</span><a href="${safeUrl(signal.source.url)}" target="_blank" rel="noreferrer"><b>${esc(signal.source.publisher)}</b><small>${esc(signal.source.title||signal.source.url)}</small></a></section>`);
}
function openInsight(id){
  const insight=state.data.insights.find(item=>item.id===id);if(!insight)return;
  const evidence=insight.evidence_signal_ids.map(signalId=>state.data.signals.find(item=>item.id===signalId)).filter(Boolean);
  showDrawer(`<span class="drawer-kicker">INSIGHT / ${esc(insight.type)}</span><h2>${esc(insight.title)}</h2><div class="drawer-signal-meta"><span class="confidence ${esc(insight.confidence)}">${insight.confidence==='high'?'高確度':'中確度'}</span><b>${insight.evidence_count}件の一次情報</b></div><section class="drawer-section emphasis"><h3>観測した結論</h3><p>${esc(insight.conclusion)}</p></section><section class="drawer-section"><h3>判定理由</h3><p>${esc(insight.rationale)}</p></section><section class="drawer-section"><h3>公式根拠</h3>${evidence.map(signal=>`<button data-signal="${esc(signal.id)}"><span>${esc(signal.entity?.name||signal.entity_id)}</span><b>${esc(signal.title)}</b></button>`).join('')}</section><section class="drawer-section"><h3>反証・制約</h3><p>${esc(insight.counterevidence)}</p></section><section class="drawer-section emphasis"><h3>自社への示唆</h3><p>${esc(insight.implication)}</p></section><section class="drawer-section"><h3>次回観測</h3><p>${esc(insight.next_watch)}</p></section>`);
}
function openMethod(){
  showDrawer(`<span class="drawer-kicker">METHOD / DEFINITIONS</span><h2>ヒートマップの判定方法</h2><section class="drawer-section"><p>各セルは市場シェアや優劣ではなく、一次情報で確認できた活動の状態です。ニュース件数、検索結果数、言及数は色付けに使いません。</p>${state.data.intelligence.evidence_states.map(item=>`<div class="method-row"><span class="matrix-key ${item.id}">${stateGlyph[item.id]} ${esc(item.label)}</span><p>${esc(item.definition)}</p></div>`).join('')}</section><section class="drawer-section"><h3>導入段階</h3><p>${state.data.intelligence.maturity_stages.map(item=>esc(item.label)).join(' → ')}</p></section><section class="drawer-section emphasis"><h3>誤読しないために</h3><p>未確認は「取り組みがない」という意味ではありません。現時点で登録済みの一次情報がないという意味です。3年ベースラインの完了企業だけが、期間内の主要公式発信を一巡済みです。</p></section>`);
}
function showDrawer(html,mode='signal'){$('#drawer-content').innerHTML=html;$('#detail-drawer').classList.toggle('profile',mode==='profile');$('#drawer-backdrop').hidden=false;$('#detail-drawer').classList.add('open');$('#detail-drawer').setAttribute('aria-hidden','false');$('#drawer-close').focus();}
function closeDrawer(){$('#detail-drawer').classList.remove('open','profile');$('#detail-drawer').setAttribute('aria-hidden','true');$('#drawer-backdrop').hidden=true;}

function meetingSlides(){
  const d=state.data,b=d.brief,top=d.signals.slice(0,4),competitors=d.signals.filter(item=>item.entity?.group_id==='consulting').slice(0,3),insight=d.insights?.[0];
  return [
    {kicker:'THIS WEEK',title:b.headline,body:b.summary,foot:`${b.period?.label||''} · 一次情報で確認 ${d.metrics.confirmed}件`},
    {kicker:'THE EVIDENCE',title:'結論を支える4つの変更',body:`<ol class="meeting-evidence">${top.map(item=>`<li><span>${esc(item.entity?.name||item.entity_id)}</span><b>${esc(item.title)}</b><small>${esc(item.source.publisher)}</small></li>`).join('')}</ol>`,html:true,foot:'企業公式・研究組織の一次情報'},
    {kicker:'COMPETITOR IMPACT',title:'競合はAI構想から実装資産へ',body:competitors.length?`<div class="meeting-evidence">${competitors.map(item=>`<p><span>${esc(item.entity?.name||item.entity_id)}</span><b>${esc(item.title)}</b>${esc(item.why_it_matters)}</p>`).join('')}</div>`:'今週確認できた競合コンサルの重要変更はありません。',html:true,foot:'コンサルティング変更台帳'},
    {kicker:'OBSERVED PATTERN',title:insight?.title||'複数社にまたがる変化は未検出',body:insight?`<p>${esc(insight.conclusion)}</p><p><b>示唆：</b>${esc(insight.implication)}</p>`:'週次更新の蓄積後に、複数社・複数根拠のパターンを表示します。',html:true,foot:insight?`${insight.evidence_count}件 / ${insight.source_count}情報源 · 長期トレンドとは未断定`:'根拠付きインサイト'},
    {kicker:'STRATEGIC IMPLICATION',title:'次に議論すること',body:`<ol class="meeting-agenda">${(b.discussion_points||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ol>`,html:true,foot:'意思決定用の論点'},
    {kicker:'WATCH NEXT',title:'次回までに埋める情報',body:`<ul class="meeting-agenda">${(b.limitations||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`,html:true,foot:`3年基準 ${d.metrics.profiles_complete} / ${d.metrics.watched}社完了`}
  ];
}
function openMeetingMode(){state.meetingSlide=0;$('#meeting-mode').hidden=false;document.body.classList.add('meeting-open');renderMeeting();}
function closeMeetingMode(){$('#meeting-mode').hidden=true;document.body.classList.remove('meeting-open');}
function moveMeeting(delta){const slides=meetingSlides();state.meetingSlide=Math.max(0,Math.min(slides.length-1,state.meetingSlide+delta));renderMeeting();}
function renderMeeting(){const slides=meetingSlides(),slide=slides[state.meetingSlide];$('#meeting-content').innerHTML=`<span>${esc(slide.kicker)}</span><h2>${esc(slide.title)}</h2><div class="meeting-body">${slide.html?slide.body:esc(slide.body)}</div><footer>${esc(slide.foot)}</footer>`;$('#meeting-index').textContent=`${state.meetingSlide+1} / ${slides.length}`;$('#meeting-prev').disabled=state.meetingSlide===0;$('#meeting-next').disabled=state.meetingSlide===slides.length-1;}

init();
