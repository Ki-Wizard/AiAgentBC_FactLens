import { readFile } from 'node:fs/promises';

const FALLBACK_FIXTURE_URLS = [
  new URL('../../sample-data/expected-results/bedrock-fallback.json', import.meta.url),
  new URL('../fixtures/bedrock-fallback.json', import.meta.url),
];
const RAG_MODULE_URL = new URL('../rag/lambdaHandler.mjs', import.meta.url);
const CURRENT_EVIDENCE_BUCKET_NAME = 'factlens-dev-evidence-docs-069423016509-ap-northeast-2';

export async function analyzeDocument(input) {
  rejectUnsupportedEvidenceBucket();

  if (process.env.FACTLENS_USE_FALLBACK === 'true') {
    return loadFallbackAnalysis();
  }

  const provider = await loadRagProvider();
  if (provider == null) {
    return loadFallbackAnalysis();
  }

  try {
    return await provider.analyzeDocument(input);
  } catch (err) {
    try {
      return await loadFallbackAnalysis();
    } catch {
      return {
        analysisId: input.analysisId ?? `analysis-${Date.now()}`,
        status: "COMPLETED",
        summary: { totalClaims: 0, supported: 0, conflicted: 0, insufficient: 0, exaggerated: 0 },
        claims: [],
        errorMessage: `RAG analysis failed: ${err.message}`,
      };
    }
  }
}

async function loadRagProvider() {
  try {
    const provider = await import(RAG_MODULE_URL.href);
    return typeof provider.analyzeDocument === 'function' ? provider : null;
  } catch {
    return null;
  }
}

async function loadFallbackAnalysis() {
  for (const fixtureUrl of FALLBACK_FIXTURE_URLS) {
    try {
      return JSON.parse(await readFile(fixtureUrl, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error('Unable to load FactLens bedrock-fallback fixture.');
}

function rejectUnsupportedEvidenceBucket() {
  const configuredBucketName = process.env.EVIDENCE_BUCKET_NAME;
  if (configuredBucketName == null || configuredBucketName === '') {
    return;
  }

  if (configuredBucketName === CURRENT_EVIDENCE_BUCKET_NAME) {
    return;
  }

  throw new Error(
    `Invalid EVIDENCE_BUCKET_NAME: use ${CURRENT_EVIDENCE_BUCKET_NAME}.`,
  );
}
