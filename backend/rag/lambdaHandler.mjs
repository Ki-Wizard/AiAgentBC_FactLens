import { fallbackJudgeClaim, summarizeJudgments } from "./fallbackJudge.mjs";
import { searchInternetEvidence } from "./internetSearchEvidence.mjs";
import { retrieveKnowledgeBaseEvidence } from "./knowledgeBaseRetrieve.mjs";
import {
  loadEvidenceDocs,
  retrieveEvidence,
  toJudgeEvidence,
} from "./retrieveEvidence.mjs";

function shouldUseInternetSearch(input) {
  return input.searchMode === "internet" || process.env.FACTLENS_SEARCH_MODE === "internet";
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function normalizeEventBody(event) {
  if (!event) return {};
  if (typeof event.body === "string") {
    return event.body ? JSON.parse(event.body) : {};
  }
  return event.body ?? event;
}

function extractClaimsFromText(documentText, maxClaims = 10) {
  const sentences = String(documentText ?? "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !sentence.startsWith("#"))
    .filter((sentence) => !/^이 문서는/.test(sentence));

  return sentences
    .slice(0, maxClaims)
    .map((text, index) => ({
      claimId: `claim-${String(index + 1).padStart(3, "0")}`,
      text,
      normalizedQuery: text,
      category: "other",
      containsAbsoluteLanguage:
        /(무조건|항상|완전히|절대|100%|모든|always|never|completely)/i.test(
          text,
        ),
    }));
}

export async function analyzeDocument(input) {
  const evidenceDocs = await loadEvidenceDocs();
  const maxClaims = input.maxClaims ?? 10;
  const claims = input.claims ?? extractClaimsFromText(input.documentText, maxClaims);
  const useInternetSearch = shouldUseInternetSearch(input);

  const judgments = [];
  for (const claim of claims) {
    const fallbackEvidence = await retrieveEvidence(claim, {
      evidenceDocs,
      limit: input.evidenceLimit ?? 3,
    });
    const knowledgeBaseSearch = await retrieveKnowledgeBaseEvidence(claim, {
      limit: input.evidenceLimit ?? 5,
    });
    const internetSearch = useInternetSearch
      ? await searchInternetEvidence(claim, { limit: input.evidenceLimit ?? 3 })
      : { provider: "disabled", query: null, results: [], disabledReason: null };
    const evidence = knowledgeBaseSearch.results.length
      ? knowledgeBaseSearch.results
      : internetSearch.results.length
        ? internetSearch.results
        : fallbackEvidence;
    const judgeEvidence = evidence.length ? evidence : evidenceDocs;

    // MVP fallback: deterministic judgment keeps the demo alive when Bedrock
    // Knowledge Bases or Bedrock Runtime permissions are not ready.
    const judgment = fallbackJudgeClaim(
      claim,
      judgeEvidence,
    );
    judgments.push({
      ...judgment,
      evidence: toJudgeEvidence(evidence),
    });
  }

  return {
    analysisId: input.analysisId ?? `analysis-${Date.now()}`,
    status: "COMPLETED",
    summary: summarizeJudgments(judgments),
    claims: judgments,
  };
}

export async function handler(event) {
  try {
    const input = normalizeEventBody(event);
    if (!input.documentText && !Array.isArray(input.claims)) {
      return jsonResponse(400, {
        error: true,
        stage: "request_validation",
        message: "documentText or claims is required",
        fallbackAvailable: true,
      });
    }

    return jsonResponse(200, await analyzeDocument(input));
  } catch (error) {
    return jsonResponse(500, {
      error: true,
      stage: "rag_analysis",
      message: error.message,
      fallbackAvailable: true,
    });
  }
}
