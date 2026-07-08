const LABELS = ["근거 있음", "공식 근거와 충돌", "근거 부족", "과장 표현"];

function toText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toConfidence(value) {
  return Math.max(0, Math.min(1, toNumber(value, 0)));
}

function normalizeLabel(label) {
  return LABELS.includes(label) ? label : "근거 부족";
}

export function getClaimKey(claim, index) {
  return toText(claim?.claimId, `claim-${index + 1}`);
}

export function getClaimText(claim) {
  return toText(claim?.text) || toText(claim?.claimText);
}

export function getSourceTarget(source) {
  return toText(source?.url) || toText(source?.uri);
}

export function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .map((source) => {
      if (typeof source === "string") {
        return { title: source, url: "", uri: "", excerpt: "" };
      }

      const target = getSourceTarget(source);

      return {
        title: toText(source?.title, target || "출처"),
        url: toText(source?.url),
        uri: toText(source?.uri),
        excerpt: toText(source?.excerpt),
      };
    })
    .filter((source) => source.title || getSourceTarget(source));
}

export function normalizeClaims(claims) {
  if (!Array.isArray(claims)) {
    return [];
  }

  return claims.map((claim, index) => ({
    claimId: getClaimKey(claim, index),
    text: getClaimText(claim),
    label: normalizeLabel(claim?.label),
    confidence: toConfidence(claim?.confidence),
    reason: toText(claim?.reason, "판정 이유가 제공되지 않았습니다."),
    correctedText:
      claim?.correctedText == null
        ? "수정 제안이 제공되지 않았습니다."
        : toText(claim.correctedText, "수정 제안이 제공되지 않았습니다."),
    sources: normalizeSources(claim?.sources),
    evidence: Array.isArray(claim?.evidence) ? claim.evidence : [],
  }));
}

function countByLabel(claims, label) {
  return claims.filter((claim) => claim.label === label).length;
}

export function normalizeAnalysisResult(result) {
  const claims = normalizeClaims(result?.claims);
  const computedSummary = {
    totalClaims: claims.length,
    supported: countByLabel(claims, "근거 있음"),
    conflicted: countByLabel(claims, "공식 근거와 충돌"),
    insufficient: countByLabel(claims, "근거 부족"),
    exaggerated: countByLabel(claims, "과장 표현"),
  };

  return {
    analysisId: toText(result?.analysisId, "analysis-local-fallback"),
    status: toText(result?.status, "COMPLETED"),
    summary: {
      totalClaims: toNumber(result?.summary?.totalClaims, computedSummary.totalClaims),
      supported: toNumber(result?.summary?.supported, computedSummary.supported),
      conflicted: toNumber(result?.summary?.conflicted, computedSummary.conflicted),
      insufficient: toNumber(result?.summary?.insufficient, computedSummary.insufficient),
      exaggerated: toNumber(result?.summary?.exaggerated, computedSummary.exaggerated),
    },
    claims,
  };
}
