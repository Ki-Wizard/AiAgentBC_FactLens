import { isValidAnalysisId, parseAnalyzeRequest, RequestValidationError } from './contract.mjs';
import {
  errorResponse,
  optionsResponse,
  InvalidAnalysisResponseError,
  jsonResponse,
  normalizeAnalysisResponse,
} from './response.mjs';
import { createStorage } from './storage.mjs';
import { archiveRequestText } from './inputArchive.mjs';

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

      if (route.type === 'options') {
        return optionsResponse();
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
  try {
    const rawAnalysis = await analyzer(request);
    const normalizedAnalysis = normalizeAnalysisResponse(rawAnalysis);
    try {
      await archiveRequestText(normalizedAnalysis.analysisId, request.documentText);
    } catch (error) {
      console.error('[factlens] failed to archive input text', {
        analysisId: normalizedAnalysis.analysisId,
        error: error?.message ?? String(error),
      });
    }
    const storedAnalysis = await storage.putAnalysis(normalizedAnalysis);
    return jsonResponse(200, storedAnalysis);
  } catch (error) {
    if (error instanceof InvalidAnalysisResponseError) {
      throw error;
    }

    const normalizedError = normalizeAnalysisResponse({
      status: 'FAILED',
      claims: [],
      errorMessage: error?.message ?? 'analysis failed',
    });
    normalizedError.errorMessage = error?.message ?? 'analysis failed';
    const storedError = await storage.putAnalysis(normalizedError);
    return jsonResponse(200, storedError);
  }
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

  if (method === 'OPTIONS') {
    return { type: 'options' };
  }

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
