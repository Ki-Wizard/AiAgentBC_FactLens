import assert from "node:assert/strict";
import test from "node:test";

import {
  getSourceTarget,
  normalizeAnalysisResult,
} from "./normalizers.js";

test("normalizeAnalysisResult uses text and keeps complete claim shape", () => {
  const result = normalizeAnalysisResult({
    analysisId: "analysis-001",
    claims: [
      {
        claimId: "claim-001",
        text: "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
        label: "공식 근거와 충돌",
        confidence: 0.9,
        reason: "공식 quota와 다르다.",
        correctedText: "최대 실행 시간은 15분이다.",
        sources: [{ title: "AWS Lambda quotas", url: "https://example.com" }],
        evidence: [{ id: "lambda-timeout" }],
      },
    ],
  });

  assert.equal(result.analysisId, "analysis-001");
  assert.equal(result.summary.totalClaims, 1);
  assert.equal(result.summary.conflicted, 1);
  assert.equal(result.claims[0].text, "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.");
  assert.equal(result.claims[0].confidence, 0.9);
  assert.equal(result.claims[0].sources[0].url, "https://example.com");
});

test("normalizeAnalysisResult supports legacy claimText fallback", () => {
  const result = normalizeAnalysisResult({
    claims: [
      {
        claimText: "기존 필드명 claimText도 렌더링되어야 한다.",
        label: "근거 있음",
        sources: [],
      },
    ],
  });

  assert.equal(result.claims[0].text, "기존 필드명 claimText도 렌더링되어야 한다.");
  assert.equal(result.summary.supported, 1);
});

test("normalizeAnalysisResult safely handles malformed response fields", () => {
  const result = normalizeAnalysisResult({
    summary: null,
    claims: [
      {
        label: "unknown-label",
        confidence: "not-a-number",
        sources: null,
      },
    ],
  });

  assert.equal(result.summary.totalClaims, 1);
  assert.equal(result.claims[0].label, "근거 부족");
  assert.equal(result.claims[0].confidence, 0);
  assert.deepEqual(result.claims[0].sources, []);
});

test("getSourceTarget supports both public URLs and backend S3 URIs", () => {
  assert.equal(getSourceTarget({ url: "https://docs.aws.amazon.com" }), "https://docs.aws.amazon.com");
  assert.equal(
    getSourceTarget({ uri: "s3://factlens-dev-evidence-docs/source-docs/aws-evidence-corpus.md" }),
    "s3://factlens-dev-evidence-docs/source-docs/aws-evidence-corpus.md",
  );
});

test("normalizeAnalysisResult counts all four supported labels", () => {
  const result = normalizeAnalysisResult({
    claims: [
      { text: "supported", label: "근거 있음" },
      { text: "conflicted", label: "공식 근거와 충돌" },
      { text: "insufficient", label: "근거 부족" },
      { text: "exaggerated", label: "과장 표현" },
    ],
  });

  assert.equal(result.summary.totalClaims, 4);
  assert.equal(result.summary.supported, 1);
  assert.equal(result.summary.conflicted, 1);
  assert.equal(result.summary.insufficient, 1);
  assert.equal(result.summary.exaggerated, 1);
});
