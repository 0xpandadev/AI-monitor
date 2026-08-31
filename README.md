# AI Opportunity Monitor

AI企業、コンサルティング会社、日本の大手事業会社、AIスタートアップ・新興企業、国内外SaaSの動きを、戦略・市場調査向けに週次で整理するローカル定点観測ボードです。

週次調査は二段構成です。まずAIhotの観点で直近7日間のモデル、製品・エージェント、企業活用、研究、実装方法、市場・制度論点を広く確認します。次に企業別ウォッチリスト181社を毎週すべて一巡し、公式ニュース、IR、製品ページ、導入事例の更新有無を確認します。詳細な調査定義は`config/weekly-research.json`にあります。

この週次差分とは別に、2023年9月から2026年8月までの企業別ベースラインを蓄積します。会社名を並べるだけではなく、現在位置、社内活用、外部オファリング、提携、導入段階、開発方法、変更履歴、一次情報を1プロフィールにまとめます。未調査のセルは「取り組みなし」ではなく「未確認」と表示します。

## 画面

- 今週のダイジェスト：重要な変化、会議で見る論点、監視範囲
- 変更台帳：重要度、企業、変更内容、分類、前回との差分、公式根拠
- 関係・トレンド：企業と変化テーマ、AIオファリング、提携先の関係マップ。8か月未満は分類別比較へ自動フォールバック
- 示唆ボード：複数社・複数一次情報で確認したパターン、反証・制約、自社への示唆、次回観測
- 主要AI企業：モデル、製品、エージェント、基盤、提携、統制、研究の定性マトリクス
- コンサルマップ：67社の社内AI活用、外部オファリング、開発・導入・運用、製品、提携
- 日本企業AI利活用：全社AI、独自開発、製造・R&D、顧客向けAI、統制、組織などの企業・業界マトリクス
- スタートアップ・新興企業：AIを中核とするスタートアップ、成長企業、上場新興企業、メガベンチャー40社
- SaaS：AI機能、価格体系、製品ポジションの変化
- 企業詳細：現在位置、定性的な活動レーダー、12か月・3年の変更履歴、公式根拠を表示
- 会議モード：今週の結論、根拠、市場への影響、検討論点、次回観測項目
- 月次アーカイブ：週次変化の月別蓄積
- 監視設定・情報源：企業追加、証拠階層、接続状態

関係グラフと示唆は、既存のプロフィールと週次シグナルからローカルで再生成します。仕様は`docs/ONTOLOGY-AND-INSIGHTS.md`にあります。Palantir製品、MiroFish、外部LLM APIは標準実行の依存関係ではありません。

## 起動

Node.js 20以上が必要です。

```powershell
npm run doctor
npm run capabilities
npm run skills:check -- --target=both
npm start
```

ブラウザで`http://127.0.0.1:4327`を開きます。

## 週次更新

AI処理は、サインイン済みのCodexまたはClaude Codeでリポジトリ同梱スキルを実行します。アプリからOpenAI APIまたはAnthropic APIを直接呼びません。

Codexでは次のように依頼します。

> AI Opportunity Monitorを`update-ai-opportunity-monitor`スキルで今週分に更新してください。

Claude Code向けの同名スキルと、Windows週次タスク登録スクリプトも同梱しています。

```powershell
powershell -ExecutionPolicy Bypass -File scripts/register-claude-weekly.ps1
```

## 3年ベースラインの分担

企業を重複しないバッチに分け、CodexまたはClaude Codeで並行調査できます。全員が同じスキルを持っている必要はありません。

```powershell
npm run research:batches -- consulting 12
npm run research:batches -- enterprises 10
npm run research:batches -- startups 10
npm run profiles:import -- path\to\reviewed-batch.json
```

共通形式は`schemas/entity-profile-batch.schema.json`、調査手順は`docs/BASELINE-RESEARCH.md`です。取込前に人が根拠URLと判定をレビューします。

## 横展開

GitHubからcloneすると、アプリ、監視対象、情報源ルール、Codex/Claude Code用の更新スキル、検証スクリプトを一緒に取得できます。接続はスキル名ではなく次の「調査能力」で解決します。

- `historical-baseline`：Foresight Radarを優先。なければ同梱のソースマップ手順
- `weekly-discovery`：AIhot公開REST APIを優先。MCPではなく、直近7日の候補発見専用
- `deep-verification`：Smart Researchを優先。なければ同梱の主張・反証・根拠チェック
- `primary-verification`：ブラウザー検索で企業公式、IR、製品ページを最終確認

どの能力が選択されたかは`npm run capabilities`で確認できます。Foresight Radar、Smart Research、AIhotがなくても停止せず、リポジトリ同梱の手順へフォールバックします。アプリはOpenAI APIまたはAnthropic APIを直接消費しません。

### 別PCへのスキル導入

clone後、まず既存スキルと不足分を確認します。

```powershell
npm run skills:check -- --target=codex
npm run skills:check -- --target=claude
```

公開元が登録されている不足スキルだけを導入する場合は、対象を明示します。

```powershell
npm run skills:install -- --target=codex
npm run skills:install -- --target=claude
```

インストーラーは既存スキルを検知してスキップし、上書きしません。cloneや`npm install`だけで外部コードを自動実行する`postinstall`も置いていません。依存定義は`config/skill-dependencies.json`で管理します。

現在、Smart Researchは公開GitHubから導入可能です。AIhotはスキルがなくても同梱RESTコネクターで利用できます。Foresight Radarの公開元URLは未登録のため、公開前に正規リポジトリを指定するか、配布許諾を確認して同梱する必要があります。詳細は`docs/PORTABLE-INSTALL.md`を参照してください。

共通の正式ボードを運用する場合は、更新担当を1アカウントに固定します。各メンバーは同じリポジトリを閲覧し、必要な場合だけ個人用の自動更新を設定します。
