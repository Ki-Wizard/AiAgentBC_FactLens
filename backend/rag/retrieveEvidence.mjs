import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_EVIDENCE_PATH = path.resolve(
  __dirname,
  "../../sample-data/evidence_docs.json",
);

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function scoreEvidence(claim, evidence) {
  const claimText = normalizeText(
    [
      claim.text,
      claim.normalizedQuery,
      claim.category,
      claim.containsAbsoluteLanguage ? "absolute exaggerated" : "",
    ].join(" "),
  );
  const claimTokens = new Set(tokenize(claimText));
  const keywordScore = (evidence.keywords ?? []).reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    if (claimText.includes(normalizedKeyword)) return score + 4;
    return score + tokenize(normalizedKeyword).filter((token) =>
      claimTokens.has(token),
    ).length;
  }, 0);

  const fieldTokens = tokenize(
    [
      evidence.service,
      evidence.category,
      evidence.title,
      evidence.summaryKo,
      evidence.evidenceText,
    ].join(" "),
  );
  const overlapScore = fieldTokens.reduce(
    (score, token) => score + (claimTokens.has(token) ? 1 : 0),
    0,
  );

  const categoryScore =
    claim.category && claim.category === evidence.category ? 3 : 0;

  if (keywordScore === 0 && categoryScore === 0) return 0;

  return keywordScore * 2 + Math.min(overlapScore, 3) + categoryScore;
}

export async function loadEvidenceDocs(evidencePath = DEFAULT_EVIDENCE_PATH) {
  const content = await fs.readFile(evidencePath, "utf8");
  return JSON.parse(content);
}

export async function retrieveEvidence(claim, options = {}) {
  const evidenceDocs =
    options.evidenceDocs ??
    (await loadEvidenceDocs(options.evidencePath ?? DEFAULT_EVIDENCE_PATH));
  const limit = options.limit ?? 3;
  const minScore = options.minScore ?? 4;

  return evidenceDocs
    .map((evidence) => ({
      ...evidence,
      score: scoreEvidence(claim, evidence),
    }))
    .filter((evidence) => evidence.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...evidence }) => evidence);
}

export function toJudgeEvidence(evidenceDocs) {
  return evidenceDocs.map((evidence) => ({
    id: evidence.id,
    title: evidence.title,
    url: evidence.url,
    sourceType: evidence.sourceType,
    service: evidence.service,
    category: evidence.category,
    summaryKo: evidence.summaryKo,
    evidenceText: evidence.evidenceText,
  }));
}
