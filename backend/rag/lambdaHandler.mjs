import { randomUUID } from 'node:crypto';

import { ALLOWED_LABELS } from '../src/contract.mjs';

const [
  LABEL_SUPPORTED,
  LABEL_CONFLICTED,
  LABEL_INSUFFICIENT,
  LABEL_EXAGGERATED,
] = ALLOWED_LABELS;

const DEFAULT_SOURCE = Object.freeze({
  title: 'AWS FactLens Guide',
  url: 'https://docs.aws.amazon.com/',
});

export async function analyzeDocument(input) {
  const documentText = String(input?.documentText ?? '').trim();
  const maxClaims = Number.isInteger(input?.maxClaims) && input.maxClaims > 0 ? input.maxClaims : 10;

  const lines = splitClaims(documentText, maxClaims);
  const claims = lines.map((text, index) => ({
    claimId: `claim-${String(index + 1).padStart(3, '0')}`,
    text,
    label: resolveLabel(text),
    confidence: computeConfidence(text),
    reason: `Auto-analysis result based on local RAG placeholder for ${text.length} chars.`,
    correctedText: null,
    sources: [DEFAULT_SOURCE],
    evidence: [],
  }));

  const summary = summarizeClaims(claims);
  return {
    analysisId: `analysis-${randomUUID()}`,
    status: 'COMPLETED',
    summary,
    claims,
  };
}

function splitClaims(documentText, maxClaims) {
  const lines = documentText
    .split(/(?<=[.?!])\s+/u)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return ['No extractable claim sentence was found.'];
  }

  const limit = Math.min(maxClaims, lines.length);
  return lines.slice(0, limit);
}

function resolveLabel(text) {
  if (/(conflict|conflicts|contradict|허위|오답|틀린|disagree|not allowed)/ui.test(text)) {
    return LABEL_CONFLICTED;
  }

  if (/(insufficient|근거\s*없|lacking|evidence\s*missing|과소|부족|불완전)/ui.test(text)) {
    return LABEL_INSUFFICIENT;
  }

  if (/(exaggerat|과장|훼손|확장된\s*표현|과도한|too\s*much|excessive|claiming)/ui.test(text)) {
    return LABEL_EXAGGERATED;
  }

  return LABEL_SUPPORTED;
}

function computeConfidence(text) {
  const base = Math.min(0.95, Math.max(0.45, 0.95 - text.length / 200));
  return Number(base.toFixed(2));
}

function summarizeClaims(claims) {
  const summary = {
    totalClaims: claims.length,
    supported: 0,
    conflicted: 0,
    insufficient: 0,
    exaggerated: 0,
  };

  for (const claim of claims) {
    if (claim.label === LABEL_SUPPORTED) {
      summary.supported += 1;
      continue;
    }
    if (claim.label === LABEL_CONFLICTED) {
      summary.conflicted += 1;
      continue;
    }
    if (claim.label === LABEL_INSUFFICIENT) {
      summary.insufficient += 1;
      continue;
    }
    summary.exaggerated += 1;
  }

  return summary;
}
