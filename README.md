# AI Opportunity Monitor

AI市場と企業の動きを週次で定点観測し、戦略・市場調査の会議で確認できる形に整理するローカルアプリです。

## 観測対象

- 主要AI企業、モデル・プラットフォーム、AI算力・供給網
- 国内外のコンサルティング会社
- 日本の大手事業会社とIT関連企業
- 日本のAIスタートアップ・新興企業
- 国内外の主要SaaS企業

## 観測する内容

- AIモデル、製品、エージェント、基盤の発表
- 社内業務へのAI導入と全社展開
- 顧客向けAIサービスとコンサルティング・オファリング
- 独自AIの開発、導入事例、業務別の活用
- 企業間の提携、共同開発、出資、買収
- AI組織、人材、ガバナンス、セキュリティ
- 前週・前月から何が変わったか

週次の変更とは別に、各社の直近3〜5年の現在位置、主要な取り組み、オファリング、提携、公式根拠を企業プロフィールとして蓄積します。

## 主な画面

- 今週のダイジェスト
- 更新履歴
- 企業・業界別のAI活動マトリクス
- AI市場レイヤーの期間別マトリクス、プレイヤー種別ごとの期間動向、企業別のオファリング・提携一覧、常時表示の関係マップ
- テーマ別モメンタム
- 根拠、制約、示唆、次回観測をまとめた示唆ボード
- 企業ごとの現在位置、活動レーダー、変更履歴、公式根拠
- 月次アーカイブ
- モデル性能、開発者利用、対話品質、実装能力を分けて見るランキング更新

「未確認」は取り組みがないという意味ではありません。一次情報をまだ登録していない状態として区別します。

## 起動

Node.js 20以上が必要です。

```powershell
npm run doctor
npm start
```

ブラウザで`http://127.0.0.1:4327`を開きます。

## 週次更新

サインイン済みのCodexまたはClaude Codeで、次のように依頼します。

> AI Opportunity Monitorを今週分に更新してください。

この依頼は画面の更新ではなく、1回の**調査ラン**を実行します。候補発見、一次情報での確認、関係の構造化、必要時だけのシナリオ検討、確認済み更新の公開を順番に行います。アプリ自体はOpenAI APIやAnthropic APIを直接呼びません。

手動で開始する場合は次の通りです。

```powershell
npm run research:run -- 2026-09-01
# Codex / Claude Codeに、返されたrun_idでupdate-ai-opportunity-monitorを実行するよう依頼
npm run research:validate -- weekly-2026-09-01
npm run research:publish -- weekly-2026-09-01
```

詳細は[週次調査ランの運用モデル](docs/WEEKLY-RUN-OPERATING-MODEL.md)を参照してください。

## 3〜5年ベースライン

企業を分担して調査する場合は、対象分類と1バッチの企業数を指定して調査リストを作成できます。

```powershell
npm run research:batches -- consulting 12
npm run research:batches -- enterprises 10
npm run research:batches -- startups 10
```

レビュー済みの調査結果は次のコマンドで取り込みます。

```powershell
npm run profiles:import -- path\to\reviewed-batch.json
```

## 別のパソコンで使う

GitHubからcloneし、`npm run doctor`、`npm run skills:check -- --target=both`、`npm start`を実行します。アプリ、監視対象、更新手順、検証スクリプトが同じリポジトリに含まれているため、チームメンバーも同じ形式で更新を継続できます。Foresight Radar、Smart Research、AIhot、Palantir Ontologyは親スキルから役割別に呼び出されます。MiroFishとOpportunity Intelligenceは任意の分析・発見アダプターであり、未導入でも確認済み情報の収集・公開は継続できます。
