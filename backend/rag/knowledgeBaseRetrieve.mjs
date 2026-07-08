import { createHash, createHmac } from "node:crypto";

const DEFAULT_LIMIT = 5;

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toDateStamp(amzDate) {
  return amzDate.slice(0, 8);
}

function signingKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function canonicalHeaders(headers) {
  return Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), String(value).trim().replace(/\s+/g, " ")])
    .sort(([a], [b]) => a.localeCompare(b));
}

function authorizationHeader({ accessKeyId, secretAccessKey }, request, region, service, amzDate, body) {
  const dateStamp = toDateStamp(amzDate);
  const canonicalHeaderPairs = canonicalHeaders(request.headers);
  const signedHeaders = canonicalHeaderPairs.map(([key]) => key).join(";");
  const canonicalHeaderString = canonicalHeaderPairs.map(([key, value]) => `${key}:${value}\n`).join("");
  const canonicalRequest = [
    request.method,
    request.path,
    "",
    canonicalHeaderString,
    signedHeaders,
    hash(body),
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(secretAccessKey, dateStamp, region, service), stringToSign, "hex");

  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function credentialsFromEnv() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

function normalizeKbResult(rawResult, index, claim, context) {
  const metadata = rawResult.metadata ?? {};
  const location = rawResult.location ?? {};
  const source =
    location.s3Location?.uri ??
    location.webLocation?.url ??
    location.confluenceLocation?.url ??
    location.salesforceLocation?.url ??
    metadata["x-amz-bedrock-kb-source-uri"] ??
    "";

  return {
    id: `kb-${String(index + 1).padStart(3, "0")}`,
    title: metadata.title ?? metadata["x-amz-bedrock-kb-document-page-number"] ?? source ?? "Knowledge Base result",
    sourceType: "bedrock_knowledge_base",
    url: source,
    service: "Bedrock Knowledge Base",
    category: claim.category ?? "other",
    keywords: [],
    summaryKo: "Bedrock Knowledge Base에서 검색된 근거입니다.",
    evidenceText: rawResult.content?.text ?? "",
    searchProvider: "bedrock_knowledge_base",
    searchQuery: context.query,
    retrievedAt: context.retrievedAt,
    score: rawResult.score,
  };
}

export async function retrieveKnowledgeBaseEvidence(claim, options = {}) {
  const knowledgeBaseId = options.knowledgeBaseId ?? process.env.BEDROCK_KNOWLEDGE_BASE_ID;
  if (!knowledgeBaseId) {
    return {
      provider: "bedrock_knowledge_base",
      query: null,
      results: [],
      disabledReason: "BEDROCK_KNOWLEDGE_BASE_ID is not configured.",
    };
  }

  const credentials = credentialsFromEnv();
  if (!credentials) {
    return {
      provider: "bedrock_knowledge_base",
      query: null,
      results: [],
      disabledReason: "AWS credentials are not available for direct Retrieve signing.",
    };
  }

  const region = options.region ?? process.env.AWS_REGION ?? "ap-northeast-2";
  const limit = Number(options.limit ?? process.env.BEDROCK_KB_RESULT_LIMIT ?? DEFAULT_LIMIT);
  const query = String(claim.normalizedQuery || claim.text || "").trim();
  const endpoint = `https://bedrock-agent-runtime.${region}.amazonaws.com`;
  const path = `/knowledgebases/${encodeURIComponent(knowledgeBaseId)}/retrieve`;
  const body = JSON.stringify({
    retrievalQuery: {
      text: query,
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: limit,
      },
    },
  });
  const amzDate = toAmzDate(new Date());
  const request = {
    method: "POST",
    path,
    headers: {
      "content-type": "application/json",
      host: `bedrock-agent-runtime.${region}.amazonaws.com`,
      "x-amz-date": amzDate,
    },
  };

  if (credentials.sessionToken) {
    request.headers["x-amz-security-token"] = credentials.sessionToken;
  }

  request.headers.authorization = authorizationHeader(
    credentials,
    request,
    region,
    "bedrock",
    amzDate,
    body,
  );

  try {
    const response = await fetch(`${endpoint}${path}`, {
      method: request.method,
      headers: request.headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Knowledge Base retrieve returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const retrievedAt = new Date().toISOString();
    return {
      provider: "bedrock_knowledge_base",
      query,
      results: (payload.retrievalResults ?? [])
        .slice(0, limit)
        .map((result, index) =>
          normalizeKbResult(result, index, claim, {
            query,
            retrievedAt,
          }),
        ),
      disabledReason: null,
    };
  } catch (error) {
    return {
      provider: "bedrock_knowledge_base",
      query,
      results: [],
      disabledReason: error.message,
    };
  }
}
