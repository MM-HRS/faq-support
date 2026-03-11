# FAQ AI Agent v3 - セットアップガイド

## 変更点サマリー（v2 → v3）

| 問題 | v2（修正前） | v3（修正後） |
|------|-------------|-------------|
| APIキー漏洩 | フロントに平文保持 | Edge Functionに隠蔽 |
| XSS脆弱性 | `innerHTML`に直接挿入 | `escapeHtml()` + `textContent` |
| FAQ永続化 | メモリのみ | Supabase DB (PostgreSQL) |
| 会話履歴 | 1ターンのみ | 直近10ターンを保持 |
| 連打防止 | なし | 1.5秒のレート制限 |
| 文字数制限 | なし | 質問500字・回答2000字 |
| エラー表示 | alert | トーストUI |
| アクセシビリティ | なし | aria-label対応 |

---

## セットアップ手順

### 1. Supabase プロジェクト作成
1. https://supabase.com にアクセス
2. 新規プロジェクトを作成
3. Project URL と anon key をメモ

### 2. データベース作成
Supabase ダッシュボード → SQL Editor で以下を実行:

```sql
-- supabase/migrations/20240101_create_faqs.sql の内容を貼り付け
```

### 3. Gemini APIキーをシークレットに登録

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=AIzaSy...あなたのキー...
```

### 4. Edge Function をデプロイ

```bash
supabase functions deploy chat
```

デプロイ後、Supabase ダッシュボード → Edge Functions で `chat` が表示されていればOK。

### 5. フロントエンドを開く

`index.html` をブラウザで直接開くか、GitHub Pages / Netlify などにホスティング。

1. 「設定」タブを開く
2. Project URL と anon key を入力して「接続して適用」
3. FAQを追加してチャットを開始

---

## セキュリティ補足

- **Gemini APIキー**: Supabase の環境変数にのみ存在。ブラウザには絶対に届かない。
- **Supabase anon key**: 読み取り専用ポリシーで保護。公開しても安全な設計。
- **RLS（行レベルセキュリティ）**: 認証済みユーザーのみ書き込み可能。
- **XSS対策**: すべてのユーザー入力は `escapeHtml()` または `textContent` で無害化。

---

## ファイル構成

```
faq-agent/
├── index.html                              # フロントエンド
├── supabase/
│   ├── functions/
│   │   └── chat/
│   │       └── index.ts                   # Edge Function (APIキー保護)
│   └── migrations/
│       └── 20240101_create_faqs.sql       # DBスキーマ
└── README.md
```
