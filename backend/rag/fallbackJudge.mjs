const LABELS = {
  supported: "근거 있음",
  conflicted: "공식 근거와 충돌",
  insufficient: "근거 부족",
  exaggerated: "과장 표현",
};

const ABSOLUTE_PATTERN =
  /(무조건|항상|완전히|절대|100%|모든|always|never|completely|guarantee)/i;

const KOREAN_PROVINCES = [
  { canonical: "전라남도", aliases: ["전라남도", "전남"] },
  { canonical: "전라북도", aliases: ["전라북도", "전북"] },
  { canonical: "경상남도", aliases: ["경상남도", "경남"] },
  { canonical: "경상북도", aliases: ["경상북도", "경북"] },
  { canonical: "충청남도", aliases: ["충청남도", "충남"] },
  { canonical: "충청북도", aliases: ["충청북도", "충북"] },
  { canonical: "강원특별자치도", aliases: ["강원특별자치도", "강원도", "강원"] },
  { canonical: "경기도", aliases: ["경기도", "경기"] },
  { canonical: "제주특별자치도", aliases: ["제주특별자치도", "제주도", "제주"] },
];

const CONFLICT_RULES = [
  {
    test: /(lambda|람다).*(5분|5\s*minutes?|300초)/i,
    evidenceId: "aws-lambda-timeout",
    reason:
      "AWS Lambda 공식 quota 근거는 function timeout이 900초, 즉 15분이라고 설명한다. 따라서 최대 5분이라는 설명은 공식 근거와 충돌한다.",
    correctedText:
      "AWS Lambda 함수의 최대 실행 시간은 900초, 즉 15분으로 설정할 수 있다.",
  },
  {
    test: /(s3).*(1gb|1\s*gb|1기가)/i,
    evidenceId: "aws-s3-multipart-object-size",
    reason:
      "Amazon S3 multipart upload 제한은 1GB보다 큰 객체 업로드가 가능함을 보여준다. 객체당 최대 1GB라는 설명은 공식 근거와 충돌한다.",
    correctedText:
      "Amazon S3 객체는 1GB보다 큰 크기도 업로드할 수 있으며, 대용량 객체는 multipart upload를 사용할 수 있다.",
  },
  {
    test: /(dynamodb).*(관계형|relational|join|sql join|조인)/i,
    evidenceId: "aws-dynamodb-nosql-no-join",
    reason:
      "DynamoDB 공식 문서는 DynamoDB를 NoSQL 데이터베이스로 설명하며 JOIN operator를 지원하지 않는다고 설명한다.",
    correctedText:
      "Amazon DynamoDB는 서버리스 완전관리형 NoSQL 데이터베이스이며, 관계형 데이터베이스의 JOIN 중심 모델과 다르다.",
  },
  {
    test: /(spot|스팟).*(중단.*없|중단될 가능성.*없|always|항상|안전)/i,
    evidenceId: "aws-ec2-spot-interruption",
    reason:
      "EC2 Spot Instance는 중단될 수 있으며, Amazon EC2가 중단 2분 전에 interruption notice를 발행할 수 있다.",
    correctedText:
      "EC2 Spot Instances는 비용 최적화에 유용하지만 중단 가능성이 있으므로 중단 허용 워크로드에 적합하다.",
  },
];

const SUPPORTED_RULES = [
  {
    test: /(bedrock).*(foundation model|파운데이션|생성형|api|모델)/i,
    evidenceId: "aws-bedrock-foundation-models",
    reason:
      "Amazon Bedrock 공식 설명은 foundation model 접근을 제공하는 완전관리형 생성형 AI 서비스라고 설명한다.",
    correctedText:
      "Amazon Bedrock은 foundation model에 접근해 생성형 AI 애플리케이션을 만들고 확장할 수 있는 완전관리형 서비스다.",
  },
  {
    test: /(knowledge bases|knowledge base|지식|rag|검색)/i,
    evidenceId: "aws-bedrock-knowledge-bases-rag",
    reason:
      "Bedrock Knowledge Bases 공식 근거는 데이터 소스에서 관련 정보를 검색해 RAG 기반 응답을 구성할 수 있음을 설명한다.",
    correctedText:
      "Bedrock Knowledge Bases를 사용하면 데이터 소스를 검색해 RAG 기반 애플리케이션을 구성할 수 있다.",
  },
];

function sourceFromEvidence(evidence) {
  if (!evidence) return [];
  return [
    {
      title: evidence.title,
      url: evidence.url,
    },
  ];
}

function findEvidence(evidenceDocs, evidenceId) {
  return evidenceDocs.find((evidence) => evidence.id === evidenceId);
}

function normalizeForComparison(value) {
  let text = String(value ?? "").toLowerCase();
  for (const province of KOREAN_PROVINCES) {
    for (const alias of province.aliases) {
      text = text.replaceAll(alias.toLowerCase(), province.canonical.toLowerCase());
    }
  }
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactKorean(value) {
  return normalizeForComparison(value).replace(/\s+/g, "");
}

function claimTokens(value) {
  return normalizeForComparison(value)
    .split(" ")
    .map((token) => token.replace(/(은|는|이|가|을|를|에|에서|으로|로|이다|있다|하고|하는|한)$/u, ""))
    .filter((token) => token.length >= 2)
    .filter((token) => !["위치", "도시", "지역", "대한민국", "한국"].includes(token));
}

function provinceInText(value) {
  const compact = compactKorean(value);
  return KOREAN_PROVINCES.find((province) =>
    compact.includes(province.canonical.toLowerCase().replace(/\s+/g, "")),
  );
}

function subjectBeforeTopicMarker(value) {
  const match = /(.+?)(?:은|는|이|가)\s/.exec(String(value ?? ""));
  return match?.[1]?.trim();
}

function sourceFromInternetEvidence(evidence) {
  return evidence.slice(0, 3).map((item) => ({
    title: item.title,
    url: item.url,
  }));
}

function judgeFromInternetEvidence(claim, internetEvidence) {
  if (!internetEvidence.length) return null;

  const text = claim.text ?? "";
  const evidenceText = internetEvidence
    .map((item) => [item.title, item.summaryKo, item.evidenceText].filter(Boolean).join(" "))
    .join(" ");
  const normalizedEvidence = normalizeForComparison(evidenceText);
  const tokens = claimTokens(text);
  const matchedTokens = tokens.filter((token) => normalizedEvidence.includes(token));
  const claimProvince = provinceInText(text);
  const evidenceProvince = provinceInText(evidenceText);
  const subject = subjectBeforeTopicMarker(text);
  const subjectMatches = !subject || compactKorean(evidenceText).includes(compactKorean(subject));

  if (
    claimProvince &&
    evidenceProvince &&
    claimProvince.canonical !== evidenceProvince.canonical &&
    subjectMatches
  ) {
    return {
      claimId: claim.claimId,
      text,
      label: LABELS.conflicted,
      confidence: 0.78,
      reason:
        `검색된 근거는 ${subject ?? "대상"}의 위치를 ${evidenceProvince.canonical}로 보여주지만, claim은 ${claimProvince.canonical}라고 말해 서로 충돌한다.`,
      correctedText:
        `${subject ?? "해당 대상"}은 ${evidenceProvince.canonical}에 위치한다고 표현해야 한다.`,
      sources: sourceFromInternetEvidence(internetEvidence),
    };
  }

  if (tokens.length > 0 && matchedTokens.length >= Math.max(2, Math.ceil(tokens.length * 0.6))) {
    return {
      claimId: claim.claimId,
      text,
      label: LABELS.supported,
      confidence: 0.72,
      reason:
        "검색된 근거 후보의 제목과 요약이 claim의 핵심 표현과 충분히 일치한다.",
      correctedText: "수정이 필요하지 않다.",
      sources: sourceFromInternetEvidence(internetEvidence),
    };
  }

  return null;
}

export function fallbackJudgeClaim(claim, evidenceDocs) {
  const text = claim.text ?? "";
  const internetJudgment = judgeFromInternetEvidence(
    claim,
    evidenceDocs.filter((evidence) => evidence.sourceType === "internet_search"),
  );
  if (internetJudgment) {
    return internetJudgment;
  }

  const conflictRule = CONFLICT_RULES.find((rule) => rule.test.test(text));
  if (conflictRule) {
    const evidence = findEvidence(evidenceDocs, conflictRule.evidenceId);
    return {
      claimId: claim.claimId,
      text,
      label: LABELS.conflicted,
      confidence: 0.9,
      reason: conflictRule.reason,
      correctedText: conflictRule.correctedText,
      sources: sourceFromEvidence(evidence),
    };
  }

  if (/rag/i.test(text) && ABSOLUTE_PATTERN.test(text)) {
    const evidence = findEvidence(evidenceDocs, "rag-improves-not-eliminates");
    return {
      claimId: claim.claimId,
      text,
      label: LABELS.exaggerated,
      confidence: 0.82,
      reason:
        "근거는 RAG가 응답의 관련성과 정확성을 높인다고 설명하지만, 환각을 완전히 제거한다고 보장하지 않는다.",
      correctedText:
        "RAG는 관련 근거를 활용해 LLM 응답의 관련성과 정확성을 높이는 데 도움이 되지만, 출처 확인과 검증은 여전히 필요하다.",
      sources: sourceFromEvidence(evidence),
    };
  }

  const supportedRule = SUPPORTED_RULES.find((rule) => rule.test.test(text));
  if (supportedRule) {
    const evidence = findEvidence(evidenceDocs, supportedRule.evidenceId);
    return {
      claimId: claim.claimId,
      text,
      label: LABELS.supported,
      confidence: 0.86,
      reason: supportedRule.reason,
      correctedText: supportedRule.correctedText,
      sources: sourceFromEvidence(evidence),
    };
  }

  if (ABSOLUTE_PATTERN.test(text) && evidenceDocs.length > 0) {
    return {
      claimId: claim.claimId,
      text,
      label: LABELS.exaggerated,
      confidence: 0.65,
      reason:
        "claim이 절대적 표현을 사용하지만 제공된 근거만으로 그런 보장을 확인할 수 없다.",
      correctedText:
        "공식 근거를 확인할 수 있는 범위 안에서 더 구체적이고 검증 가능한 표현으로 수정해야 한다.",
      sources: [],
    };
  }

  return {
    claimId: claim.claimId,
    text,
    label: LABELS.insufficient,
    confidence: 0.55,
    reason:
      "제공된 근거만으로 이 claim을 명확히 지지하거나 반박하기 어렵다.",
    correctedText:
      "공식 근거를 추가로 확인한 뒤 더 구체적인 표현으로 수정해야 한다.",
    sources: [],
  };
}

export function summarizeJudgments(judgments) {
  return {
    totalClaims: judgments.length,
    supported: judgments.filter((item) => item.label === LABELS.supported).length,
    conflicted: judgments.filter((item) => item.label === LABELS.conflicted).length,
    insufficient: judgments.filter((item) => item.label === LABELS.insufficient).length,
    exaggerated: judgments.filter((item) => item.label === LABELS.exaggerated).length,
  };
}
