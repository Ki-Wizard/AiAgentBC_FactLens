import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyzeDocument } from '../rag/lambdaHandler.mjs';

test('RAG extracts non-AWS user text as a claim instead of returning an empty result', async () => {
  const result = await analyzeDocument({
    documentText: '순천은 전북에 있는 도시이다',
    maxClaims: 1,
    searchMode: 'fallback',
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.summary.totalClaims, 1);
  assert.equal(result.summary.insufficient, 1);
  assert.equal(result.claims[0].text, '순천은 전북에 있는 도시이다');
  assert.equal(result.claims[0].label, '근거 부족');
});

test('RAG still detects known AWS conflict claims after general extraction', async () => {
  const result = await analyzeDocument({
    documentText: 'AWS Lambda 함수는 최대 5분까지만 실행할 수 있다',
    maxClaims: 1,
    searchMode: 'fallback',
  });

  assert.equal(result.summary.totalClaims, 1);
  assert.equal(result.summary.conflicted, 1);
  assert.equal(result.claims[0].label, '공식 근거와 충돌');
});
