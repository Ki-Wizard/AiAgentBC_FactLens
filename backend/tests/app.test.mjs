import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApiHandler } from '../src/app.mjs';
import { CLAIM_RESPONSE_FIELDS } from '../src/contract.mjs';
import { createMemoryStorage } from '../src/storage.mjs';

const ANALYSIS_ID = 'analysis-00000000-0000-4000-8000-000000000000';
const UNKNOWN_ANALYSIS_ID = 'analysis-00000000-0000-4000-8000-000000000001';

test('app: POST /analyze stores normalized COMPLETED result and GET returns equivalent result', async () => {
  const storage = createMemoryStorage();
  const handler = createApiHandler({
    storage,
    analyzer: async (input) => ({
      analysisId: ANALYSIS_ID,
      status: 'COMPLETED',
      documentText: input.documentText,
      summary: {
        totalClaims: 99,
        supported: 99,
        conflicted: 99,
        insufficient: 99,
        exaggerated: 99,
      },
      claims: [
        {
          claimId: 'claim-001',
          text: 'AWS Lambda runs code without provisioning servers.',
          label: '근거 있음',
          confidence: 0.95,
          reason: 'AWS Lambda documentation supports this claim.',
          correctedText: null,
          sources: [{ title: 'AWS Lambda docs', url: 'https://docs.aws.amazon.com/lambda/' }],
          evidence: [],
        },
      ],
    }),
  });

  const postResponse = await handler(postEvent(JSON.stringify({
    documentText: '  AWS Lambda runs code without provisioning servers.  ',
    maxClaims: 1,
  })));
  const postBody = parseResponse(postResponse);

  assert.equal(postResponse.statusCode, 200);
  assert.deepEqual(postBody, {
    analysisId: ANALYSIS_ID,
    status: 'COMPLETED',
    summary: {
      totalClaims: 1,
      supported: 1,
      conflicted: 0,
      insufficient: 0,
      exaggerated: 0,
    },
    claims: [
      {
        claimId: 'claim-001',
        text: 'AWS Lambda runs code without provisioning servers.',
        label: '근거 있음',
        confidence: 0.95,
        reason: 'AWS Lambda documentation supports this claim.',
        correctedText: null,
        sources: [{ title: 'AWS Lambda docs', url: 'https://docs.aws.amazon.com/lambda/' }],
        evidence: [],
      },
    ],
  });
  assert.deepEqual(Object.keys(postBody.claims[0]), CLAIM_RESPONSE_FIELDS);
  assert.equal(Object.hasOwn(postBody, 'documentText'), false);

  const stored = await storage.getAnalysis(ANALYSIS_ID);
  assert.deepEqual(stored, postBody);
  assert.equal(Object.hasOwn(stored, 'documentText'), false);

  const getResponse = await handler(getEvent(ANALYSIS_ID));
  assert.equal(getResponse.statusCode, 200);
  assert.deepEqual(parseResponse(getResponse), postBody);
});

test('app: GET /analyses/{analysisId} returns ANALYSIS_NOT_FOUND for unknown valid id', async () => {
  const handler = createApiHandler({
    storage: createMemoryStorage(),
    analyzer: async () => {
      throw new Error('GET should not call analyzer');
    },
  });

  const response = await handler(getEvent(UNKNOWN_ANALYSIS_ID));

  assert.equal(response.statusCode, 404);
  assert.deepEqual(parseResponse(response), {
    error: {
      code: 'ANALYSIS_NOT_FOUND',
      message: 'Analysis not found.',
    },
  });
});

test('app: GET /analyses/{analysisId} accepts pathParameters analysisId', async () => {
  const storage = createMemoryStorage();
  await storage.putAnalysis({
    analysisId: ANALYSIS_ID,
    status: 'COMPLETED',
    summary: {
      totalClaims: 0,
      supported: 0,
      conflicted: 0,
      insufficient: 0,
      exaggerated: 0,
    },
    claims: [],
  });

  const handler = createApiHandler({
    storage,
    analyzer: async () => {
      throw new Error('GET should not call analyzer');
    },
  });

  const response = await handler({
    requestContext: {
      http: {
        method: 'GET',
      },
    },
    pathParameters: {
      analysisId: ANALYSIS_ID,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(parseResponse(response), {
    analysisId: ANALYSIS_ID,
    status: 'COMPLETED',
    summary: {
      totalClaims: 0,
      supported: 0,
      conflicted: 0,
      insufficient: 0,
      exaggerated: 0,
    },
    claims: [],
  });
});

test('app: OPTIONS returns preflight headers', async () => {
  const originalAllowOrigin = process.env.CORS_ALLOW_ORIGIN;
  process.env.CORS_ALLOW_ORIGIN = 'http://localhost:5173';
  const handler = createApiHandler({
    storage: createMemoryStorage(),
    analyzer: async () => ({ claims: [] }),
  });

  try {
    const response = await handler({
      version: '2.0',
      routeKey: 'OPTIONS /analyze',
      rawPath: '/analyze',
      requestContext: {
        http: {
          method: 'OPTIONS',
          path: '/analyze',
        },
      },
      headers: {
        origin: 'http://localhost:5173',
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://localhost:5173');
    assert.equal(response.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  } finally {
    if (originalAllowOrigin == null) {
      delete process.env.CORS_ALLOW_ORIGIN;
    } else {
      process.env.CORS_ALLOW_ORIGIN = originalAllowOrigin;
    }
  }
});

function postEvent(body) {
  return {
    version: '2.0',
    routeKey: 'POST /analyze',
    rawPath: '/analyze',
    requestContext: {
      http: {
        method: 'POST',
        path: '/analyze',
      },
    },
    headers: {
      'content-type': 'application/json',
    },
    body,
    isBase64Encoded: false,
  };
}

function getEvent(analysisId) {
  return {
    version: '2.0',
    routeKey: 'GET /analyses/{analysisId}',
    rawPath: `/analyses/${analysisId}`,
    pathParameters: { analysisId },
    requestContext: {
      http: {
        method: 'GET',
        path: `/analyses/${analysisId}`,
      },
    },
  };
}

function parseResponse(response) {
  return JSON.parse(response.body);
}
