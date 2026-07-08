import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT_URL = new URL('../../', import.meta.url);
const BACKEND_ROOT_URL = new URL('../', import.meta.url);
const ADAPTER_URL = new URL('../src/ragAdapter.mjs', import.meta.url).href;
const RESPONSE_URL = new URL('../src/response.mjs', import.meta.url).href;
const CONTRACT_URL = new URL('../src/contract.mjs', import.meta.url).href;
const RAG_DIR_URL = new URL('rag/', BACKEND_ROOT_URL);
const RAG_MODULE_URL = new URL('lambdaHandler.mjs', RAG_DIR_URL);
const UNSUPPORTED_EVIDENCE_BUCKET_NAME = 'unsupported-evidence-bucket';

test('ragAdapter: FACTLENS_USE_FALLBACK=true returns fixture without importing RAG', async () => {
  await withRagModule(`
throw new Error('forced fallback should not import the RAG module');
export async function analyzeDocument() {
  throw new Error('unreachable');
}
`, async () => {
    await runNode(`
import assert from 'node:assert/strict';
const { analyzeDocument } = await import(${JSON.stringify(ADAPTER_URL)});
const result = await analyzeDocument({ documentText: 'AWS Lambda runs code.', maxClaims: 2 });
assert.equal(result.analysisId, 'analysis-fallback-001');
assert.equal(result.status, 'COMPLETED');
assert.equal(result.claims.length, 4);
assert.equal(result.claims.some((claim) => Object.hasOwn(claim, 'claimText')), false);
`, { FACTLENS_USE_FALLBACK: 'true' });
  });
});

test('ragAdapter: provider exception falls back to bedrock-fallback fixture', async () => {
  const markerPath = join(tmpdir(), `factlens-rag-provider-called-${process.pid}-${Date.now()}.json`);

  try {
    await withRagModule(`
import { writeFileSync } from 'node:fs';

export async function analyzeDocument(input) {
  writeFileSync(${JSON.stringify(markerPath)}, JSON.stringify(input), 'utf8');
  throw new Error('provider failed');
}
`, async () => {
      await runNode(`
import assert from 'node:assert/strict';
const { analyzeDocument } = await import(${JSON.stringify(ADAPTER_URL)});
const result = await analyzeDocument({ documentText: 'Provider should be attempted.', maxClaims: 3 });
assert.equal(result.analysisId, 'analysis-fallback-001');
assert.equal(result.claims.length, 4);
`, { FACTLENS_USE_FALLBACK: undefined });
    });

    assert.deepEqual(JSON.parse(await readFile(markerPath, 'utf8')), {
      documentText: 'Provider should be attempted.',
      maxClaims: 3,
    });
  } finally {
    await rm(markerPath, { force: true });
  }
});

test('ragAdapter: missing RAG module falls back to bedrock-fallback fixture', async () => {
  await withoutRagModule(async () => {
    await runNode(`
import assert from 'node:assert/strict';
const { analyzeDocument } = await import(${JSON.stringify(ADAPTER_URL)});
const result = await analyzeDocument({ documentText: 'No provider is available.', maxClaims: 4 });
assert.equal(result.analysisId, 'analysis-fallback-001');
assert.equal(result.status, 'COMPLETED');
assert.deepEqual(result.claims.map((claim) => claim.label), [
  '근거 있음',
  '공식 근거와 충돌',
  '근거 부족',
  '과장 표현',
]);
`, { FACTLENS_USE_FALLBACK: undefined });
  });
});

test('ragAdapter: unsupported evidence bucket is rejected before fallback', async () => {
  await runNode(`
import assert from 'node:assert/strict';
const { analyzeDocument } = await import(${JSON.stringify(ADAPTER_URL)});

await assert.rejects(
  analyzeDocument({ documentText: 'Reject stale bucket.', maxClaims: 1 }),
  /Invalid EVIDENCE_BUCKET_NAME: use factlens-dev-evidence-docs-069423016509-ap-northeast-2/,
);
`, {
    EVIDENCE_BUCKET_NAME: UNSUPPORTED_EVIDENCE_BUCKET_NAME,
    FACTLENS_USE_FALLBACK: 'true',
  });
});

test('ragAdapter: fallback fixture is compatible with normalizeAnalysisResponse', async () => {
  await withoutRagModule(async () => {
    await runNode(`
import assert from 'node:assert/strict';
const { analyzeDocument } = await import(${JSON.stringify(ADAPTER_URL)});
const { normalizeAnalysisResponse } = await import(${JSON.stringify(RESPONSE_URL)});
const { ALLOWED_LABELS, ANALYSIS_ID_PATTERN, CLAIM_RESPONSE_FIELDS } = await import(${JSON.stringify(CONTRACT_URL)});

const result = await analyzeDocument({ documentText: 'Normalize fallback schema.', maxClaims: 10 });
const normalized = normalizeAnalysisResponse(result);
assert.match(normalized.analysisId, ANALYSIS_ID_PATTERN);
assert.equal(normalized.status, 'COMPLETED');
assert.deepEqual(normalized.summary, {
  totalClaims: 4,
  supported: 1,
  conflicted: 1,
  insufficient: 1,
  exaggerated: 1,
});
assert.deepEqual(new Set(normalized.claims.map((claim) => claim.label)), new Set(ALLOWED_LABELS));

for (const claim of normalized.claims) {
  assert.deepEqual(Object.keys(claim), CLAIM_RESPONSE_FIELDS);
  assert.equal(Object.hasOwn(claim, 'claimText'), false);
}
`, { FACTLENS_USE_FALLBACK: 'true' });
  });
});

async function runNode(source, envOverrides = {}) {
  const childEnv = buildChildEnv(envOverrides);

  try {
    await execFileAsync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: fileURLToPath(PROJECT_ROOT_URL),
      env: childEnv,
    });
  } catch (error) {
    error.message = `${error.message}\nstdout:\n${error.stdout ?? ''}\nstderr:\n${error.stderr ?? ''}`;
    throw error;
  }
}

function buildChildEnv(overrides) {
  const childEnv = {
    ...process.env,
    FACTLENS_USE_FALLBACK: undefined,
    EVIDENCE_BUCKET_NAME: undefined,
    ...overrides,
  };

  for (const [key, value] of Object.entries(childEnv)) {
    if (value === undefined) {
      delete childEnv[key];
    }
  }

  return childEnv;
}

async function withRagModule(source, callback) {
  const hadRagDir = await fileExists(RAG_DIR_URL);
  const backupUrl = await moveExistingRagModule();

  await mkdir(RAG_DIR_URL, { recursive: true });
  await writeFile(RAG_MODULE_URL, source, 'utf8');

  try {
    return await callback();
  } finally {
    await rm(RAG_MODULE_URL, { force: true });
    await restoreExistingRagModule(backupUrl);

    if (!hadRagDir) {
      await rmdir(RAG_DIR_URL).catch(() => {});
    }
  }
}

async function withoutRagModule(callback) {
  const backupUrl = await moveExistingRagModule();

  try {
    return await callback();
  } finally {
    await restoreExistingRagModule(backupUrl);
  }
}

async function moveExistingRagModule() {
  if (!(await fileExists(RAG_MODULE_URL))) {
    return null;
  }

  const backupUrl = new URL(`lambdaHandler.mjs.${process.pid}.${Date.now()}.bak`, RAG_DIR_URL);
  await rename(RAG_MODULE_URL, backupUrl);
  return backupUrl;
}

async function restoreExistingRagModule(backupUrl) {
  if (backupUrl == null) {
    return;
  }

  await mkdir(RAG_DIR_URL, { recursive: true });
  await rename(backupUrl, RAG_MODULE_URL);
}

async function fileExists(fileUrl) {
  try {
    await access(fileUrl);
    return true;
  } catch {
    return false;
  }
}
