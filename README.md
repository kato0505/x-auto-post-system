# XxCodex X運用 半自動化プロジェクト

## 現在の本番構成

n8nは使いません。
現在の自動投稿は、以下の流れです。

```text
GitHub Actions
↓
OpenAI APIでX投稿を3本生成
↓
Buffer GraphQL APIへ直接送信
↓
Buffer QueueからXへ自動投稿
```

## 初回設定

GitHubのリポジトリで、以下の3つを `Settings` → `Secrets and variables` → `Actions` → `New repository secret` に登録します。

```text
OPENAI_API_KEY
BUFFER_API_KEY
BUFFER_CHANNEL_ID
```

Buffer側では、XアカウントのチャンネルIDが `BUFFER_CHANNEL_ID` です。
XアカウントがBufferに接続されていることと、Queueの投稿時間が入っていることを確認してください。

## 手動テスト

最初にローカルで確認する場合は、`.env` に同じ3項目を入れてから実行します。

```text
npm install
npm run check
npm start
```

`npm start` を実行すると、投稿が3本生成され、Buffer Queueへ直接入ります。
実際にXへ出る時刻は、Buffer側のQueue設定に従います。

## 自動実行

`.github/workflows/auto-post.yml` が、毎日日本時間5:30に自動実行します。
GitHub Actions画面の `Run workflow` から手動実行もできます。

投稿履歴は `data/post-history.json` に保存され、GitHub Actionsが自動コミットします。
この履歴を見て、過去14日と同じ投稿、過去7日と似すぎる投稿を避けます。

## 変更する場所

- 投稿の生成ルール：`src/generatePosts.ts`
- Buffer送信：`src/bufferClient.ts`
- 重複・文字数チェック：`src/validation.ts`
- 投稿履歴：`data/post-history.json`
- 自動実行時刻：`.github/workflows/auto-post.yml`
- 環境変数の見本：`.env.example`

## n8nについて

n8n経由のWebhook送信は削除しました。
古い `scripts/sns_publish_due_posts.py` は誤送信防止のため停止案内だけを表示します。

このプロジェクトは、X運用を7体のAgentで半自動化するための設計・設定・プロンプト集です。
最初はすべてSlackへ「承認待ち」として送り、人間が「承認」「修正」「却下」を判断します。

## まず読むファイル

- `docs/system_design.md`：全体設計
- `docs/implementation_plan.md`：実装ロードマップ
- `docs/next_user_actions.md`：次にあなたが準備すること
- `docs/operation_quickstart.md`：日常運用の起動手順
- `docs/notion_database_design.md`：Notion DB設計
- `docs/phase2_setup_guide.md`：Phase2準備ガイド
- `docs/x_monetization_strategy.md`：X副業ジャンル選定と収益化ロードマップ
- `concept.md`：完全自動化ループの起点。誰に・何を・どう売るか
- `docs/full_auto_sns_loop.md`：コンセプト→投稿→データ→改善の循環設計
- `docs/research_database_design.md`：AIネタ、AI知識、AIトレンド、投稿DBの設計
- `AGENTS.md`：全Agentが必ず守る共通ルール
- `docs/project_structure.md`：フォルダ構成と変更場所
- `agents/agent_registry.md`：Agent登録一覧
- `automations/codex_automations.md`：起動スケジュール
- `config/slack_approval_flow.md`：Slack承認フロー
- `config/slack_message_templates.md`：Slack承認メッセージの型
- `config/api_connection_checklist.md`：API接続チェックリスト
- `agents/`：7体のSystem Prompt

## Phase

1. 設計書作成
2. AGENTS.md作成
3. 7体のAgent作成
4. API接続
5. Slack承認フロー
6. 実際に動作テスト

## 運用方針

- Slackを操作の中心にします。
- X投稿、リプ、DMはすべて承認待ちで止めます。
- 自動投稿は動作確認後にPhase2以降で有効化します。
- Memory、Skills、AGENTS.mdは全Agentで共通利用します。
- 将来的に「学び編集長」「コンテンツ錬金術師」とInstagram版Agentを追加できる構成にします。

## Slack通知テスト

`.env` にSlackの値を入れ、Botをチャンネルへ招待したら、以下で通知テストを行います。

```text
python3 scripts/slack_test_notify.py
```

チャンネルIDを指定する場合は、以下のように実行します。

```text
python3 scripts/slack_test_notify.py C0123456789
```

`#x-approval` に承認待ち投稿のテストを送る場合は、以下を実行します。

```text
python3 scripts/slack_send_approval_test.py
```

4種類のボタン確認をまとめて送る場合は、以下を実行します。

```text
python3 scripts/slack_send_approval_batch_test.py
```

承認ボタンの反応を受け取る場合は、Socket Modeを有効にしたうえで以下を実行します。

```text
python3 scripts/slack_socket_interactivity.py
```

承認履歴を確認する場合は、以下を実行します。

```text
python3 scripts/approval_history_summary.py
```

承認済み投稿のキューを確認する場合は、以下を実行します。

```text
python3 scripts/post_queue_summary.py
```

承認済み投稿キューを見やすく整理する場合は、以下を実行します。

```text
python3 scripts/organize_post_queue.py
```

承認済み投稿を「投稿済み」「スキップ」などで管理する場合は、以下を実行します。

```text
python3 scripts/manage_post_queue.py --list
```

1件目を投稿済みにする例です。

```text
python3 scripts/manage_post_queue.py --index 1 --status posted --url https://x.com/your/status/123
```

Notion接続を確認する場合は、以下を実行します。

```text
python3 scripts/notion_check_connection.py
```

承認履歴とネタ候補をNotionへ同期する場合は、以下を実行します。

```text
python3 scripts/notion_sync_approvals.py
python3 scripts/notion_sync_ideas.py
```

Notion同期をまとめて実行する場合は、以下を実行します。

```text
python3 scripts/notion_sync_all.py
```

投稿侍の3投稿をSlack承認に出す場合は、以下を実行します。

```text
python3 scripts/toukou_zamurai_send_daily_posts.py
```

Slackに送る前に内容だけ確認する場合は、以下を実行します。

```text
python3 scripts/toukou_zamurai_send_daily_posts.py --dry-run
```

ネタ目利きの出力を指定して投稿侍に渡す場合は、以下を実行します。

```text
python3 scripts/toukou_zamurai_send_daily_posts.py --ideas-file logs/neta_ideas_2026-06-26.json
```

ネタ目利きが本日の優良ネタを作る場合は、以下を実行します。

```text
python3 scripts/neta_mekiki_generate_ideas.py
```

ネタ目利きから投稿侍まで一気に流す場合は、以下を実行します。

```text
python3 scripts/run_morning_flow.py
```

Slackに送る前に確認だけする場合は、以下を実行します。

```text
python3 scripts/run_morning_flow.py --dry-run
```

Slack承認フローを起動する場合は、以下を実行します。

```text
python3 scripts/start_slack_approval.py
```

Slack承認フローを起動して、朝フローも送る場合は、以下を実行します。

```text
python3 scripts/start_slack_approval.py --morning-flow
```

このコマンドは、朝フロー送信後にNotion同期も実行します。
Slackの承認ボタン操作後も、SDK版ではNotion同期が自動で走ります。

朝フローを本番運用として起動する場合は、以下を開きます。

```text
/Users/tomato/Documents/自動化/start_morning_production.command
```

この起動ファイルは、朝フロー本番運用チェックを行ってから、Slack承認フローと朝フロー送信をまとめて開始します。
現在、X投稿の自動投入はGitHub ActionsからBufferへ直接送る方式に移行しています。
Slack承認からの旧自動投入は停止しています。

リプ職人の返信案をSlack承認へ送る場合は、以下を実行します。

```text
python3 scripts/reply_shokunin_send_replies.py
```

リプ自動モードを使う場合は、以下を開きます。
安全なリプだけ自動候補にし、営業や否定的なリプは止めます。

```text
/Users/tomato/Documents/自動化/start_reply_auto_mode.command
```

X API書き込みキーが未設定の場合は、Xには返信せずログ保存までで止まります。

承認済みリプ返信キューを見る場合は、以下を実行します。

```text
python3 scripts/reply_queue_summary.py
```

DM執事の返信案をSlack承認へ送る場合は、以下を実行します。

```text
python3 scripts/dm_shitsuji_send_dms.py
```

承認済みDM返信キューを見る場合は、以下を実行します。

```text
python3 scripts/dm_queue_summary.py
```

分析旦那の日次レポートを作る場合は、以下を実行します。

```text
python3 scripts/bunseki_danna_report.py
```

バズ番頭の派生案を作る場合は、以下を実行します。

```text
python3 scripts/buzz_bandou_generate_derivatives.py
```

統制大番頭の品質レビューを行う場合は、以下を実行します。

## Full Auto Loop

`concept.md` から投稿を生成する場合：

```text
python3 scripts/sns_generate_posts.py
```

現在は、AIトレンド紹介ではなく「人生を変えたい人が希望を持てる言葉」を優先します。
AIは主役ではなく、できないことをできる形に変える補助線として扱います。

OpenAIで投稿を3本生成し、Buffer Queueへ直接送る場合：

```text
npm start
```

`.env` またはGitHub Secretsに `OPENAI_API_KEY`、`BUFFER_API_KEY`、`BUFFER_CHANNEL_ID` が必要です。
ローカルで送信せず確認したい場合は `DRY_RUN=true` を使います。

日次データを集約する場合：

```text
python3 scripts/sns_collect_metrics.py
```

3日ごとの改善提案を作る場合：

```text
python3 scripts/sns_improvement_loop.py
```

異常検知を行う場合：

```text
python3 scripts/sns_anomaly_check.py
```

Slack承認なしで日中自動運用する場合：

```text
python3 scripts/run_full_auto_day.py --all
```

投稿生成、Buffer投入、リプ安全判定をまとめて行う場合：

```text
/Users/tomato/Documents/自動化/start_day_auto_operation.command
```

学び編集長だけを起動する場合：

```text
/Users/tomato/Documents/自動化/start_learning_editor.command
```

AIトレンドリサーチだけを起動する場合：

```text
/Users/tomato/Documents/自動化/start_ai_trends_research.command
```

マインド系アカウント研究をスプレッドシート用CSVにする場合：

```text
/Users/tomato/Documents/自動化/start_mindset_account_research.command
```

出力先：

```text
data/research/mindset_accounts.csv
data/research/mindset_accounts_by_genre.csv
data/research/mindset_accounts_by_follower.csv
research/YYYY-MM-DD-mindset-accounts.md
```

AIと日本トレンドをまとめて30件リサーチする場合：

```text
/Users/tomato/Documents/自動化/start_trend_research.command
```

リサーチ済みトレンドをAI活用ネタへ変換する場合：

```text
/Users/tomato/Documents/自動化/start_ai_converted_trends.command
```

この処理は、トレンドをそのまま紹介せず、ChatGPTでどう使えるか、SNS投稿にどう変換できるかまで作成します。
変換結果は次回の投稿生成で優先的に参照されます。

夜に改善確認だけまとめて行う場合：

```text
python3 scripts/run_night_review.py
```

Xの数字を手入力するフォームを開く場合：

```text
/Users/tomato/Documents/自動化/start_manual_analytics_form.command
```

```text
python3 scripts/tousei_oobandou_review.py
```

全Agentの運用状態をまとめて確認する場合は、以下を実行します。

```text
python3 scripts/all_agents_operation_check.py
```

結果をSlackの `#x-report` に送る場合は、以下を実行します。

```text
python3 scripts/all_agents_operation_check.py --slack
```

Phase2用に、承認済み投稿からBuffer送信候補を作る場合は、以下を実行します。

```text
python3 scripts/phase2_prepare_buffer_queue.py
```

Phase2へ進める状態か安全チェックする場合は、以下を実行します。

```text
python3 scripts/phase2_safety_check.py
```

結果をSlackの `#x-report` に送る場合は、以下を実行します。

```text
python3 scripts/phase2_safety_check.py --slack
```

Slack公式SDK版を使う場合は、初回だけ依存関係を入れます。

```text
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```
