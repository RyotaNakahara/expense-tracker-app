**フォーマット**:

```
<type>(<scope>): <short summary>

<body>

<footer>

```

### type（必須）

- `feat` : 新機能
- `fix` : バグ修正
- `hotfix` : バグ修正（緊急）
- `docs` : ドキュメントのみの変更
- `style` : フォーマットやセミコロンなど、コードの動作に影響しない変更
- `refactor` : 機能変更なしのリファクタ
- `perf` : パフォーマンス改善
- `test` : テスト追加/修正
- `ci` : CI 設定関連
- `build` : ビルド関連（webpack, package 等）
- `chore` : その他雑多な変更（依存更新など）

### scope（任意）

- 影響範囲（例: `auth`, `api`, `ui/Header`）

### short summary（必須）

- 50 字以内、英語/日本語どちらでも可。命令形で簡潔に。

### body（任意）

- 必要なら変更理由・背景・実装の要点を 72 字幅で折り返す。

### footer（任意）

- 関連チケット番号や `BREAKING CHANGE:` を明記