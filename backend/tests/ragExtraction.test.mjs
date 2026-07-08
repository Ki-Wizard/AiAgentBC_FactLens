import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fallbackJudgeClaim } from '../rag/fallbackJudge.mjs';
import { analyzeDocument } from '../rag/lambdaHandler.mjs';

test('RAG extracts non-AWS user text as a claim instead of returning an empty result', async () => {
  const result = await analyzeDocument({
    documentText: '업로드한 문서는 아직 근거가 없다',
    maxClaims: 1,
    searchMode: 'fallback',
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.summary.totalClaims, 1);
  assert.equal(result.summary.insufficient, 1);
  assert.equal(result.claims[0].text, '업로드한 문서는 아직 근거가 없다');
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

test('fallback judge can use broad internet evidence for location support and conflict', () => {
  const evidence = [
    {
      id: 'internet-wikipedia-001',
      title: '순천시',
      sourceType: 'internet_search',
      url: 'https://ko.wikipedia.org/wiki/%EC%88%9C%EC%B2%9C%EC%8B%9C',
      summaryKo: '검색 결과 후보',
      evidenceText: '순천시는 대한민국 전라남도 동부에 있는 시이다.',
    },
  ];

  assert.equal(
    fallbackJudgeClaim({ claimId: 'claim-001', text: '순천은 전남에 위치하고 있다' }, evidence).label,
    '근거 있음',
  );
  assert.equal(
    fallbackJudgeClaim({ claimId: 'claim-002', text: '순천은 전북에 있는 도시이다' }, evidence).label,
    '공식 근거와 충돌',
  );
});
