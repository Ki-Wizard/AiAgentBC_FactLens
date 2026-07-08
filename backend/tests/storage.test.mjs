import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  createDynamoDbStorage,
  createLocalFileStorage,
  createMemoryStorage,
  StorageConfigurationError,
} from '../src/storage.mjs';

const ANALYSIS_ID = 'analysis-00000000-0000-4000-8000-000000000000';
const UNKNOWN_ANALYSIS_ID = 'analysis-00000000-0000-4000-8000-000000000001';

test('storage: memory stores and reads analysis without raw document text', async () => {
  const storage = createMemoryStorage();
  const analysis = sampleAnalysis({ documentText: 'Raw deck text must not be stored.' });

  const stored = await storage.putAnalysis(analysis);

  assert.deepEqual(stored, sampleAnalysis());
  assert.equal(Object.hasOwn(stored, 'documentText'), false);

  stored.claims[0].text = 'Mutating caller copy must not alter storage.';
  assert.deepEqual(await storage.getAnalysis(ANALYSIS_ID), sampleAnalysis());
});

test('storage: local-file roundtrips analysis through a JSON file', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'factlens-storage-'));
  const filePath = join(tempDir, 'analyses.json');

  try {
    const firstStorage = createLocalFileStorage({ filePath });
    await firstStorage.putAnalysis(sampleAnalysis());

    const secondStorage = createLocalFileStorage({ filePath });
    assert.deepEqual(await secondStorage.getAnalysis(ANALYSIS_ID), sampleAnalysis());
    assert.equal(await secondStorage.getAnalysis(UNKNOWN_ANALYSIS_ID), null);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('storage: dynamodb mode uses an injected mock client without live AWS', async () => {
  let item;
  const client = {
    async send(command) {
      if (command instanceof PutItemCommand) {
        item = command.input.Item;
        return {};
      }

      if (command instanceof GetItemCommand) {
        return { Item: item };
      }

      throw new Error('unexpected command');
    },
  };
  const storage = createDynamoDbStorage({
    tableName: 'factlens-analyses-test',
    client,
    commands: { GetItemCommand, PutItemCommand },
  });

  await storage.putAnalysis(sampleAnalysis({ documentText: 'Do not persist me.' }));

  assert.equal(item.documentText, undefined);
  assert.equal(item.analysisId.S, ANALYSIS_ID);
  assert.deepEqual(await storage.getAnalysis(ANALYSIS_ID), sampleAnalysis());
});

test('storage: dynamodb mode throws clear error when table config is missing', async () => {
  const storage = createDynamoDbStorage({
    tableName: '',
    client: { send: async () => ({}) },
    commands: { GetItemCommand, PutItemCommand },
  });

  await assert.rejects(
    storage.putAnalysis(sampleAnalysis()),
    (error) => error instanceof StorageConfigurationError && /ANALYSES_TABLE_NAME/.test(error.message),
  );
});

class GetItemCommand {
  constructor(input) {
    this.input = input;
  }
}

class PutItemCommand {
  constructor(input) {
    this.input = input;
  }
}

function sampleAnalysis(overrides = {}) {
  return {
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
    ...overrides,
  };
}
