import { isValidAnalysisId, parseAnalyzeRequest, RequestValidationError } from './contract.mjs';
import {
  errorResponse,
  InvalidAnalysisResponseError,
  jsonResponse,
  normalizeAnalysisResponse,
} from './response.mjs';
import { createStorage } from './storage.mjs';

export function createApiHandler(options = {}) {
  const analyzer = options.analyzer ?? defaultAnalyzer;
  const storage = options.storage ?? createStorage(options.storageOptions);

  return async function handler(event) {
    const route = resolveRoute(event);

    try {
      if (route.type === 'analyze') {
        return await handleAnalyze(event, analyzer, storage);
      }

      if (route.type === 'getAnalysis') {
        return await handleGetAnalysis(route.analysisId, storage);
      }

      return errorResponse(404, 'NOT_FOUND', 'Route not found.');
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return errorResponse(error.statusCode, error.code, error.message);
      }

      if (error instanceof InvalidAnalysisResponseError) {
        return errorResponse(502, 'INVALID_ANALYSIS_RESPONSE', error.message);
      }

      throw error;
    }
  };
}

export const handler = createApiHandler();

async function handleAnalyze(event, analyzer, storage) {
  const request = parseAnalyzeRequest(event);
  const rawAnalysis = await analyzer(request);
  const normalizedAnalysis = normalizeAnalysisResponse(rawAnalysis);
  const storedAnalysis = await storage.putAnalysis(normalizedAnalysis);
  return jsonResponse(200, storedAnalysis);
}

async function handleGetAnalysis(analysisId, storage) {
  if (!isValidAnalysisId(analysisId)) {
    return analysisNotFoundResponse();
  }

  const analysis = await storage.getAnalysis(analysisId);
  if (analysis == null) {
    return analysisNotFoundResponse();
  }

  return jsonResponse(200, analysis);
}

function analysisNotFoundResponse() {
  return errorResponse(404, 'ANALYSIS_NOT_FOUND', 'Analysis not found.');
}

async function defaultAnalyzer(input) {
  const adapter = await import('./ragAdapter.mjs');
  return adapter.analyzeDocument(input);
}

function resolveRoute(event) {
  const method = (event?.requestContext?.http?.method ?? event?.httpMethod ?? '').toUpperCase();
  const path = event?.rawPath ?? event?.requestContext?.http?.path ?? event?.path ?? '';

  if (method === 'POST' && path === '/analyze') {
    return { type: 'analyze' };
  }

  if (method === 'GET') {
    const match = /^\/analyses\/([^/]+)$/.exec(path);
    if (match != null) {
      return { type: 'getAnalysis', analysisId: match[1] };
    }
  }

  return { type: 'unknown' };
}
