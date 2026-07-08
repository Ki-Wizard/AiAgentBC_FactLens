import { randomUUID } from 'node:crypto';

import { ALLOWED_LABELS, isValidAnalysisId } from './contract.mjs';

const LABEL_SUMMARY_KEYS = Object.freeze({
  '근거 있음': 'supported',
  '공식 근거와 충돌': 'conflicted',
  '근거 부족': 'insufficient',
  '과장 표현': 'exaggerated',
});

export class InvalidAnalysisResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidAnalysisResponseError';
  }
}

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  };
}

export function errorResponse(statusCode, code, message) {
  return jsonResponse(statusCode, {
    error: { code, message },
  });
}

export function optionsResponse() {
  const headers = jsonHeaders();
  headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  headers['Access-Control-Max-Age'] = '600';
  return {
    statusCode: 204,
    headers,
    body: '',
  };
}

function jsonHeaders() {
  const allowOrigin = process.env.CORS_ALLOW_ORIGIN;
  const headers = {
    'content-type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
  };

  if (typeof allowOrigin === 'string' && allowOrigin.trim() !== '') {
    headers['Access-Control-Allow-Origin'] = allowOrigin.trim();
    headers.Vary = 'Origin';
  }

  return headers;
}

export function normalizeAnalysisResponse(rawAnalysis) {
  const analysis = asObject(rawAnalysis, 'analysis');
  const claims = normalizeClaims(analysis.claims);

  return {
    analysisId: isValidAnalysisId(analysis.analysisId) ? analysis.analysisId : generateAnalysisId(),
    status: normalizeStatus(analysis.status),
    summary: summarizeClaims(claims),
    claims,
  };
}

export function generateAnalysisId() {
  return `analysis-${randomUUID()}`;
}

export function summarizeClaims(claims) {
  const summary = {
    totalClaims: claims.length,
    supported: 0,
    conflicted: 0,
    insufficient: 0,
    exaggerated: 0,
  };

  for (const claim of claims) {
    summary[LABEL_SUMMARY_KEYS[claim.label]] += 1;
  }

  return summary;
}

function normalizeClaims(rawClaims) {
  if (!Array.isArray(rawClaims)) {
    throw new InvalidAnalysisResponseError('analysis claims must be an array');
  }

  return rawClaims.map(normalizeClaim);
}

function normalizeClaim(rawClaim, index) {
  const claim = asObject(rawClaim, `claim ${index}`);
  const claimId = normalizeString(claim.claimId, `claims[${index}].claimId`);
  const text = normalizeString(claim.text, `claims[${index}].text`);
  const label = normalizeLabel(claim.label);
  const confidence = normalizeConfidence(claim.confidence, index);

  return {
    claimId,
    text,
    label,
    confidence,
    reason: normalizeString(claim.reason, `claims[${index}].reason`),
    correctedText: normalizeNullableString(claim.correctedText, `claims[${index}].correctedText`),
    sources: normalizeSources(claim.sources, index),
    evidence: normalizeEvidence(claim.evidence, index),
  };
}

function normalizeLabel(label) {
  if (!ALLOWED_LABELS.includes(label)) {
    throw new InvalidAnalysisResponseError(`invalid claim label: ${String(label)}`);
  }

  return label;
}

function normalizeConfidence(confidence, index) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new InvalidAnalysisResponseError(`claims[${index}].confidence must be a number from 0 through 1`);
  }

  return confidence;
}

function normalizeSources(rawSources, claimIndex) {
  if (!Array.isArray(rawSources)) {
    throw new InvalidAnalysisResponseError(`claims[${claimIndex}].sources must be an array`);
  }

  return rawSources.map((rawSource, sourceIndex) => {
    const source = asObject(rawSource, `claims[${claimIndex}].sources[${sourceIndex}]`);

    return {
      ...source,
      title: normalizeString(source.title, `claims[${claimIndex}].sources[${sourceIndex}].title`),
      url: normalizeString(source.url, `claims[${claimIndex}].sources[${sourceIndex}].url`),
    };
  });
}

function normalizeEvidence(rawEvidence, claimIndex) {
  if (!Array.isArray(rawEvidence)) {
    throw new InvalidAnalysisResponseError(`claims[${claimIndex}].evidence must be an array`);
  }

  return rawEvidence.map((rawEntry, evidenceIndex) => ({
    ...asObject(rawEntry, `claims[${claimIndex}].evidence[${evidenceIndex}]`),
  }));
}

function normalizeStatus(status) {
  return typeof status === 'string' && status.trim() !== '' ? status : 'COMPLETED';
}

function normalizeString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidAnalysisResponseError(`${fieldName} must be a non-empty string`);
  }

  return value;
}

function normalizeNullableString(value, fieldName) {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidAnalysisResponseError(`${fieldName} must be a string or null`);
  }

  return value;
}

function asObject(value, fieldName) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidAnalysisResponseError(`${fieldName} must be an object`);
  }

  return value;
}
