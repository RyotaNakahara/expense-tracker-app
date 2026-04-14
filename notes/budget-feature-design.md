# 予算機能 設計書（ドラフト）

本書は expense-tracker-app に「予算」を追加する際の設計メモです。

---

## 1. 目的

- ユーザーが **月単位（全体、カテゴリー、タグ）の支出上限** を設定し、**実績支出と比較**できるようにする。
- 既存の **ダッシュボード（今月の合計・月次切替）** と自然に連携する。
- 読み取りコストを抑えるため、可能な限り **集計済みデータ（`monthlyTotals`）や軽いクエリ** と組み合わせる。

---

## 2. スコープ案

### 2.1 本設計で想定する範囲

| 項目 | 内容 |
|------|------|
| 予算の単位 | **暦月**（`year` + `month`）。ダッシュボードの年月選択と一致。 |
| 予算の粒度 | **月次の合計**、**カテゴリー別**、**タグ別**（同一月に、全体1件＋カテゴリー／タグごと複数を許容。タグはマスタの **`tags/{tagId}`** を主キーにし、支出のタグ文字列と突き合わせる）。 |
| 設定UI | 専用の簡易画面（ページ遷移とクエリの関係は実装時に整理）。 |
| 表示 | ダッシュボードで **使用額／予算上限の比率をプログレスバー** で示し、**残り金額**（および超過時は超過分）を数値でも併記。超過時は色・アイコンに加え、`aria-*` 等でアクセシブルに。 |
| 予算フォームの初期値 | **前月**（`year`/`month` が直前の暦月）に、同じ予算枠（全体／同一 `categoryId`／同一 `tagId`）として保存済みの `amountLimit` があれば、**翌月（または設定しようとしている月）の入力欄の初期値**としてその金額を流用する。前月に未設定の枠は空欄。 |
| 永続化 | Firestore、**本人のみ読み書き**。 |

### 2.2 将来拡張

- **繰り越し**（翌月への残額繰越）。ポリシー設計が必要。
- **通知**（プッシュ・メール）。別インフラが必要。

---

## 3. ユースケース

1. ユーザーが「2026年4月の予算を 15 万円」と設定する（全体）。任意で「食費カテゴリーは 5 万円」のように **カテゴリー別**、「ランチタグは 2 万円」のように **タグ別**（マスタ上のタグを選択）も設定する。
2. ダッシュボードで 4 月を表示しているとき、**当月支出合計**（既存の `monthlyTotal` 相当）と予算上限を比較し、**プログレスバー**で消化率を示し、**残り ¥○○**（超過時はマイナスまたは「¥○○ 超過」）を併記する。カテゴリー別は **該当 `bigCategory` の実績合計**、タグ別は **そのタグを含む支出の按分／合算ルール**（実装で固定）と各予算を比較する。
3. 5 月に予算を初めて設定する画面を開いたとき、**4 月に保存済みの同じ枠**（全体・各カテゴリー・各タグ）の金額が入力欄の**初期値**として入っている（前月未設定の行は空欄）。
4. 合計が予算を超えた場合、視覚的に「超過」を示す（アクセシビリティ: 色だけに依存しない）。
> **注（「前日」表記について）**  
> 本設計では **暦月の「前月」**（設定しようとしている月の直前の月）に保存した `amountLimit` を、**翌月＝次に設定する月のフォーム初期値**に流用する仕様とする。日単位の「前日」コピーは行わない。日次要件が必要なら別途化する。

---

## 4. データモデル（Firestore）

### 4.0 コレクション名・階層一覧

Firestore の **コレクション ID**（パス上のセグメント名）を明示する。`(default)` データベース前提。

#### ルート直下（既存アプリ）

| コレクション ID | 典型パス | 用途 |
|-----------------|----------|------|
| `categories` | `categories/{categoryId}` | カテゴリーマスタ |
| `tags` | `tags/{tagId}` | タグマスタ |
| `expenses` | `expenses/{expenseId}` | 支出（`userId` で本人のみアクセス） |
| `users` | `users/{userId}` | ユーザードキュメント（プロフィール等）。**サブコレクションの親** |

#### `users/{userId}` 直下のサブコレクション

| コレクション ID | 典型パス | 用途 |
|-----------------|----------|------|
| `monthlyTotals` | `users/{userId}/monthlyTotals/{periodId}` | 月次支出合計キャッシュ（既存） |
| `budgets` | `users/{userId}/budgets/{budgetDocId}` | **予算（本機能・推奨）**。`budgetDocId` は §4.1 の `periodId` / `periodId__cat__{categoryId}` / `periodId__tag__{tagId}` 等 |

---

### 4.1 推奨パス（月次・ユーザー配下）

既存の `users/{userId}/monthlyTotals/{periodId}` と並べて管理すると、ルールとクエリの一貫性が取りやすい。

**月次の「全体合計」予算（1ユーザー・1月・1ドキュメント）**

```
users/{userId}/budgets/{periodId}
```

- **`periodId`**: 既存の月次合計と同形式を推奨（例: `2026_04`）。`expenseService` の `monthlyTotalPeriodId(year, month)` と揃える。

**同一月の「カテゴリー別」予算（カテゴリーごとに1ドキュメント）**

```
users/{userId}/budgets/{periodId}__cat__{categoryId}
```

- ドキュメント ID に `categoryId` を含める **パターン A**。一覧は `collectionGroup` や `year`/`month` フィールドでのクエリ設計が必要になる場合あり。

**同一月の「タグ別」予算（タグごとに1ドキュメント）**

```
users/{userId}/budgets/{periodId}__tag__{tagId}
```

- `tagId` は **`tags` コレクションのドキュメント ID**（`Tag.id`）。タグ名の衝突や改名には **ID を主**、`tagName` はフィールドで冗長保持（§4.1 フィールド表）。
- 実績側は `Expense.tags`（カンマ区切り文字列）と突き合わせるため、比較時は **`tags/{tagId}.name`** と一致するか、または保存時に正規化ルールを固定する。

**サブコレクションで月内をまとめる例（パターン B・一覧向け）**

```
users/{userId}/budgets/{periodId}/items/{itemId}
```

- `itemId` 例: `total`（全体） / `cat_{categoryId}`（カテゴリー別） / `tag_{tagId}`（タグ別）。

- **フィールド案（全体・カテゴリー別・タグ別で共通スキーマ）**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `userId` | string | ○ | 冗長でもルール検証に使える |
| `year` | number | ○ | |
| `month` | number | ○ | 1–12 |
| `amountLimit` | number | ○ | 予算上限（円）。0 以上の整数推奨 |
| `categoryId` | string \| null | × | **カテゴリー別予算のとき必須**（`categories` のドキュメント ID）。全体・タグのみのとき **null**。 |
| `categoryName` | string \| null | × | 表示・`Expense.bigCategory` 突き合わせ用。カテゴリー別のときマスタの `Category.name` と一致させる。 |
| `tagId` | string \| null | × | **タグ別予算のとき必須**（`tags` のドキュメント ID）。全体・カテゴリーのみのとき **null**。 |
| `tagName` | string \| null | × | 表示・`Expense.tags` 突き合わせ用の冗長フィールド。マスタの `Tag.name` と一致させ、改名時は **追随方針** を決める。 |
| `updatedAt` | Timestamp | ○ | |
| `createdAt` | Timestamp | 任意 | |

**整合ルール（推奨）**

- **全体**: `categoryId` / `categoryName` / `tagId` / `tagName` はすべて null。
- **カテゴリー別**: `categoryId`（＋ `categoryName`）を設定し、`tagId` / `tagName` は null。
- **タグ別**: `tagId`（＋ `tagName`）を設定。カテゴリー列は null とするか、**タグの `categoryId` を冗長で持つ**かは実装で選択（支出フィルタと UI の都合）。

**補足**: カテゴリー・タグとも **マスタの ID を主**、`*Name` は非正規化キャッシュとして扱うことを推奨。

### 4.2 トップレベル `budgets` コレクション（代替案）

ルート直下に **`budgets`** コレクションを置き `budgets/{budgetDocId}` とする案（`expenses` と同列）。メリット: パスが短い。デメリット: 既存の `users/.../monthlyTotals` 等と親パターンが分かれる。

本アプリでは **サブコレクション `users/{uid}/budgets`**（§4.0）を推奨。

---

## 5. セキュリティルール

`users/{userId}/budgets/{document=**}`（`budgets` 直下および `budgets/{periodId}/items/...` など）に対し:

- `read`, `write`: `request.auth != null && request.auth.uid == userId`
- `create` 時: `request.resource.data.userId == request.auth.uid` を要求すると安全

既存の `users/{userId}/monthlyTotals/...` と同様のパターンに揃える（サブコレクションを使う場合はワイルドカードで網羅）。

---

## 6. インデックス

月次1件ドキュメント取得（`doc(users/uid/budgets/2026_04)`）のみなら **複合インデックス不要**。

一覧で「全期間の予算設定を列挙」する画面を作る場合は、コレクショングループや `userId + year + month` のクエリが必要になる可能性あり。単月・単ドキュメント取得のみなら **docId 直指定** で足りることが多い。

---

## 7. フロントエンド設計

### 7.1 型（`src/types/index.ts` 追記案）

```typescript
export interface MonthlyBudget {
  id: string // periodId / periodId__cat__{categoryId} / periodId__tag__{tagId} 等
  userId: string
  year: number
  month: number
  amountLimit: number
  categoryId: string | null
  categoryName: string | null
  /** タグ別予算時。`tags` マスタのドキュメント ID */
  tagId: string | null
  /** `Expense.tags` 突き合わせ・UI 用（マスタの Tag.name と同期） */
  tagName: string | null
  createdAt?: Timestamp
  updatedAt: Timestamp
}
```

### 7.2 サービス（例: `budgetService.ts`）

- `getMonthlyTotalBudget(userId, year, month): Promise<MonthlyBudget | null>`（全体: `categoryId` / `tagId` がともに null）
- `getCategoryBudget(userId, year, month, categoryId): Promise<MonthlyBudget | null>`
- `getTagBudget(userId, year, month, tagId): Promise<MonthlyBudget | null>`
- `listBudgetsForMonth(userId, year, month): Promise<MonthlyBudget[]>`（一覧画面・前月からの初期値取得・パターン B では `items` 列挙）
- `setBudget(userId, year, month, amountLimit, options?: { categoryId?: string; categoryName?: string; tagId?: string; tagName?: string }): Promise<void>`（`setDoc` merge）。`options` 省略または空で全体予算。
- バリデーション: 負数不可、カテゴリー別とタグ別を **同時に指定しない**、各モードでマスタ解決または `*Name` 必須、上限の実用的な最大値（任意）

### 7.3 フック（例: `useMonthlyBudget.ts`）

- ダッシュボードの `selectedYearMonth` と連動して購読または都度取得。
- `useDashboardExpenses` の `monthlyTotal` と組み合わせて **残額・使用率**（プログレスバー用の `used / limit`、表示用の `limit - used`）を `useMemo` で算出。カテゴリー別は `bigCategory`、タグ別は **`tags` の `tagName` と `Expense.tags`**（既存のカンマ区切りパース）で突合。複数タグ付き支出の按分ルールは MonthlySummary と揃えるか、タグ別は「そのタグを含む支出の全額をカウント」等を設計で固定する。

### 7.4 UI

- **ダッシュボード（残り・消化率）**  
  - **プログレスバー**を主表示とする: `value = min(1, 使用額 / 予算上限)`（予算 0 除算はガード）。超過時は `100%` 超の表現（バーは満杯＋警告色、または 100% 固定で「超過 ¥○○」テキスト強調）を設計で統一。  
  - バー付近に **残り金額**（「残り ¥61,000」／超過時「¥28,000 超過」等）を必ず表示。  
  - `role="progressbar"`、`aria-valuenow` / `aria-valuemin` / `aria-valuemax`、または視覚に依存しない説明文を付与。  
  - 予算未設定時はバー非表示または「未設定」＋「予算を設定」リンク。
- **設定画面**  
  - 数値入力 + 保存。年月は現在表示中の月をデフォルトにするか、明示選択。モード切替（全体 / カテゴリー / タグ）とマスタ連動のセレクト（既存フック流用可）。  
  - **初期値（前月コピー）**: 画面表示中の `year`/`month` について **`month === 1` なら前年12月、それ以外なら同年 `month - 1`** を前月と定義し、その月の `budgets` を取得。取得した各 `MonthlyBudget` について、同じ種別（`categoryId` / `tagId` の組み合わせが一致）の行に `amountLimit` をフォーム初期値としてセット。全体予算は `categoryId`・`tagId` がともに null の1件を前月からコピー。  
  - 前月データ取得は **読み取り追加のみ**（Firestore に「初期値用」フィールドは不要）。初回利用で前月が無い場合は空欄のまま。

### 7.5 ルーティング

- 分離する: `/budget` または `/settings/budget` を `App.tsx` に追加（`ProtectedRoute`）。

---

## 8. 既存機能との関係

| 既存 | 関係 |
|------|------|
| `useDashboardExpenses` / `monthlyTotal` | 実績のソース。予算との差分表示に利用。 |
| `users/.../monthlyTotals` | 集計キャッシュ。予算比較の「実績」は `monthlyTotal` を優先し、無い場合のフォールバック方針は既存ロジックに合わせる。 |
| `bigCategory` / カテゴリーマスタ | 予算の `categoryName` / `categoryId` と実績を突き合わせる。 |
| `tags` マスタ / `Expense.tags` | 予算の `tagId` / `tagName` と実績を突き合わせる。 |
| 読取回数 | 予算は月あたり複数 doc の get／小さな一覧取得が中心。リアルタイムリスナーは任意。 |

---

## 9. 実装フェーズ（推奨順）

1. 型・`budgetService`・Firestore ルール・（必要なら）インデックス JSON の更新。
2. `useMonthlyBudget` とダッシュボードへの表示（読み取りのみ）。
3. 予算入力・保存 UI。
4. テスト（サービスモック、ダッシュボードの **プログレスバー＋残り表示**、超過表示、`aria` 属性）。
5. 前月 `listBudgetsForMonth` から設定フォーム初期値が埋まることのテスト（境界: 1月→前年12月）。
6. カテゴリー別・タグ別予算の一覧 UI・集計との突合テスト（タグの複数付与・按分ルールを含む）。

---

## 10. 未決事項・要確認

- 予算 **未設定** のときの表示（プログレスバー非表示 vs プレースホルダのみ等）。
- カテゴリー別: `Expense.bigCategory` は名前文字列のため、**Category マスタ削除・改名** との整合性をどう取るか。
- タグ別: **同一表示名のタグが別カテゴリーに存在する**場合の扱い（ID ベースで一意にする前提の確認）。複数タグ付き支出の **実績金額の割り当て**（全額 vs 按分）を仕様で固定する。

---

## 11. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-03 | 初版ドラフト作成 |
| 2026-04-03 | 予算フィールドに `categoryId` / `categoryName` を追加。カテゴリー別のパス案・型・サービス API を追記 |
| 2026-04-03 | MVP／第1・第2段階の区分を削除し、スコープを「本設計」と「将来拡張」に整理 |
| 2026-04-03 | §4.0 に Firestore コレクション ID 一覧（既存＋`budgets`／任意 `items`）を追記 |
| 2026-04-03 | §2.1 にタグ別予算を組み込み。§4.1・§7・§8・§9・§10 を `tagId` / `tagName`・パス `periodId__tag__{tagId}` に整合 |
| 2026-04-03 | 残りをプログレスバー主表示とし、前月の `amountLimit` を翌月（設定月）フォーム初期値に流用する仕様を §2.1・§3・§7 に追記 |
