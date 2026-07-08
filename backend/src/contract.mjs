export const DEFAULT_MAX_CLAIMS = 10;
export const MIN_MAX_CLAIMS = 1;
export const MAX_MAX_CLAIMS = 20;

export const ALLOWED_LABELS = Object.freeze([
  '근거 있음',
  '공식 근거와 충돌',
  '근거 부족',
  '과장 표현',
]);

export const CLAIM_RESPONSE_FIELDS = Object.freeze([
  'claimId',
  'text',
  'label',
  'confidence',
  'reason',
  'correctedText',
  'sources',
  'evidence',
]);

export const ANALYSIS_ID_PATTERN = /^analysis-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ERROR_MESSAGES = Object.freeze({
  INVALID_DOCUMENT_TEXT: 'documentText must be a non-empty string.',
  INVALID_JSON: 'Request body must be valid JSON.',
  INVALID_MAX_CLAIMS: 'maxClaims must be an integer from 1 through 20.',
});

export class RequestValidationError extends Error {
  constructor(code) {
    super(ERROR_MESSAGES[code] ?? 'Invalid request.');
    this.name = 'RequestValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

export function parseAnalyzeRequest(event) {
  const payload = parseJsonEventBody(event);

  if (typeof payload?.documentText !== 'string') {
    throw new RequestValidationError('INVALID_DOCUMENT_TEXT');
  }

  const documentText = payload.documentText.trim();
  if (documentText.length === 0) {
    throw new RequestValidationError('INVALID_DOCUMENT_TEXT');
  }

  const maxClaims = payload.maxClaims ?? DEFAULT_MAX_CLAIMS;
  if (!Number.isInteger(maxClaims) || maxClaims < MIN_MAX_CLAIMS || maxClaims > MAX_MAX_CLAIMS) {
    throw new RequestValidationError('INVALID_MAX_CLAIMS');
  }

  return { documentText, maxClaims };
}

export function parseJsonEventBody(event) {
  const bodyText = decodeEventBody(event);
  if (bodyText === '') {
    return {};
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new RequestValidationError('INVALID_JSON');
  }
}

export function isValidAnalysisId(value) {
  return typeof value === 'string' && ANALYSIS_ID_PATTERN.test(value);
}

function decodeEventBody(event) {
  if (event?.body == null) {
    return '';
  }

  if (typeof event.body !== 'string') {
    throw new RequestValidationError('INVALID_JSON');
  }

  if (event.isBase64Encoded === true) {
    return Buffer.from(event.body, 'base64').toString('utf8');
  }

  return event.body;
}
