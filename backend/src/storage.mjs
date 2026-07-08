import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { isValidAnalysisId } from './contract.mjs';

const DEFAULT_STORAGE_MODE = 'memory';
const DEFAULT_LOCAL_STORE_PATH = join(tmpdir(), 'factlens-backend', 'analyses.json');

export class StorageConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageConfigurationError';
  }
}

export function createStorage(options = {}) {
  const mode = options.mode ?? process.env.FACTLENS_STORAGE_MODE ?? DEFAULT_STORAGE_MODE;

  if (mode === 'memory') {
    return createMemoryStorage(options);
  }

  if (mode === 'local-file') {
    return createLocalFileStorage(options);
  }

  if (mode === 'dynamodb') {
    return createDynamoDbStorage(options);
  }

  throw new StorageConfigurationError(`Unsupported FACTLENS_STORAGE_MODE: ${mode}.`);
}

export function createMemoryStorage(options = {}) {
  const analyses = new Map();

  for (const analysis of options.analyses ?? []) {
    const storedAnalysis = toStoredAnalysis(analysis);
    analyses.set(storedAnalysis.analysisId, storedAnalysis);
  }

  return {
    async getAnalysis(analysisId) {
      const analysis = analyses.get(analysisId);
      return analysis == null ? null : cloneJson(analysis);
    },

    async putAnalysis(analysis) {
      const storedAnalysis = toStoredAnalysis(analysis);
      analyses.set(storedAnalysis.analysisId, storedAnalysis);
      return cloneJson(storedAnalysis);
    },
  };
}

export function createLocalFileStorage(options = {}) {
  const filePath = options.filePath ?? process.env.FACTLENS_LOCAL_STORE_PATH ?? DEFAULT_LOCAL_STORE_PATH;

  return {
    async getAnalysis(analysisId) {
      const store = await readLocalStore(filePath);
      const analysis = store.analyses[analysisId];
      return analysis == null ? null : cloneJson(analysis);
    },

    async putAnalysis(analysis) {
      const storedAnalysis = toStoredAnalysis(analysis);
      const store = await readLocalStore(filePath);
      store.analyses[storedAnalysis.analysisId] = storedAnalysis;
      await writeLocalStore(filePath, store);
      return cloneJson(storedAnalysis);
    },
  };
}

export function createDynamoDbStorage(options = {}) {
  const tableName = options.tableName ?? process.env.ANALYSES_TABLE_NAME;
  let sdkPromise;

  return {
    async getAnalysis(analysisId) {
      assertDynamoDbTableName(tableName);
      const { client, GetItemCommand } = await getDynamoDbSdk();
      const response = await client.send(new GetItemCommand({
        TableName: tableName,
        Key: {
          analysisId: { S: analysisId },
        },
      }));
      const analysisJson = response.Item?.analysisJson?.S;
      return analysisJson == null ? null : JSON.parse(analysisJson);
    },

    async putAnalysis(analysis) {
      assertDynamoDbTableName(tableName);
      const storedAnalysis = toStoredAnalysis(analysis);
      const { client, PutItemCommand } = await getDynamoDbSdk();
      await client.send(new PutItemCommand({
        TableName: tableName,
        Item: {
          analysisId: { S: storedAnalysis.analysisId },
          status: { S: storedAnalysis.status },
          analysisJson: { S: JSON.stringify(storedAnalysis) },
          updatedAt: { S: new Date().toISOString() },
        },
      }));
      return cloneJson(storedAnalysis);
    },
  };

  async function getDynamoDbSdk() {
    if (options.client != null && options.commands != null) {
      return {
        client: options.client,
        GetItemCommand: options.commands.GetItemCommand,
        PutItemCommand: options.commands.PutItemCommand,
      };
    }

    sdkPromise ??= loadDynamoDbSdk(options.client);
    return sdkPromise;
  }
}

async function readLocalStore(filePath) {
  try {
    return normalizeLocalStore(JSON.parse(await readFile(filePath, 'utf8')));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { analyses: {} };
    }

    throw error;
  }
}

async function writeLocalStore(filePath, store) {
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  await rename(tempPath, filePath);
}

function normalizeLocalStore(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw new StorageConfigurationError('Local analysis store must contain a JSON object.');
  }

  if (value.analyses == null) {
    return { analyses: {} };
  }

  if (typeof value.analyses !== 'object' || Array.isArray(value.analyses)) {
    throw new StorageConfigurationError('Local analysis store analyses must be a JSON object.');
  }

  return { analyses: value.analyses };
}

async function loadDynamoDbSdk(clientOverride) {
  let sdk;

  try {
    sdk = await import('@aws-sdk/client-dynamodb');
  } catch (error) {
    throw new StorageConfigurationError(
      `DynamoDB storage requires @aws-sdk/client-dynamodb to be installed: ${error.message}`,
    );
  }

  return {
    client: clientOverride ?? new sdk.DynamoDBClient({}),
    GetItemCommand: sdk.GetItemCommand,
    PutItemCommand: sdk.PutItemCommand,
  };
}

function assertDynamoDbTableName(tableName) {
  if (typeof tableName !== 'string' || tableName.trim() === '') {
    throw new StorageConfigurationError('DynamoDB storage requires ANALYSES_TABLE_NAME.');
  }
}

function toStoredAnalysis(analysis) {
  if (analysis == null || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new StorageConfigurationError('Stored analysis must be an object.');
  }

  if (!isValidAnalysisId(analysis.analysisId)) {
    throw new StorageConfigurationError('Stored analysis.analysisId must match analysis-<uuid4>.');
  }

  return cloneJson({
    analysisId: analysis.analysisId,
    status: analysis.status,
    errorMessage: analysis.errorMessage,
    summary: analysis.summary,
    claims: analysis.claims,
  });
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
