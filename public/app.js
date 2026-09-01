const state={data:null,view:'digest',searchQuery:'',graphFilter:'changed-in',relationshipTab:'changes',periodScope:'week',graphPeriodScope:'week',playerGroup:'all',digestCategory:'all',companyFilter:'all',aiTypeFilter:'all',aiRegionFilter:'all'};
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const viewMeta={
  digest:['WEEKLY AI LANDSCAPE','今週のダイジェスト'],
  ledger:['EVIDENCE UPDATE HISTORY','更新履歴'],
  relationships:['AI MARKET MOVEMENTS','AI市場の動き'],
  insights:['EVIDENCE TO DECISION','示唆ボード'],
  'ai-companies':['MODEL / PLATFORM WATCH','主要AI企業'],
  consulting:['CONSULTING AI MAP','コンサルマップ'],
  enterprises:['JAPAN ENTERPRISE ADOPTION','日本企業AI利活用'],
  startups:['JAPAN AI CHALLENGERS','スタートアップ・新興企業'],
  saas:['SAAS REPOSITIONING','SaaSのAI戦略'],
  archive:['MONTHLY MEMORY','月次アーカイブ'],
  settings:['COVERAGE / SOURCES','監視設定・情報源']
};
const stateGlyph={unknown:'未',observed:'確',active:'継',scaled:'本'};

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
function watchLabel(entity){if(entity.profile?.status==='complete')return '基準調査完了';if(entity.profile)return '基礎情報は部分確認';return '基準情報を調査待ち';}
function evidenceCount(entity){return (entity.profile?.history?.length||0)+(entity.signal_count||0);}
function shortLabel(value,max=28){const text=String(value||'');return text.length>max?`${text.slice(0,max-1)}…`:text;}
function signalFeed(signals){
  const periodStart=state.data.brief?.period?.start;
  const current=periodStart?signals.filter(signal=>signal.published_at>=periodStart):[];
  return current.length?current:signals;
}
function categoryCounts(signals){
  const counts=new Map();
  for(const signal of signals)counts.set(signal.category,(counts.get(signal.category)||0)+1);
  return [...counts].map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count||a.category.localeCompare(b.category,'ja'));
}
function consultingFilters(){
  return [
    {id:'all',label:'すべて',test:()=>true},
    {id:'big4',label:'Big4',test:entity=>['pwc-consulting','ey-strategy-consulting','kpmg-consulting','deloitte-tohmatsu'].includes(entity.id)},
    {id:'mbb',label:'MBB',test:entity=>['mckinsey','bcg','bain'].includes(entity.id)},
    {id:'strategy',label:'戦略系',test:entity=>entity.segment==='戦略系'},
    {id:'general',label:'総合系',test:entity=>entity.segment==='総合系'},
    {id:'dx-it',label:'DX・IT系',test:entity=>String(entity.segment||'').includes('デジタル・IT')||['capgemini','ibm-japan','tcs-japan','future','ridgelinez','avanade'].includes(entity.id)},
    {id:'thinktank',label:'シンクタンク系',test:entity=>String(entity.segment||'').includes('シンクタンク')},
    {id:'fas',label:'FAS・M&A',test:entity=>String(entity.segment||'').startsWith('FAS')},
    {id:'hr',label:'組織・人事',test:entity=>String(entity.segment||'').includes('組織')}
  ];
}
function matchesConsultingFilter(entity,filterId){
  const filter=consultingFilters().find(item=>item.id===filterId)||consultingFilters()[0];
  return filter.test(entity);
}
function valueFilters(list,field){
  const values=[...new Set(list.map(entity=>entity[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  return [{id:'all',label:'すべて'},...values.map(value=>({id:value,label:value}))];
}
function searchMatches(value,query){return String(value||'').toLowerCase().includes(query);}
function closeSearchResults(){const panel=$('#search-results');if(!panel)return;panel.hidden=true;panel.innerHTML='';}
function renderSearchResults(){
  const panel=$('#search-results'),query=state.searchQuery;
  if(!query){closeSearchResults();return;}
  const companies=state.data.entities.filter(entity=>searchMatches(`${entity.name} ${entity.group_label||''} ${entity.segment||''} ${entity.region_tag||''}`,query)).slice(0,8);
  const signals=state.data.signals.filter(signal=>searchMatches(`${signal.title} ${signal.summary} ${signal.category} ${signal.entity?.name||''}`,query)).slice(0,5);
  panel.innerHTML=`<div class="search-results-head"><b>検索結果</b><small>企業 ${companies.length}件 · 更新 ${signals.length}件</small></div>${companies.length?`<section><span>企業</span>${companies.map(entity=>`<button data-entity="${esc(entity.id)}"><b>${esc(entity.name)}</b><small>${esc(entity.group_label||'')} · ${esc(entity.segment||'未分類')}</small></button>`).join('')}</section>`:''}${signals.length?`<section><span>更新・テーマ</span>${signals.map(signal=>`<button data-signal="${esc(signal.id)}"><b>${esc(shortLabel(signal.title,58))}</b><small>${esc(signal.entity?.name||signal.entity_id)} · ${esc(signal.published_at)}</small></button>`).join('')}</section>`:''}${!companies.length&&!signals.length?'<p>一致する企業・更新はありません。</p>':''}`;
  panel.hidden=false;
}
function selectSearchResult(event){
  const entity=event.target.closest('[data-entity]');const signal=event.target.closest('[data-signal]');
  if(!entity&&!signal)return;
  state.searchQuery='';$('#global-search').value='';closeSearchResults();
  if(entity)openEntity(entity.dataset.entity);else openSignal(signal.dataset.signal);
}

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
    $('#updated-at').textContent=formatDate(data.updated_at);$('#nav-important').textContent=data.metrics.important;$('#nav-ledger').textContent=data.signals.length;$('#nav-graph').textContent=data.trends?.momentum_themes?.length||0;$('#nav-insights').textContent=data.insights?.length||0;
    $$('[data-count-group]').forEach(element=>{const id=element.dataset.countGroup;element.textContent=id==='saas'?(group('global-saas')?.count||0)+(group('japan-saas')?.count||0):group(id)?.count||0;});
    bind();render();
  }catch(error){$('#health-label').textContent='サーバー未接続';$('#content').innerHTML=`<section class="empty-panel"><h2>画面を読み込めません</h2><p>${esc(error.message)}</p><p><code>npm start</code>を実行して再読み込みしてください。</p></section>`;}
}

function bind(){
  $('#primary-nav').addEventListener('click',navigate);$('.sidebar-secondary').addEventListener('click',navigate);
  $('#global-search').addEventListener('input',event=>{state.searchQuery=event.target.value.trim().toLowerCase();renderSearchResults();});
  $('#search-results').addEventListener('click',selectSearchResult);
  $('#content').addEventListener('click',event=>{
    const entity=event.target.closest('[data-entity]');if(entity){openEntity(entity.dataset.entity);return;}
    const signal=event.target.closest('[data-signal]');if(signal){openSignal(signal.dataset.signal);return;}
    const insight=event.target.closest('[data-insight]');if(insight){openInsight(insight.dataset.insight);return;}
    const graphFilter=event.target.closest('[data-graph-filter]');if(graphFilter){state.graphFilter=graphFilter.dataset.graphFilter;render();return;}
    const relationshipTab=event.target.closest('[data-relationship-tab]');if(relationshipTab){state.relationshipTab=relationshipTab.dataset.relationshipTab;render();return;}
    const periodScope=event.target.closest('[data-period-scope]');if(periodScope){const target=periodScope.dataset.periodTarget==='graph'?'graphPeriodScope':'periodScope';state[target]=periodScope.dataset.periodScope;render();return;}
    const playerGroup=event.target.closest('[data-player-group]');if(playerGroup){state.playerGroup=playerGroup.dataset.playerGroup;render();return;}
    const digestFilter=event.target.closest('[data-digest-filter]');if(digestFilter){state.digestCategory=digestFilter.dataset.digestFilter;render();return;}
    const companyFilter=event.target.closest('[data-company-filter]');if(companyFilter){state.companyFilter=companyFilter.dataset.companyFilter;render();return;}
    const aiTypeFilter=event.target.closest('[data-ai-type-filter]');if(aiTypeFilter){state.aiTypeFilter=aiTypeFilter.dataset.aiTypeFilter;render();return;}
    const aiRegionFilter=event.target.closest('[data-ai-region-filter]');if(aiRegionFilter){state.aiRegionFilter=aiRegionFilter.dataset.aiRegionFilter;render();return;}
    const jump=event.target.closest('[data-jump]');if(jump)setView(jump.dataset.jump);
    const method=event.target.closest('[data-method]');if(method)openMethod();
  });
  $('#content').addEventListener('submit',submitEntity);
  $('#drawer-content').addEventListener('click',event=>{
    const signal=event.target.closest('[data-signal]');if(signal)openSignal(signal.dataset.signal);
  });
  $('#drawer-close').addEventListener('click',closeDrawer);$('#drawer-backdrop').addEventListener('click',closeDrawer);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeDrawer();closeSearchResults();}});
}
function navigate(event){const button=event.target.closest('[data-view]');if(button)setView(button.dataset.view);}
function setView(view){state.view=view;state.searchQuery='';state.relationshipTab='changes';state.periodScope='week';state.graphPeriodScope='week';state.playerGroup='all';state.digestCategory='all';state.companyFilter='all';state.aiTypeFilter='all';state.aiRegionFilter='all';$('#global-search').value='';closeSearchResults();$$('[data-view]').forEach(item=>item.classList.toggle('active',item.dataset.view===view));render();window.scrollTo({top:0,behavior:'smooth'});}

function render(){
  const [kicker,title]=viewMeta[state.view];$('#view-kicker').textContent=kicker;$('#view-title').textContent=title;
  const views={digest:renderDigest,ledger:()=>renderLedgerPage(state.data.signals),relationships:renderRelationships,insights:renderInsights,'ai-companies':()=>renderCategory(['ai-companies'],'世界の基盤モデル、Geminiを含む大手プラットフォーム、中国・アジア勢、データ/オントロジー、AIクラウド、推論基盤、半導体・HBM、AIサーバーを一つの供給網として比較します。'),consulting:()=>renderCategory(['consulting'],'コンサル各社を、顧客向け提供、実装・定着、自社AI活用、共通資産、外部連携、AI人材・組織の6軸で比較します。業界・業務領域と個別オファリングは詳細で確認します。'),enterprises:()=>renderCategory(['enterprises'],'日本企業の全社AI、独自開発、製造・R&D、顧客向けAI、SCM、統制、組織を業界別・企業別に確認します。'),startups:()=>renderCategory(['startups'],'日本発のAIスタートアップ・新興企業を、独自技術、製品、顧客、提携、資金調達、研究で比較します。'),saas:()=>renderCategory(['global-saas','japan-saas'],'国内外SaaSが、支援AIから業務エージェント、開発基盤、統制、価格、連携網へどう移っているかを比較します。'),archive:renderArchive,settings:renderSettings};
  let html=(views[state.view]||renderDigest)();
  html=html.replaceAll('現在地','AI活用・提供状況');
  $('#content').innerHTML=html;
}

function renderDigest(){
  const d=state.data,b=d.brief,period=b.period?.label||'初回更新前';
  const outlook=new Map((b.category_outlook||[]).map(item=>[item.group_id,item]));
  const feed=signalFeed(d.signals);
  const activeFeed=state.digestCategory==='all'?feed:feed.filter(signal=>matchesWeeklyLens(signal,state.digestCategory));
  const keyMessages=feed.slice().sort((a,b)=>{const weight={critical:3,high:2,medium:1,low:0};return (weight[b.importance]||0)-(weight[a.importance]||0)||String(b.published_at).localeCompare(String(a.published_at));}).slice(0,3);
  return `<section class="canvas-hero"><div class="canvas-hero-copy"><span>AI OPPORTUNITY MONITOR · ${esc(period)}</span><h2>今週のAI市場で確認した主な動き</h2><p>AI市場全般の技術・製品・活用トレンドと、監視企業の公式更新を確認しています。</p><div class="canvas-brief-messages count-${Math.max(1,keyMessages.length)}">${keyMessages.length?keyMessages.map((signal,index)=>`<button data-signal="${esc(signal.id)}"><i>${String(index+1).padStart(2,'0')}</i><div><b>${esc(shortLabel(signal.title,52))}</b><small>${esc(signal.entity?.name||signal.entity_id)} · ${esc(signal.category)} · ${esc(signal.published_at)}</small></div></button>`).join(''):`<div><b>${esc(b.headline)}</b><small>今週の公式確認情報を取り込むと、ここに主要メッセージを表示します。</small></div>`}</div></div><aside class="canvas-coverage"><span>RESEARCH COVERAGE</span><dl><div><dt>監視企業</dt><dd>${d.metrics.watched}</dd></div><div><dt>確認済み更新</dt><dd>${d.metrics.this_period}</dd></div><div><dt>基礎情報あり</dt><dd>${d.metrics.profiles_started}<small> / ${d.metrics.watched}</small></dd></div></dl><p>${esc(d.profile_coverage.note||'3〜5年ベースラインを整備中です。')}</p><button data-jump="settings">調査範囲・判定ルール →</button></aside></section>
  ${renderCanvasSignals(activeFeed,feed)}
  ${renderCanvasStructure(feed,outlook)}
  <section class="canvas-actions"><button data-jump="relationships"><span>MARKET EXPLORER</span><b>市場の位置・関係を詳しく見る</b><small>AIバリューチェーン、企業×レイヤー、関係図へ</small></button><button data-jump="consulting"><span>COMPANY INTELLIGENCE</span><b>各社のAI活用・提供状況を見る</b><small>コンサル、事業会社、新興企業、SaaSを比較</small></button><button data-jump="ledger"><span>OFFICIAL EVIDENCE</span><b>確認済み情報をすべて見る</b><small>${d.signals.length}件の根拠付き更新を一覧で確認</small></button></section>`;
}

const weeklyLenses=[
  {id:'models',label:'モデル・基盤技術',test:(signal,entity)=>signal.category==='基盤モデル'||/半導体|GPU|計算|クラウド/.test(`${entity.segment||''} ${entity.name||''}`)},
  {id:'products',label:'製品・AIエージェント',test:signal=>['AIエージェント','SaaS再定義'].includes(signal.category)},
  {id:'industry',label:'業界・企業活用',test:(signal,entity)=>entity.group_id==='enterprises'||signal.category==='内製開発'},
  {id:'research',label:'論文・研究',test:signal=>signal.category==='研究'},
  {id:'practice',label:'実装・活用方法',test:signal=>signal.category==='AIオファリング'},
  {id:'perspectives',label:'市場・制度・論点',test:signal=>['提携・M&A','ガバナンス'].includes(signal.category)}
];
function matchesWeeklyLens(signal,id){
  const entity=signal.entity||state.data.entities.find(item=>item.id===signal.entity_id)||{};
  return weeklyLenses.find(lens=>lens.id===id)?.test(signal,entity)||false;
}
function renderCanvasSignals(signals,allSignals){
  const ranked=signals.slice().sort((a,b)=>{const weight={critical:3,high:2,medium:1,low:0};return (weight[b.importance]||0)-(weight[a.importance]||0)||String(b.published_at).localeCompare(String(a.published_at));});
  const lead=ranked[0],supporting=ranked.slice(1,4),active=state.digestCategory;
  return `<section class="canvas-signals"><div class="canvas-signals-main"><header><div><span>THIS WEEK · OFFICIAL UPDATES</span><h2>今週の重要な動き</h2><p>企業の公式発表、導入事例、製品更新などから確認した、今週の主要トピックです。</p></div><b>${signals.length}<small>件</small></b></header>${lead?`<button class="canvas-lead" data-signal="${esc(lead.id)}"><div><span>${esc(lead.entity?.name||lead.entity_id)}</span><em class="importance ${esc(lead.importance)}">${esc(lead.importance)}</em></div><h3>${esc(lead.title)}</h3><p>${esc(lead.summary)}</p><footer><span>${esc(lead.category)}</span><small>${esc(lead.source?.publisher||'一次情報')} · ${esc(lead.published_at)}</small></footer></button>`:'<div class="empty-inline"><b>この切り口の今週の確認事項はありません</b><p>一次情報で確認できた情報があれば表示します。</p></div>'}<div class="canvas-supporting">${supporting.map(signal=>`<button data-signal="${esc(signal.id)}"><span>${esc(signal.entity?.name||signal.entity_id)}</span><b>${esc(shortLabel(signal.title,54))}</b><small>${esc(signal.source?.publisher||'一次情報')} · ${esc(signal.published_at)}</small></button>`).join('')}</div></div><aside class="canvas-filter"><header><span>AI MARKET LENSES</span><h3>AI市場の観測切り口</h3><p>週次調査で用いる6つの切り口です。数字は今週確認した更新件数です。</p></header><button class="${active==='all'?'active':''}" data-digest-filter="all"><span>すべて</span><b>${allSignals.length}</b></button>${weeklyLenses.map(lens=>{const count=allSignals.filter(signal=>matchesWeeklyLens(signal,lens.id)).length;return `<button class="${active===lens.id?'active':''}" data-digest-filter="${esc(lens.id)}"><span>${esc(lens.label)}</span><b>${count}</b></button>`;}).join('')}</aside></section>`;
}

function renderCanvasStructure(signals,outlook){
  const layers=marketLayers(signals);
  const groups=state.data.groups.filter(item=>item.id!=='additional');
  return `<section class="canvas-structure"><header><div><span>AI MARKET MAP</span><h2>AI市場の観測マップ</h2><p>技術から企業活用・導入支援までを一枚で見ます。青数字は今週の公式確認、灰色は今週の確認なしです。</p></div><button data-jump="relationships">市場マップを開く →</button></header><div class="canvas-layer-map">${layers.map((layer,index)=>`<button data-jump="relationships" class="canvas-layer ${layer.updates.length?'has-signal':''}"><i>${String(index+1).padStart(2,'0')}</i><strong>${esc(layer.label)}</strong><small>${esc(layer.note)}</small><b>${layer.updates.length}</b><span>${layer.names.length?layer.names.map(name=>esc(shortLabel(name,18))).join(' · '):'今週の確認なし'}</span></button>`).join('')}</div><div class="canvas-player-strip">${groups.map(group=>{const target=group.id==='global-saas'||group.id==='japan-saas'?'saas':group.id;const profiled=entities(group.id).filter(entity=>entity.profile).length;const note=outlook.get(group.id);return `<button data-jump="${target}"><span>${esc(group.label)}</span><b>${profiled}<small> / ${group.count}社</small></b><em>${esc(note?.summary||'基礎情報を調査中')}</em></button>`;}).join('')}</div></section>`;
}

function renderDigestNews(signals){
  let feed=signalFeed(signals);
  const counts=categoryCounts(feed),active=state.digestCategory;
  if(active!=='all')feed=feed.filter(signal=>signal.category===active);
  const shown=feed.slice().sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at))).slice(0,14);
  const total=counts.reduce((sum,item)=>sum+item.count,0);
  return `<section class="digest-news-board"><div class="digest-news-list"><header><div><span>カテゴリ別ニュース</span><h2>今週・今回取り込みの確認済み情報</h2></div><b>${shown.length} / ${feed.length}件</b></header>${shown.length?shown.map(signal=>`<article class="digest-news-card ${esc(signal.importance)}"><button data-signal="${esc(signal.id)}"><time>${esc(signal.published_at)}</time><strong>${esc(signal.entity?.name||signal.entity_id)}</strong><h3>${esc(signal.title)}</h3><p>${esc(signal.summary)}</p><footer><span>${esc(signal.category)}</span><small>${esc(signal.source?.publisher||'source')}</small></footer></button></article>`).join(''):'<div class="empty-inline"><b>該当するニュースはありません</b><p>カテゴリまたは検索条件を変えてください。</p></div>'}</div><aside class="digest-category-rail"><header><span>タグで絞る</span><h3>カテゴリ</h3><p>件数は登録済み根拠の数です。市場評価ではありません。</p></header><button class="${active==='all'?'active':''}" data-digest-filter="all"><span>すべて</span><b>${total}</b></button>${counts.map(item=>`<button class="${active===item.category?'active':''}" data-digest-filter="${esc(item.category)}"><span>${esc(item.category)}</span><b>${item.count}</b></button>`).join('')}</aside></section>`;
}

function relationEvidenceCounts(graph,type){
  return graph.summary.relation_evidence_counts?.[type]||{item:0,profile:0,unverified:0};
}

function relationStatus(entity,raw){
  const ids=raw&&typeof raw==='object'&&Array.isArray(raw.evidence_signal_ids)?raw.evidence_signal_ids.filter(Boolean):[];
  if(ids.length)return {label:'個別根拠あり',className:'item',ids};
  if(entity.profile?.history?.some(item=>item.source?.url))return {label:'プロフィール根拠のみ',className:'profile',ids:[]};
  return {label:'根拠待ち',className:'unverified',ids:[]};
}

function relationName(raw){return raw&&typeof raw==='object'?String(raw.name||raw.label||'').trim():String(raw||'').trim();}

function relationCatalogRows(type){
  const field=type==='offers'?'offerings':'partnerships';
  return state.data.entities.filter(entity=>entity.profile?.[field]?.length).map(entity=>{
    const items=entity.profile[field].map(raw=>({name:relationName(raw),status:relationStatus(entity,raw)})).filter(item=>item.name);
    return {entity,items};
  }).filter(row=>row.items.length).sort((a,b)=>b.items.length-a.items.length||a.entity.name.localeCompare(b.entity.name,'ja'));
}

function renderRelationCatalog(type){
  const isOffering=type==='offers',label=isOffering?'顧客向け提供':'外部提携';
  const rows=relationCatalogRows(type),total=rows.reduce((sum,row)=>sum+row.items.length,0);
  const itemEvidence=rows.reduce((sum,row)=>sum+row.items.filter(item=>item.status.className==='item').length,0);
  const profileOnly=rows.reduce((sum,row)=>sum+row.items.filter(item=>item.status.className==='profile').length,0);
  const unverified=rows.reduce((sum,row)=>sum+row.items.filter(item=>item.status.className==='unverified').length,0);
  return `<section class="relationship-catalog"><header><div><span>${isOffering?'OFFERING CATALOG':'PARTNERSHIP CATALOG'}</span><h2>${label}を企業別に確認する</h2><p>${isOffering?'提供項目を線でつながず、会社ごとの代表項目と根拠状態を一覧で見ます。':'提携先を線でつながず、関係の登録状態と根拠を一覧で見ます。'}</p></div><dl><div><dt>登録項目</dt><dd>${total}</dd></div><div><dt>個別根拠あり</dt><dd>${itemEvidence}</dd></div><div><dt>プロフィール根拠のみ</dt><dd>${profileOnly}</dd></div><div><dt>根拠待ち</dt><dd>${unverified}</dd></div></dl></header>${rows.length?`<div class="relationship-table-wrap"><table class="relationship-table"><thead><tr><th>企業</th><th>${label}</th><th>根拠状態</th><th>確認</th></tr></thead><tbody>${rows.map(row=>{const visible=row.items.slice(0,3),remaining=row.items.length-visible.length;return `<tr><th><button data-entity="${esc(row.entity.id)}"><b>${esc(row.entity.name)}</b><small>${esc(row.entity.segment||row.entity.group_label||'')}</small></button></th><td><div class="relation-items">${visible.map(item=>`<span>${esc(item.name)}</span>`).join('')}${remaining?`<em>+${remaining}件</em>`:''}</div></td><td><div class="relation-statuses"><span class="relation-status item">${row.items.filter(item=>item.status.className==='item').length} 個別</span><span class="relation-status profile">${row.items.filter(item=>item.status.className==='profile').length} プロフィール</span><span class="relation-status unverified">${row.items.filter(item=>item.status.className==='unverified').length} 待ち</span></div></td><td><button class="table-action" data-entity="${esc(row.entity.id)}">詳細 →</button></td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty-inline"><b>登録された項目はありません</b><p>プロフィール調査後に表示されます。</p></div>'}<footer>「個別根拠あり」は項目自身に根拠IDが紐付いたものです。プロフィール根拠のみは、会社のAI活動は確認できても、その項目自体の直接確認ではありません。</footer></section>`;
}

const periodDefinitions={week:{label:'今週',short:'7日',days:7},month:{label:'今月',short:'30日',days:30},quarter:{label:'四半期',short:'90日',days:90},half:{label:'半期',short:'180日',days:180},year:{label:'年間',short:'365日',days:365}};
function periodWindow(scope=state.periodScope){
  const definition=periodDefinitions[scope]||periodDefinitions.week;
  const confirmed=state.data.signals.filter(signal=>signal.verification==='confirmed'&&Date.parse(signal.published_at));
  const latestTime=Math.max(0,...confirmed.map(signal=>Date.parse(signal.published_at)));
  const end=latestTime||Date.now(),span=definition.days*86400000;
  const current=confirmed.filter(signal=>{const time=Date.parse(signal.published_at);return time<=end&&time>end-span;});
  const previous=confirmed.filter(signal=>{const time=Date.parse(signal.published_at);return time<=end-span&&time>end-span*2;});
  return {definition,end,current,previous,reference:new Date(end).toISOString().slice(0,10)};
}
function periodThemeSummary(scope=state.periodScope){
  const window=periodWindow(scope),groups=new Map();
  for(const signal of window.current){const entry=groups.get(signal.category)||{category:signal.category,current:[],previous:[]};entry.current.push(signal);groups.set(signal.category,entry);}
  for(const signal of window.previous){const entry=groups.get(signal.category)||{category:signal.category,current:[],previous:[]};entry.previous.push(signal);groups.set(signal.category,entry);}
  return [...groups.values()].map(entry=>{
    const latest=entry.current.slice().sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)))[0];
    const delta=entry.previous.length?entry.current.length-entry.previous.length:null;
    const momentum=delta===null?(entry.current.length?'今回確認':''):delta>0?'増加':delta<0?'減少':'継続';
    return {category:entry.category,current:entry.current,previous:entry.previous,latest,companies:new Set(entry.current.map(item=>item.entity_id)).size,sources:new Set(entry.current.map(item=>item.source?.url).filter(Boolean)).size,momentum};
  }).sort((a,b)=>b.current.length-a.current.length||b.companies-a.companies||a.category.localeCompare(b.category,'ja'));
}
function periodRail(scopes=['week','month','quarter','half','year'],currentScope=state.periodScope,target='market'){
  return `<nav class="period-rail" aria-label="表示期間"><span>表示期間</span>${scopes.map(id=>[id,periodDefinitions[id]]).filter(([,item])=>item).map(([id,item])=>`<button class="${currentScope===id?'active':''}" data-period-scope="${id}" data-period-target="${target}"><b>${item.label}</b><small>${item.short}</small></button>`).join('')}</nav>`;
}
function marketLayers(current){
  const definitions=[
    {id:'compute',label:'算力・半導体',note:'計算資源・チップ',test:e=>/半導体|ハード|GPU|compute/i.test(`${e.segment||''} ${e.name||''}`)},
    {id:'models',label:'基盤モデル',note:'モデル・研究',test:e=>/モデル開発|研究/i.test(e.segment||'')},
    {id:'platform',label:'クラウド・業務基盤',note:'クラウド・SaaS',test:e=>['global-saas','japan-saas'].includes(e.group_id)||/ビッグテック/.test(e.segment||'')},
    {id:'apps',label:'AIアプリ・エージェント',note:'業務アプリ・エージェント',test:e=>/エンタープライズAI|スタートアップ|新興/i.test(`${e.segment||''} ${e.group_label||''}`)},
    {id:'industry',label:'業界ソリューション',note:'日本企業の利活用',test:e=>e.group_id==='enterprises'},
    {id:'delivery',label:'コンサル・導入',note:'構想・実装・定着',test:e=>e.group_id==='consulting'}
  ];
  return definitions.map(layer=>{
    const members=state.data.entities.filter(layer.test),ids=new Set(members.map(item=>item.id)),updates=current.filter(signal=>ids.has(signal.entity_id));
    const names=[...new Set(updates.map(signal=>signal.entity?.name||signal.entity_id))].slice(0,3);
    return {...layer,members,updates,names};
  });
}
function renderSituationBoard(window,themes){
  const ranked=window.current.slice().sort((a,b)=>{const weight={critical:3,high:2,medium:1,low:0};return (weight[b.importance]||0)-(weight[a.importance]||0)||String(b.published_at).localeCompare(String(a.published_at));});
  const lead=ranked[0],supporting=ranked.slice(1,4);
  return `<section class="observatory-grid"><article class="situation-board"><header><div><span>SELECTED WINDOW / ${esc(window.definition.label)}</span><h2>${esc(window.definition.label)}、何が動いたか</h2><p>一次情報で確認できた更新だけを、会議の最初に読む順で並べています。</p></div><b>${window.current.length}件</b></header>${lead?`<button class="situation-lead" data-signal="${esc(lead.id)}"><span>${esc(lead.entity?.name||lead.entity_id)} · ${esc(lead.category)}</span><h3>${esc(lead.title)}</h3><p>${esc(lead.summary)}</p><footer><em class="importance ${esc(lead.importance)}">${esc(lead.importance)}</em><small>${esc(lead.source?.publisher||'一次情報')} · ${esc(lead.published_at)}</small></footer></button>`:'<div class="empty-inline"><b>この期間に確認済み更新はありません</b><p>次回の調査で一次情報が追加されると表示します。</p></div>'}<div class="situation-list">${supporting.map(signal=>`<button data-signal="${esc(signal.id)}"><span>${esc(signal.entity?.name||signal.entity_id)}</span><b>${esc(shortLabel(signal.title,55))}</b><small>${esc(signal.category)} · ${esc(signal.published_at)}</small></button>`).join('')}</div></article><article class="market-structure"><header><div><span>AI MARKET STRUCTURE</span><h2>どの層で動いたか</h2><p>企業を一列にランキングせず、AIバリューチェーン上の位置で整理します。</p></div></header><div class="layer-stack">${marketLayers(window.current).map(layer=>`<div class="market-layer"><div><span>${esc(layer.label)}</span><small>${esc(layer.note)}</small></div><b>${layer.updates.length||0}</b><p>${layer.names.length?layer.names.map(name=>esc(shortLabel(name,22))).join(' · '):'この期間の更新なし'}</p></div>`).join('')}</div></article></section>`;
}
function renderThemeStrip(themes,window){
  const visible=themes.slice(0,6);
  return `<section class="theme-strip"><header><div><span>THEME SIGNALS</span><h2>テーマの動き</h2><p>${esc(window.definition.label)}の確認件数と、前の${window.definition.short}との比較です。比較できない期間は「比較データなし」と表示します。</p></div><small>基準日 ${esc(window.reference)}</small></header>${visible.length?`<div class="theme-strip-list">${visible.map(item=>`<button data-signal="${esc(item.latest?.id||'')}"><div><b>${esc(item.category)}</b><span class="theme-delta ${item.momentum==='増加'?'up':item.momentum==='減少'?'down':''}">${esc(item.momentum)}</span></div><strong>${item.current.length}</strong><small>更新 · ${item.companies}社 · ${item.sources}情報源</small><i><em style="width:${Math.max(8,Math.min(100,item.current.length/Math.max(1,visible[0].current.length)*100))}%"></em></i></button>`).join('')}</div>`:'<div class="empty-inline"><b>テーマ別に表示できる更新がありません</b></div>'}</section>`;
}
function renderChangeStrip(window){
  const items=window.current.slice().sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at))).slice(0,8);
  return `<section class="change-strip"><header><div><span>OBSERVED MOVEMENTS</span><h2>確認済みの動き</h2><p>「状態が変わった」と断定できるプロフィール差分がある場合だけ差分を表示し、それ以外は今回確認として扱います。</p></div><button data-jump="ledger">全履歴を見る →</button></header>${items.length?`<ol>${items.map((signal,index)=>`<li><b>${String(index+1).padStart(2,'0')}</b><span class="importance ${esc(signal.importance)}">${esc(signal.importance)}</span><button data-signal="${esc(signal.id)}"><strong>${esc(signal.entity?.name||signal.entity_id)}</strong><em>${esc(shortLabel(signal.title,62))}</em></button><small>${esc(signal.change?.delta||'今回確認')} · ${esc(signal.source?.publisher||'一次情報')}</small></li>`).join('')}</ol>`:'<div class="empty-inline"><b>確認済みの動きはありません</b></div>'}</section>`;
}
function renderCapabilityStrip(){
  const matrix=matrixFor('consulting'),ids=['pwc-consulting','deloitte-tohmatsu','mckinsey','bcg','bain','accenture'];
  const list=ids.map(id=>state.data.entities.find(entity=>entity.id===id)).filter(Boolean);
  return `<section class="capability-strip"><header><div><span>CONSULTING CAPABILITY SNAPSHOT</span><h2>コンサル各社の現在地</h2><p>自社活用・顧客向け提供・実装定着など、根拠で確認できた状態を6軸で比較します。これは優劣スコアではありません。</p></div><button data-jump="consulting">詳細マップ →</button></header><div class="capability-legend">${matrix.dimensions.map(item=>`<span>${esc(item.label)}</span>`).join('')}</div><div class="capability-rows">${list.map(entity=>`<button class="capability-row" data-entity="${esc(entity.id)}"><strong>${esc(entity.name)}</strong><small>${esc(entity.segment||'')}</small><div>${matrix.dimensions.map(dimension=>{const value=profileState(entity,dimension.id);return `<i class="${value}" title="${esc(`${dimension.label}: ${stateDefinition(value).label}`)}">${stateGlyph[value]}</i>`;}).join('')}</div></button>`).join('')}</div><footer><span>未</span>未確認　<span>確</span>確認あり　<span>継</span>継続展開　<span>本</span>本格展開</footer></section>`;
}
const activityColumns=[
  {id:'compute',label:'算力・半導体',note:'計算資源・チップ'},
  {id:'models',label:'基盤モデル',note:'モデル・研究'},
  {id:'platform',label:'クラウド・データ',note:'クラウド・業務基盤'},
  {id:'apps',label:'AIアプリ',note:'アプリ・エージェント'},
  {id:'industry',label:'企業導入',note:'事業会社の利活用'},
  {id:'delivery',label:'コンサル・実装',note:'構想・定着'}
];
function activityLayer(signal){
  const entity=signal.entity||state.data.entities.find(item=>item.id===signal.entity_id)||{};
  if(entity.group_id==='consulting')return 'delivery';
  if(entity.group_id==='enterprises')return 'industry';
  if(['global-saas','japan-saas'].includes(entity.group_id))return 'platform';
  if(/半導体|ハード|GPU|compute/i.test(`${entity.segment||''} ${entity.name||''}`))return 'compute';
  if(/モデル開発|研究/i.test(entity.segment||''))return 'models';
  if(/ビッグテック|クラウド|インフラ/i.test(entity.segment||''))return 'platform';
  return 'apps';
}
function periodCompanyRows(window){
  const byEntity=new Map();
  for(const signal of window.current){const row=byEntity.get(signal.entity_id)||{entity:signal.entity,signals:[]};row.signals.push(signal);byEntity.set(signal.entity_id,row);}
  const weight={critical:3,high:2,medium:1,low:0};
  return [...byEntity.values()].sort((a,b)=>{const ai=Math.max(...a.signals.map(item=>weight[item.importance]||0)),bi=Math.max(...b.signals.map(item=>weight[item.importance]||0));return bi-ai||b.signals.length-a.signals.length||String(b.signals[0]?.published_at).localeCompare(String(a.signals[0]?.published_at));});
}
function renderActivityMatrix(window){
  const rows=periodCompanyRows(window).slice(0,14);
  return `<section class="activity-matrix-panel"><header><div><span>PERIOD ACTIVITY MATRIX</span><h2>企業 × AI市場レイヤー</h2><p>横軸はAIの役割、縦軸は期間内に公式更新を確認した企業です。点を押すと、その更新の根拠を開きます。</p></div><div class="activity-matrix-key"><b>●</b><span>確認済み更新</span><i>未確認</i></div></header>${rows.length?`<div class="activity-matrix-scroll"><table class="activity-matrix"><thead><tr><th>企業</th>${activityColumns.map(column=>`<th><b>${esc(column.label)}</b><small>${esc(column.note)}</small></th>`).join('')}</tr></thead><tbody>${rows.map(row=>{const latest=row.signals.slice().sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)))[0];return `<tr><th><button data-entity="${esc(row.entity?.id||'')}"><strong>${esc(row.entity?.name||row.signals[0]?.entity_id||'')}</strong><small>${esc(row.entity?.segment||row.entity?.group_label||'')} · ${row.signals.length}件</small></button></th>${activityColumns.map(column=>{const matches=row.signals.filter(signal=>activityLayer(signal)===column.id),last=matches.slice().sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)))[0];return `<td>${matches.length?`<button class="activity-dot" data-signal="${esc(last.id)}" title="${esc(`${column.label}・${matches.length}件`)}"><b>●</b><span>${matches.length}</span></button>`:'<span class="activity-empty">·</span>'}</td>`;}).join('')}</tr>`;}).join('')}</tbody></table></div>`:'<div class="empty-inline"><b>この期間に確認済みの更新はありません</b><p>一次情報が追加されるとマトリクスに表示します。</p></div>'}<footer>点の数は市場シェアではなく、選択期間に登録された確認済み更新の件数です。企業名を押すとプロフィールを確認できます。</footer></section>`;
}
function renderReadout(window){
  const totals=activityColumns.map(column=>({column,count:window.current.filter(signal=>activityLayer(signal)===column.id).length})).sort((a,b)=>b.count-a.count);
  const multi=periodCompanyRows(window).filter(row=>row.signals.length>1).length;
  return `<section class="readout-band"><article><span>最多の観測層</span><b>${totals[0]?.count?esc(totals[0].column.label):'未確認'}</b><small>${totals[0]?.count||0}件 · ${esc(window.definition.label)}</small></article><article><span>複数更新の企業</span><b>${multi}社</b><small>同じ期間に2件以上の確認</small></article><article><span>読む順番</span><b>点 → 根拠 → 示唆</b><small>件数で優劣を判断しない</small></article></section>`;
}
const playerGroups=[
  {id:'consulting',label:'コンサル'},
  {id:'enterprises',label:'日本企業'},
  {id:'startups',label:'スタートアップ・新興'},
  {id:'saas',label:'SaaS'},
  {id:'ai-companies',label:'AI企業'}
];
function playerGroupId(signal){
  const group=signal.entity?.group_id;
  if(group==='global-saas'||group==='japan-saas')return 'saas';
  return playerGroups.some(item=>item.id===group)?group:'ai-companies';
}
function renderPlayerUpdates(window){
  const updates=window.current.slice().sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)));
  const selected=state.playerGroup==='all'?updates:updates.filter(signal=>playerGroupId(signal)===state.playerGroup);
  const totalCompanies=new Set(updates.map(signal=>signal.entity_id)).size;
  return `<section class="player-movements"><header><div><span>PLAYER MOVEMENTS / ${esc(window.definition.label)}</span><h2>${esc(window.definition.label)}のプレイヤー動向</h2><p>選択期間に公式発表・公式事例で確認できた更新を、プレイヤー種別で束ねています。企業プロフィールの能力マップとは別の「期間内イベント」です。</p></div><div class="player-total"><b>${updates.length}</b><small>確認済み更新 · ${totalCompanies}社</small></div></header><div class="player-group-band"><button class="${state.playerGroup==='all'?'active':''}" data-player-group="all"><span>すべて</span><b>${updates.length}</b><small>${totalCompanies}社</small></button>${playerGroups.map(group=>{const items=updates.filter(signal=>playerGroupId(signal)===group.id);return `<button class="${state.playerGroup===group.id?'active':''}" data-player-group="${group.id}"><span>${esc(group.label)}</span><b>${items.length}</b><small>${new Set(items.map(signal=>signal.entity_id)).size}社</small></button>`;}).join('')}</div>${selected.length?`<div class="player-update-list">${selected.slice(0,10).map(signal=>{const group=playerGroups.find(item=>item.id===playerGroupId(signal));return `<button data-signal="${esc(signal.id)}"><time>${esc(signal.published_at)}</time><span>${esc(group?.label||'AI企業')}</span><strong>${esc(signal.entity?.name||signal.entity_id)}</strong><b>${esc(shortLabel(signal.title,72))}</b><small>${esc(signal.category)} · ${esc(signal.source?.publisher||'一次情報')}</small></button>`;}).join('')}</div>`:'<div class="empty-inline"><b>${esc(window.definition.label)}に該当する更新は未確認です</b><p>公式根拠が追加されると、このプレイヤー動向に表示します。</p></div>'}<footer>表示対象は選択期間内の確認済み一次情報です。件数は企業の優劣や市場シェアではありません。</footer></section>`;
}
function renderPeriodScopePanel(){
  return `<section class="period-scope-panel"><div><span>WINDOW CONTROL</span><h2>市場状況の更新期間</h2><p>下のAIレイヤーマトリクス、読み取り、コンサル更新にだけ適用します。関係マップの期間は関係マップ内で別に選択します。</p></div>${periodRail(['week','month','quarter','year'],state.periodScope,'market')}</section>`;
}
function renderThemeSummary(){
  const window=periodWindow();
  const companies=new Set(window.current.map(signal=>signal.entity_id).filter(Boolean)).size;
  return `<div class="theme-summary observatory-shell"><section class="observatory-hero"><div><span>AI MARKET MOVEMENTS</span><h2>AI市場の動きを確認する</h2><p>選択した期間に、どの企業がAI市場のどの層で更新したかを比較します。</p></div></section><div class="observatory-meta"><span>${esc(window.definition.label)} · 基準日 ${esc(window.reference)}</span><b>${window.current.length}件の更新</b><b>${companies}社が関与</b><em>一次情報のみ</em></div>${renderPeriodScopePanel()}${renderReadout(window)}${renderActivityMatrix(window)}${renderPlayerUpdates(window)}</div>`;
}

function relationshipEdges(graph,relationType){
  let edges=graph.edges.filter(edge=>edge.relation_type===relationType);
  if(relationType==='changed-in'){
    const signalIds=new Set(periodWindow(state.graphPeriodScope).current.map(signal=>signal.id));
    edges=edges.filter(edge=>(edge.evidence_ids||[]).some(id=>signalIds.has(id)));
  }else edges=edges.filter(edge=>edge.evidence_scope!=='unverified');
  return edges;
}

function renderRelationships(){
  const graph=state.data.knowledge_graph,trends=state.data.trends;
  const offerCounts=relationEvidenceCounts(graph,'offers'),partnerCounts=relationEvidenceCounts(graph,'partners-with');
  const tabs=[['changes','状況'],['offers','顧客向け提供'],['partners','外部提携']];
  const pane=state.relationshipTab==='offers'?renderRelationCatalog('offers'):state.relationshipTab==='partners'?renderRelationCatalog('partners-with'):renderThemeSummary(trends);
  const periodGraph=state.graphFilter==='changed-in';
  const graphControl=periodGraph?`<div class="graph-period-control"><div><span>RELATIONSHIP WINDOW</span><b>関係マップの更新期間</b><small>企業×変化テーマだけに適用します。</small></div>${periodRail(['week','month','quarter','year'],state.graphPeriodScope,'graph')}</div>`:'<div class="graph-static-note"><span>BASELINE RELATIONSHIPS</span><b>基礎関係</b><small>顧客向け提供・外部提携は、プロフィール根拠に基づく全期間の基礎情報です。</small></div>';
  return `${state.relationshipTab==='changes'?'':`<section class="relationship-context"><span>DETAILED VIEW</span><h2>${state.relationshipTab==='offers'?'顧客向け提供':'外部提携'}を確認する</h2><p>企業を選ぶと、提供内容・関係先・公式根拠を詳細で確認できます。</p></section>`}<nav class="relationship-tabs" aria-label="AI市場の見方">${tabs.map(([id,label])=>`<button class="relationship-tab ${state.relationshipTab===id?'active':''}" data-relationship-tab="${id}">${label}</button>`).join('')}</nav>${pane}<section class="graph-panel relationship-explorer"><div class="graph-panel-inner"><header><div><span>関係マップ</span><h2>AI市場の関係を俯瞰する</h2><p>全体の構造を一画面で確認し、必要な企業・更新だけをクリックして詳細を開きます。</p></div><div class="graph-filters">${[['changed-in','企業×変化テーマ'],['offers','企業×提供'],['partners-with','企業×提携']].map(([id,label])=>`<button class="${state.graphFilter===id?'active':''}" data-graph-filter="${id}">${label} <b>${relationshipEdges(graph,id).length}</b></button>`).join('')}</div></header>${graphControl}${renderNetworkGraph(graph,state.graphFilter)}<footer>${esc(graph.caveat)} 代表12件を表示。企業×変化テーマは選択期間に連動し、顧客向け提供・外部提携は基礎関係として表示します。提供の個別根拠 ${offerCounts.item}件、提携の個別根拠 ${partnerCounts.item}件。</footer></div></section>`;
}

function renderNetworkGraph(graph,relationType){
  const nodeMap=new Map(graph.nodes.map(node=>[node.id,node]));const edges=relationshipEdges(graph,relationType);
  if(!edges.length)return '<div class="empty-inline"><b>確認済みの関係はまだありません</b><p>基準情報の取込後に自動表示されます。</p></div>';
  // The graph is an overview, not a second ledger. Keep the highest-evidence
  // relationships visible at once; full records remain in the tabs and drawers.
  const limited=edges.slice().sort((a,b)=>(b.evidence_count||0)-(a.evidence_count||0)||String(a.id).localeCompare(String(b.id))).slice(0,12);
  if(!limited.length)return '<div class="empty-inline"><b>個別またはプロフィール根拠がある関係はまだありません</b><p>根拠待ちの候補は一覧で確認できます。</p></div>';
  const companies=[...new Map(limited.map(edge=>{const node=nodeMap.get(edge.from);return [node.id,node];})).values()].sort((a,b)=>a.label.localeCompare(b.label,'ja'));
  const targets=[...new Map(limited.map(edge=>{const node=nodeMap.get(edge.to);return [node.id,node];})).values()].sort((a,b)=>(b.evidence_count||0)-(a.evidence_count||0)||a.label.localeCompare(b.label,'ja'));
  const width=1120,row=40,pad=24,height=Math.max(360,Math.max(companies.length,targets.length)*row+pad*2);const leftX=38,rightX=772,nodeWidth=310;
  const position=(items,index)=>pad+(height-pad*2)*(items.length===1?.5:index/(items.length-1));
  const companyY=new Map(companies.map((node,index)=>[node.id,position(companies,index)]));const targetY=new Map(targets.map((node,index)=>[node.id,position(targets,index)]));
  const edgeSvg=limited.map(edge=>{const y1=companyY.get(edge.from),y2=targetY.get(edge.to);const weight=Math.min(4,1+edge.evidence_count*.55);const evidenceLabel=edge.evidence_scope==='item'?'個別根拠':edge.evidence_scope==='profile'?'プロフィール根拠':'根拠待ち';return `<path class="graph-edge ${esc(edge.relation_type)} ${esc(edge.evidence_scope)}" d="M ${leftX+nodeWidth} ${y1} C 555 ${y1}, 565 ${y2}, ${rightX} ${y2}" style="stroke-width:${weight}" aria-label="${esc(edge.label)}・${evidenceLabel}"><title>${esc(`${edge.label} / ${evidenceLabel}${edge.evidence_count?` ${edge.evidence_count}件`:''}`)}</title></path>`;}).join('');
  const companySvg=companies.map(node=>{const y=companyY.get(node.id);return `<g class="graph-node company" data-entity="${esc(node.entity_id)}" transform="translate(${leftX} ${y-17})" tabindex="0" role="button"><rect width="${nodeWidth}" height="34"></rect><text x="13" y="14">${esc(shortLabel(node.label,34))}</text><text class="sub" x="13" y="27">${esc(shortLabel(node.group_label,35))} · ${node.evidence_count?'個別根拠 '+node.evidence_count+'件':'プロフィール根拠'}</text></g>`;}).join('');
  const targetSvg=targets.map(node=>{const y=targetY.get(node.id);return `<g class="graph-node target ${esc(node.object_type)}" transform="translate(${rightX} ${y-17})"><rect width="${nodeWidth}" height="34"></rect><text x="13" y="14">${esc(shortLabel(node.label,36))}</text><text class="sub" x="13" y="27">${esc(node.object_type)} · ${node.evidence_count?'個別根拠 '+node.evidence_count+'件':'プロフィール根拠'}</text><title>${esc(node.label)}</title></g>`;}).join('');
  return `<div class="graph-canvas"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="企業と${esc(relationType)}の関係マップ">${edgeSvg}${companySvg}${targetSvg}</svg></div>`;
}

function renderTrendPanel(trends){
  const themes=trends.momentum_themes||[];
  const max=Math.max(1,...themes.map(item=>item.recent_90_days||0));
  return `<section class="trend-panel"><header><div><span>テーマ別モメンタム</span><h2>どのAIテーマが動いているか</h2><p>${esc(trends.note)}</p></div><div class="trend-readiness"><b>${esc(trends.reference_date||'--')}</b><span>基準日</span></div></header>${themes.length?`<div class="momentum-board">${themes.map(item=>`<article class="${esc(item.momentum)}"><div><span>${esc(item.category)}</span><b>${esc(item.momentum)}</b></div><i><b style="width:${Math.max(6,(item.recent_90_days||0)/max*100)}%"></b></i><dl><div><dt>直近90日</dt><dd>${item.recent_90_days}件</dd></div><div><dt>前90日</dt><dd>${item.previous_90_days}件</dd></div><div><dt>1年内</dt><dd>${item.recent_365_days}件</dd></div><div><dt>関与企業</dt><dd>${item.companies}社</dd></div></dl><p><small>最新:</small> ${esc(item.latest_at||'--')} · ${esc(shortLabel(item.latest_title,54))}</p></article>`).join('')}</div>`:'<div class="empty-inline"><b>モメンタムを計算できる確認済み情報がありません</b><p>週次更新またはベースライン取り込み後に表示します。</p></div>'}<footer>「加速」「継続」「新規・再浮上」は登録済み公式更新の直近90日と前90日の比較です。市場規模、導入率、企業評価ではありません。</footer></section>`;
}

function renderInsights(){
  const insights=state.data.insights||[];
  return `<section class="category-intro insight-intro"><div><span>DETERMINISTIC INSIGHT ENGINE</span><h2>変化を、会議で使える問いに変える</h2><p>同一期間に複数社・複数の一次情報が集まったパターンだけを抽出します。自由生成による予測ではありません。</p></div><dl><div><dt>観測パターン</dt><dd>${insights.length}</dd></div><div><dt>高確度</dt><dd>${insights.filter(item=>item.confidence==='high').length}</dd></div></dl></section>
  <section class="insight-method"><b>出力契約</b><span>結論</span><span>公式根拠</span><span>反証・制約</span><span>自社への示唆</span><span>次回観測</span></section>
  ${insights.length?`<div class="insight-grid">${insights.map((item,index)=>`<article><header><span>${String(index+1).padStart(2,'0')} · ${esc(item.type)}</span><b class="confidence ${esc(item.confidence)}">${item.confidence==='high'?'高確度':'中確度'}</b></header><h2>${esc(item.title)}</h2><p class="insight-conclusion">${esc(item.conclusion)}</p><dl><div><dt>根拠</dt><dd>${item.evidence_count}件 / ${item.source_count}情報源 / ${item.entity_ids.length}社</dd></div><div><dt>制約</dt><dd>${esc(item.counterevidence)}</dd></div><div><dt>示唆</dt><dd>${esc(item.implication)}</dd></div></dl><button data-insight="${esc(item.id)}">根拠と次回観測を見る →</button></article>`).join('')}</div>`:'<section class="empty-panel"><h2>複数社で確認できたパターンはまだありません</h2><p>週次更新が蓄積されると自動生成されます。</p></section>'}`;
}

function renderLedgerPage(signals){
  let filtered=signals;
  return `<section class="category-intro"><div><span>Evidence-backed changes</span><h2>ニュースを更新履歴として残す</h2><p>毎週拾った確認済み情報を、企業プロフィールに積み上がる差分ログとして保存します。ニュース閲覧はダイジェスト、長期比較はこの更新履歴で見ます。</p></div><dl><div><dt>確認済み更新</dt><dd>${filtered.length}</dd></div><div><dt>一次情報</dt><dd>${filtered.filter(item=>item.source?.tier==='primary').length}</dd></div></dl></section><section class="ledger-board standalone"><header><div><span>更新履歴</span><h2>${esc(state.data.brief.period?.label||'全期間')}</h2></div><button data-method>定義を見る</button></header>${renderLedgerTable(filtered)}</section>`;
}

function renderLedgerTable(signals){
  if(!signals.length)return '<div class="empty-inline"><b>該当する変更はありません</b><p>検索条件を変更してください。</p></div>';
  return `<div class="table-scroll"><table class="change-ledger"><thead><tr><th>番号</th><th>重要度</th><th>企業</th><th>更新内容</th><th>分類</th><th>前回との差分</th><th>根拠</th></tr></thead><tbody>${signals.map((signal,index)=>`<tr><td>${String(index+1).padStart(2,'0')}</td><td><span class="importance ${esc(signal.importance)}">${esc(signal.importance)}</span></td><td><button data-entity="${esc(signal.entity_id)}">${esc(signal.entity?.name||signal.entity_id)}</button></td><td><button class="ledger-title" data-signal="${esc(signal.id)}">${esc(signal.title)}</button></td><td>${esc(signal.category)}</td><td>${esc(signal.change?.delta||'初回基準へ追加')}</td><td><a href="${safeUrl(signal.source.url)}" target="_blank" rel="noreferrer">${esc(signal.source.publisher)} ↗</a></td></tr>`).join('')}</tbody></table></div>`;
}

function renderCategory(ids,description){
  const baseList=entities(ids);let list=baseList,signals=signalsFor(ids);
  if(ids.length===1&&ids[0]==='consulting'&&state.companyFilter!=='all'){list=list.filter(entity=>matchesConsultingFilter(entity,state.companyFilter));const allowed=new Set(list.map(entity=>entity.id));signals=signals.filter(signal=>allowed.has(signal.entity_id));}
  if(ids.length===1&&ids[0]==='ai-companies'){if(state.aiTypeFilter!=='all')list=list.filter(entity=>entity.segment===state.aiTypeFilter);if(state.aiRegionFilter!=='all')list=list.filter(entity=>entity.region_tag===state.aiRegionFilter);const allowed=new Set(list.map(entity=>entity.id));signals=signals.filter(signal=>allowed.has(signal.entity_id));}
  const matrixId=ids.length>1?'global-saas':ids[0];const matrix=matrixFor(matrixId);const started=list.filter(entity=>entity.profile).length;const historyTotal=list.reduce((sum,entity)=>sum+evidenceCount(entity),0);
  const enterpriseIndustry=ids.includes('enterprises')?renderIndustryMatrix(list,matrix):'';
  const companyFilterStrip=ids.length===1&&ids[0]==='consulting'?renderConsultingFilterStrip(baseList):(ids.length===1&&ids[0]==='ai-companies'?renderAiFilterStrip(baseList):'');
  return `<section class="category-intro"><div><span>3-5 YEAR COMPANY BASELINE</span><h2>${esc(viewMeta[state.view][1])}</h2><p>${esc(description)}</p></div><dl><div><dt>監視企業</dt><dd>${list.length}</dd></div><div><dt>基礎情報あり</dt><dd>${started}</dd></div><div><dt>確認履歴</dt><dd>${historyTotal}</dd></div></dl></section>
  <section class="method-strip"><div><b>セルの意味</b>${state.data.intelligence.evidence_states.map(item=>`<span class="matrix-key ${item.id}">${stateGlyph[item.id]} ${esc(item.label)}</span>`).join('')}<em>数字ではなく、公式根拠で確認できた状態です</em></div><button data-method>判定方法・注意点</button></section>
  ${companyFilterStrip}
  ${enterpriseIndustry}
  <section class="matrix-panel"><header><div><span>企業比較</span><h2>${esc(matrix.label)}</h2></div><p>企業名をクリックすると、現在位置・履歴・公式根拠を表示します。</p></header>${renderEntityMatrix(list,matrix)}</section>
  <section class="ledger-board"><header><div><span>この領域の更新履歴</span><h2>確認済みの更新</h2></div><b>${signals.length}件</b></header>${renderLedgerTable(signals)}</section>`;
}

function renderConsultingFilterStrip(list){
  const filters=consultingFilters();
  return `<section class="company-filter-strip"><header><span>コンサル分類</span><h2>戦コン・Big4・DX系で切り替える</h2><p>分類は監視リストのセグメントと主要カテゴリを使っています。</p></header><div>${filters.map(filter=>{const count=list.filter(entity=>filter.test(entity)).length;return `<button class="${state.companyFilter===filter.id?'active':''}" data-company-filter="${esc(filter.id)}"><span>${esc(filter.label)}</span><b>${count}</b></button>`;}).join('')}</div></section>`;
}

function renderAiFilterStrip(list){
  const typeFilters=valueFilters(list,'segment'),regionFilters=valueFilters(list,'region_tag');
  return `<section class="company-filter-strip ai-filter-strip"><header><span>AI企業分類</span><h2>種類と地域で切り替える</h2><p>企業タイプと地域は別軸です。市場評価ではなく、観測範囲を絞るためのタグです。</p></header><div class="filter-row"><strong>種類</strong>${typeFilters.map(filter=>{const count=list.filter(entity=>filter.id==='all'||entity.segment===filter.id).length;return `<button class="${state.aiTypeFilter===filter.id?'active':''}" data-ai-type-filter="${esc(filter.id)}"><span>${esc(filter.label)}</span><b>${count}</b></button>`;}).join('')}</div><div class="filter-row"><strong>地域</strong>${regionFilters.map(filter=>{const count=list.filter(entity=>filter.id==='all'||entity.region_tag===filter.id).length;return `<button class="${state.aiRegionFilter===filter.id?'active':''}" data-ai-region-filter="${esc(filter.id)}"><span>${esc(filter.label)}</span><b>${count}</b></button>`;}).join('')}</div></section>`;
}

function renderEntityMatrix(list,matrix){
  if(!list.length)return '<div class="empty-inline"><b>該当する企業がありません</b><p>検索条件を変更してください。</p></div>';
  return `<div class="table-scroll matrix-scroll"><table class="entity-matrix"><thead><tr><th>企業 / 現在地</th>${matrix.dimensions.map(item=>`<th>${esc(item.label)}</th>`).join('')}</tr></thead><tbody>${list.map(entity=>`<tr><th><button data-entity="${esc(entity.id)}"><b>${esc(entity.name)}</b><span>${esc(entity.profile?.current_position||watchLabel(entity))}</span><small>${esc(watchLabel(entity))} · 確認履歴 ${evidenceCount(entity)}件</small></button></th>${matrix.dimensions.map(dimension=>{const value=profileState(entity,dimension.id),definition=stateDefinition(value);return `<td><button class="matrix-cell ${value}" data-entity="${esc(entity.id)}" title="${esc(`${dimension.label}: ${definition.label}。${definition.definition}`)}"><b>${stateGlyph[value]}</b><span>${esc(definition.label)}</span></button></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderIndustryMatrix(list,matrix){
  const segments=Object.entries(list.reduce((result,entity)=>{const key=entity.segment||'未分類';(result[key]||=[]).push(entity);return result;},{}));
  const dimensions=matrix.dimensions.filter(item=>['enterprise-ai','proprietary-ai','manufacturing-rd','customer-ai','organization'].includes(item.id));
  const order=['unknown','observed','active','scaled'];
  return `<section class="matrix-panel industry"><header><div><span>業界別AI導入状況</span><h2>調査済み企業から見える現在地</h2></div><p>業界全体の導入率ではありません。各業界で基礎情報を確認できた企業の最も進んだ状態です。</p></header><div class="table-scroll"><table class="industry-matrix"><thead><tr><th>業界 / 調査カバレッジ</th>${dimensions.map(item=>`<th>${esc(item.label)}</th>`).join('')}</tr></thead><tbody>${segments.map(([segment,members])=>{const profiled=members.filter(item=>item.profile).length;return `<tr><th>${esc(segment)}<span>${profiled} / ${members.length}社</span></th>${dimensions.map(dimension=>{const values=members.map(entity=>profileState(entity,dimension.id));const value=values.sort((a,b)=>order.indexOf(b)-order.indexOf(a))[0]||'unknown';return `<td><span class="industry-cell ${value}" title="調査済み企業の最上位確認状態">${stateGlyph[value]} ${esc(stateDefinition(value).label)}</span></td>`;}).join('')}</tr>`;}).join('')}</tbody></table></div></section>`;
}

function renderArchive(){
  const months=state.data.archive||[];
  return `<section class="category-intro"><div><span>月次の蓄積</span><h2>変化を時系列で残す</h2><p>毎週の変更を月単位で保存し、企業プロフィールの履歴へ接続します。</p></div><dl><div><dt>保存月</dt><dd>${months.length}</dd></div></dl></section>${months.length?`<div class="archive-list">${months.map(month=>`<article><time>${esc(month.month)}</time><div><h3>${esc(month.headline)}</h3><p>${esc(month.label)}</p></div><b>${month.signal_count}件</b></article>`).join('')}</div>`:'<section class="empty-panel"><h2>月次記録はまだありません</h2></section>'}`;
}

function renderSettings(){
  const d=state.data,source=d.sources,coverage=d.profile_coverage,portability=d.capabilities.portability||{};
  return `<section class="baseline-status"><div><span>3〜5年ベースライン</span><h2>${coverage.profiles_started||0} / ${coverage.total_entities||d.metrics.watched}社を着手</h2><p>${esc(coverage.note||'企業プロフィールを調査中です。')}</p></div><dl><div><dt>完了</dt><dd>${coverage.profiles_complete||0}</dd></div><div><dt>期間</dt><dd>${esc(d.intelligence.baseline_window.start)}<br>${esc(d.intelligence.baseline_window.end)}</dd></div></dl></section>
  <section class="capability-panel"><header><span>横展開</span><h2>スキル名ではなく、調査能力で接続する</h2><p>${esc(d.capabilities.principle)}</p></header><div class="capability-grid">${d.capabilities.capabilities.map(item=>`<article><span>${esc(item.id)}</span><h3>${esc(item.purpose)}</h3><p><b>優先:</b> ${esc(item.preferred_skills.join(' / '))}</p><p><b>代替:</b> ${esc(item.fallback)}</p></article>`).join('')}</div><footer><b>Codex</b> ${esc(portability.codex_entry||'')}<br><b>Claude Code</b> ${esc(portability.claude_entry||'')}</footer></section>
  <section class="settings-grid"><div class="source-governance"><header><span>情報源のルール</span><h2>発見と確認を分ける</h2></header><div class="policy-row"><b>確認済み</b><p>${esc(source.policy.confirmed)}</p></div><div class="policy-row"><b>発見用</b><p>${esc(source.policy.discovery)}</p></div><div class="source-list">${source.sources.map(item=>`<article><div><b>${esc(item.name)}</b><span>${esc(item.role)}</span></div><p>${esc(item.note)}</p><span class="source-state">${esc(item.state)}</span>${item.url?`<a href="${safeUrl(item.url)}" target="_blank" rel="noreferrer">開く ↗</a>`:''}</article>`).join('')}</div></div><form id="add-entity-form" class="add-entity-form"><header><span>監視対象を追加</span><h2>企業を追加する</h2><p>追加後はベースライン調査対象にも入ります。</p></header><label><span>企業名</span><input name="name" required minlength="2"></label><label><span>地域</span><select name="region"><option>Japan</option><option>Global</option></select></label><label><span>分類</span><input name="segment" placeholder="例：AIコンサル"></label><label><span>公式URL</span><input name="official_url" type="url" placeholder="https://example.com/news"></label><button type="submit">監視対象に追加</button></form></section>`;
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
  return `<div class="evidence-radar"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(entity.name)}の定性的なAI活動レーダー">${rings}${axes}<polygon class="radar-shape" points="${polygon}"></polygon>${dots}</svg><div class="radar-legend"><span>中心 未確認</span><span>1 確認あり</span><span>2 継続展開</span><span>3 本格展開</span></div></div>`;
}

function openEntity(id){
  const entity=state.data.entities.find(item=>item.id===id);if(!entity)return;const profile=entity.profile,related=state.data.signals.filter(signal=>signal.entity_id===id);const matrix=matrixFor(entity.group_id);const history=[...(profile?.history||[]).map(item=>({...item,kind:'history'})),...related.map(signal=>({date:signal.published_at,title:signal.title,summary:signal.summary,source:signal.source,signal_id:signal.id,kind:'signal'}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const sources=[...new Map(history.filter(item=>item.source?.url).map(item=>[item.source.url,item.source])).values()];
  showDrawer(`<section class="profile-head"><span class="drawer-kicker">${esc(entity.group_label)} / ${esc(entity.segment||'未分類')}${entity.region_tag?` / ${esc(entity.region_tag)}`:''}</span><h2>${esc(entity.name)}</h2><p>${esc(profile?.current_position||'ベースラインはまだ調査されていません。企業名だけを現在地として扱わず、一次情報を確認するまで未確認で表示します。')}</p><div class="profile-status"><span>${profile?.status==='complete'?'基準調査完了':profile?'部分確認':'調査待ち'}</span><b>${esc(maturityLabel(profile?.maturity_stage||'unknown'))}</b><small>${esc(watchLabel(entity))}</small></div></section>
  <section class="profile-matrix"><h3>AI現在地</h3><div>${matrix.dimensions.map(dimension=>{const value=profileState(entity,dimension.id);return `<span class="matrix-key ${value}">${stateGlyph[value]} ${esc(dimension.label)} · ${esc(stateDefinition(value).label)}</span>`;}).join('')}</div></section>
  <section class="profile-radar"><div><span>EVIDENCE PROFILE</span><h3>AI活動の形</h3><p>定性的な確認状態を可視化したもので、企業評価や総合点ではありません。</p></div>${renderEvidenceRadar(entity,matrix)}<aside><b>${sources.length}</b><span>公式根拠</span><b>${related.length+(profile?.history?.length||0)}</b><span>確認済み履歴</span><small>${profile?.status==='complete'?'基準窓の確認完了':profile?'部分確認のため比較には使用しない':'調査待ちのため比較には使用しない'}</small></aside></section>
  <section class="profile-columns"><article><span>企業情報</span><h3>AIの現在地</h3><dl><dt>導入段階</dt><dd>${esc(maturityLabel(profile?.maturity_stage||'unknown'))}</dd><dt>開発方法</dt><dd>${profile?.development_methods?.length?profile.development_methods.map(method=>esc(methodLabel(method))).join(' / '):'未確認'}</dd></dl>${profileScopeBlock(profile)}<h4>自社AI活用</h4>${listOrUnknown(profile?.internal_use)}<h4>外部向けオファリング</h4>${listOrUnknown(profile?.offerings)}<h4>外部連携</h4>${listOrUnknown(profile?.partnerships)}${profile?.reusable_assets?.length?`<h4>共通資産・製品化</h4>${listOrUnknown(profile.reusable_assets)}`:''}${profile?.talent_org?.length?`<h4>AI人材・組織</h4>${listOrUnknown(profile.talent_org)}`:''}</article><article><span>12か月・3〜5年の更新履歴</span><h3>${history.length}件の確認済み履歴</h3>${history.length?`<div class="profile-timeline">${history.map(item=>`<button ${item.signal_id?`data-signal="${esc(item.signal_id)}"`:''}><time>${esc(item.date)}</time><b>${esc(item.title)}</b><p>${esc(item.summary)}</p></button>`).join('')}</div>`:'<p class="unknown-copy">一次情報のバックフィル待ちです。</p>'}</article><article><span>公式根拠</span><h3>${sources.length}件</h3>${sources.length?sources.map(source=>`<a class="profile-source" href="${safeUrl(source.url)}" target="_blank" rel="noreferrer"><b>${esc(source.publisher)}</b><small>${esc(source.title||source.url)}</small></a>`).join(''):'<p class="unknown-copy">根拠資料はまだ登録されていません。</p>'}<p class="evidence-note">ヒートマップはこの根拠に基づく定性的な現在地です。ニュース件数や検索件数によるランキングではありません。</p></article></section>`,'profile');
}
function profileScopeBlock(profile){
  const scope=profile?.research_scope;
  if(!Array.isArray(scope)||!scope.length)return '';
  return `<h4>調査範囲</h4><ul>${scope.map(item=>`<li><b>${esc(item.scope)}</b> ${esc(item.focus)}</li>`).join('')}</ul>`;
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
  showDrawer(`<span class="drawer-kicker">METHOD / DEFINITIONS</span><h2>ヒートマップと記号の判定方法</h2><section class="drawer-section"><p>各セルは市場シェアや優劣ではなく、一次情報で確認できた活動の状態です。ニュース件数、検索結果数、言及数は色付けに使いません。</p>${state.data.intelligence.evidence_states.map(item=>`<div class="method-row"><span class="matrix-key ${item.id}">${stateGlyph[item.id]} ${esc(item.label)}</span><p>${esc(item.definition)}</p></div>`).join('')}</section><section class="drawer-section"><h3>導入段階</h3><p>${state.data.intelligence.maturity_stages.map(item=>esc(item.label)).join(' → ')}</p></section><section class="drawer-section emphasis"><h3>誤読しないために</h3><p>未確認は「取り組みがない」という意味ではありません。現時点で登録済みの一次情報がないという意味です。行頭の確認履歴件数は登録済み根拠の数で、強さや市場評価ではありません。</p></section>`);
}
function showDrawer(html,mode='signal'){html=html.replaceAll('AIの現在地','AI活用・提供状況').replaceAll('AI現在地','AI活用・提供状況');$('#drawer-content').innerHTML=html;$('#detail-drawer').classList.toggle('profile',mode==='profile');$('#drawer-backdrop').hidden=false;$('#detail-drawer').classList.add('open');$('#detail-drawer').setAttribute('aria-hidden','false');$('#drawer-close').focus();}
function closeDrawer(){$('#detail-drawer').classList.remove('open','profile');$('#detail-drawer').setAttribute('aria-hidden','true');$('#drawer-backdrop').hidden=true;}

init();
