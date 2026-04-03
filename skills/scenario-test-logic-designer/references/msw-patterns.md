# MSW モックパターン集

scenario-test-logic-designer スキルで使用する MSW (Mock Service Worker) パターンのリファレンス。

---

## ハンドラー テンプレート

```typescript
// e2e/mocks/{context}/handlers.ts
import { http, HttpResponse } from 'msw';

export const {context}Handlers = [
  // 正常系モック
  http.get('/api/{endpoint}', () => {
    return HttpResponse.json({
      data: { /* モックデータ */ },
    });
  }),

  // エラー系モック
  http.post('/api/{endpoint}', () => {
    return HttpResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '...' } },
      { status: 400 }
    );
  }),
];
```

## 設計時の考慮事項

- 正常系・異常系の両方のハンドラーを設計する
- レスポンス形態は実際のAPI仕様に合わせる
- テストシナリオごとに必要なモックを明示する
- モックデータはシードデータと整合性を保つ
