# 週次調査ランの運用モデル

AI Opportunity Monitorの主成果物は画面ではなく、繰り返せる調査ランです。1回の調査は`data/runs/weekly-YYYY-MM-DD/`に保存され、確認済みの更新だけがアプリへ取り込まれます。

## 実行の流れ

```text
固定ウォッチ + AI市場全般
  → 発見候補
  → 一次情報で検証
  → 関係・パターンを構造化
  → 必要な時だけシナリオを試す
  → 確認済み更新だけをアプリに公開
```

## 各スキルの役割

| 役割 | 実行するもの | 保存先 |
| --- | --- | --- |
| 3〜5年の基準情報・差分 | Foresight Radar | `entity-profiles.json` とランの`discovery.json` |
| 今週の市場全般の候補発見 | AIhot | `discovery.json` |
| 重要候補の一次情報・反証確認 | Smart Research | `verification.json` |
| 企業・活動・提携・根拠の構造化 | Palantir Ontology | `ontology-analysis.json` |
| 競合反応・採用分岐の仮説検討 | MiroFish（任意） | `scenario-analysis.json` |
| 候補・関連語・新興企業の探索 | Opportunity Intelligence（任意アダプター） | `discovery.json` |

AIhotとOpportunity Intelligenceは発見用です。掲載事実の根拠には使わず、必ず公式発表、IR、製品ページ、論文、政府資料などで確認します。

## 開始と公開

```powershell
npm run research:run -- 2026-09-01
# CodexまたはClaude Codeに「update-ai-opportunity-monitorをこのrun_idで実行」と依頼
npm run research:validate -- weekly-2026-09-01
npm run research:publish -- weekly-2026-09-01
```

`publish`は検証済みの`weekly-update.json`だけを`data/signals.json`と`data/brief.json`へ取り込みます。候補、未確認、シナリオは事実データに混ぜません。

## MiroFishを使う条件

MiroFishは毎週すべてのニュースに使いません。複数社の確認済み変化があり、次のような問いがある時だけ使います。

- 新しいAIエージェント提供が、顧客・競合・パートナーにどう受け止められるか
- 国内企業の導入が、どこで拡大・停滞・反発するか
- 提携や規制変更が、採用や提供形態をどう分岐させるか

シミュレーション結果は仮説です。MiroFishを実行した場合でも、入力根拠・前提・実行成果物を`scenario-analysis.json`に残し、一次事実と同じ扱いにはしません。

## 横展開

リポジトリをcloneしたPCでは、まず`npm run skills:check -- --target=both`を実行します。不足している任意スキルは、出力された固定URLと導入コマンドで追加できます。外部スキルがなくても、プロジェクト内の手順とJSON契約で同じ調査ランを作成できます。
