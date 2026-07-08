import React from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Loader2, Search, ShieldQuestion } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getClaimKey,
  getClaimText,
  getSourceTarget,
  normalizeAnalysisResult,
} from "./normalizers.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const sampleInput = `Amazon Bedrock은 고객 데이터를 자동으로 모델 학습에 사용한다.
AWS Lambda 함수는 최대 15분까지 실행할 수 있다.
Amazon S3는 높은 내구성을 제공하도록 설계되어 있지만, 명확한 SLA를 보장하지 않습니다.
Amazon Bedrock은 무조건 모든 고객이 일관된 결과를 얻을 수 있음을 100% 보장한다.`;

const mockResult = {
  analysisId: "analysis-mock-001",
  status: "COMPLETED",
  summary: {
    totalClaims: 4,
    supported: 1,
    conflicted: 1,
    insufficient: 1,
    exaggerated: 1,
  },
  claims: [
    {
      claimId: "claim-001",
      text: "Amazon Bedrock은 고객 데이터를 자동으로 모델 학습에 사용한다.",
      label: "공식 근거와 충돌",
      confidence: 0.91,
      reason: "공식 근거는 Amazon Bedrock이 고객 콘텐츠를 기본 모델 학습에 사용하지 않는다고 설명한다.",
      correctedText: "Amazon Bedrock은 고객 콘텐츠를 기본 모델 학습에 사용하지 않는다.",
      sources: [
        {
          title: "Amazon Bedrock data protection",
          url: "https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html",
        },
      ],
      evidence: [],
    },
    {
      claimId: "claim-002",
      text: "AWS Lambda 함수는 최대 15분까지 실행할 수 있다.",
      label: "근거 있음",
      confidence: 0.94,
      reason: "검색된 공식 AWS 문서가 Lambda 함수의 실행 시간 제한 정보와 일치한다.",
      correctedText: "수정이 필요하지 않다.",
      sources: [
        {
          title: "AWS Lambda quotas",
          url: "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html",
        },
      ],
      evidence: [],
    },
    {
      claimId: "claim-003",
      text: "Amazon S3는 높은 내구성을 제공하도록 설계되어 있지만, 명확한 SLA를 보장하지 않습니다.",
      label: "근거 부족",
      confidence: 0.73,
      reason: "해당 claim의 SLA 보장 여부를 직접 확인할 충분한 근거가 검색 결과에 없다.",
      correctedText: "Amazon S3의 내구성 및 SLA 정보는 공식 문서에서 확인할 수 있다.",
      sources: [
        {
          title: "Amazon S3 FAQs",
          url: "https://aws.amazon.com/s3/faqs/",
        },
      ],
      evidence: [],
    },
    {
      claimId: "claim-004",
      text: "Amazon Bedrock은 무조건 모든 고객이 일관된 결과를 얻을 수 있음을 100% 보장한다.",
      label: "과장 표현",
      confidence: 0.85,
      reason: "'무조건', '100% 보장' 같은 절대적 표현은 공식 문서의 신중한 표현보다 강한 과장이다.",
      correctedText: "Amazon Bedrock은 일관된 결과 제공을 돕는 기능을 제공하지만, 결과를 100% 보장한다고 표현하지 않는다.",
      sources: [
        {
          title: "Amazon Bedrock User Guide",
          url: "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html",
        },
      ],
      evidence: [],
    },
  ],
};

const fallbackResult = normalizeAnalysisResult(mockResult);

const labelMeta = {
  "근거 있음": {
    className: "label-supported",
    tone: "supported",
    icon: CheckCircle2,
  },
  "공식 근거와 충돌": {
    className: "label-conflicted",
    tone: "conflicted",
    icon: AlertTriangle,
  },
  "근거 부족": {
    className: "label-insufficient",
    tone: "insufficient",
    icon: ShieldQuestion,
  },
  "과장 표현": {
    className: "label-exaggerated",
    tone: "exaggerated",
    icon: AlertTriangle,
  },
};

function getLabelMeta(label) {
  return labelMeta[label] || labelMeta["근거 부족"];
}

function getSources(claim) {
  return Array.isArray(claim.sources) ? claim.sources : [];
}

function isExternalLink(target) {
  return /^https?:\/\//i.test(target);
}

function SummaryCard({ title, value, tone }) {
  return (
    <div className={`summary-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ClaimBadge({ label }) {
  const meta = getLabelMeta(label);
  const Icon = meta.icon;

  return (
    <span className={`claim-badge ${meta.className}`}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}

function App() {
  const [inputText, setInputText] = useState(sampleInput);
  const [analysis, setAnalysis] = useState(fallbackResult);
  const [selectedClaimKey, setSelectedClaimKey] = useState(getClaimKey(fallbackResult.claims[0], 0));
  const [lookupId, setLookupId] = useState(fallbackResult.analysisId);
  const [searchMode, setSearchMode] = useState("fallback");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedClaim = useMemo(() => {
    return (
      analysis?.claims?.find((claim, index) => getClaimKey(claim, index) === selectedClaimKey) ||
      analysis?.claims?.[0]
    );
  }, [analysis, selectedClaimKey]);

  const applyAnalysis = (result) => {
    const normalizedResult = normalizeAnalysisResult(result);
    setAnalysis(normalizedResult);
    setSelectedClaimKey(normalizedResult.claims?.[0] ? getClaimKey(normalizedResult.claims[0], 0) : "");
    setLookupId(normalizedResult.analysisId || "");
  };

  const analyzeText = async () => {
    setIsLoading(true);
    setErrorMessage("");

    if (!inputText.trim()) {
      setErrorMessage("분석할 텍스트를 입력하세요.");
      setIsLoading(false);
      return;
    }

    if (!API_BASE_URL) {
      window.setTimeout(() => {
        applyAnalysis(fallbackResult);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText: inputText, maxClaims: 10, searchMode }),
      });

      if (!response.ok) {
        throw new Error(`분석 API 오류: HTTP ${response.status}`);
      }

      const result = await response.json();
      applyAnalysis(result);
    } catch (error) {
      console.error("[FactLens] POST /analyze failed. Rendering fallback result.", error);
      applyAnalysis(fallbackResult);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalysis = async () => {
    setIsLoading(true);
    setErrorMessage("");

    if (!lookupId.trim()) {
      setErrorMessage("조회할 analysisId를 입력하세요.");
      setIsLoading(false);
      return;
    }

    if (!API_BASE_URL) {
      window.setTimeout(() => {
        applyAnalysis(fallbackResult);
        setIsLoading(false);
      }, 400);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyses/${encodeURIComponent(lookupId.trim())}`);

      if (!response.ok) {
        throw new Error(`분석 조회 API 오류: HTTP ${response.status}`);
      }

      const result = await response.json();
      applyAnalysis(result);
    } catch (error) {
      console.error("[FactLens] GET /analyses/{analysisId} failed. Rendering fallback result.", error);
      applyAnalysis(fallbackResult);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="brand-row">
            <FileSearch size={28} aria-hidden="true" />
            <span>FactLens</span>
          </div>
          <h1>발표자료와 보고서 속 주장을 근거와 대조합니다.</h1>
          <p className="hero-sub">
            문장 단위로 claim을 추출하고 공식 문서와 자동 대조해, 근거·충돌·과장을 한눈에
            보여드립니다.
          </p>
        </div>
        <div className="input-panel">
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="검증할 발표자료 문장 또는 보고서 텍스트를 붙여넣으세요."
            rows={8}
          />
          <div className="input-actions">
            <button type="button" onClick={analyzeText} disabled={isLoading}>
              {isLoading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
              분석 시작
            </button>
            <div className="mode-toggle" role="group" aria-label="근거 검색 모드">
              <button
                type="button"
                className={searchMode === "fallback" ? "active" : ""}
                onClick={() => setSearchMode("fallback")}
                disabled={isLoading}
              >
                저장 근거
              </button>
              <button
                type="button"
                className={searchMode === "internet" ? "active" : ""}
                onClick={() => setSearchMode("internet")}
                disabled={isLoading}
              >
                실시간 검색
              </button>
            </div>
            <span>POST /analyze</span>
          </div>
          <div className="lookup-row">
            <input
              type="text"
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="analysisId로 기존 결과 조회"
            />
            <button type="button" onClick={loadAnalysis} disabled={isLoading}>
              결과 조회
            </button>
            <span>GET /analyses/&#123;analysisId&#125;</span>
          </div>
          {errorMessage && <p className="error-text">{errorMessage}</p>}
        </div>
      </section>

      {analysis && (
        <>
          <section className="summary-grid" aria-label="분석 요약">
            <SummaryCard title="전체 claim" value={analysis.summary.totalClaims} tone="total" />
            <SummaryCard title="근거 있음" value={analysis.summary.supported} tone="supported" />
            <SummaryCard title="충돌" value={analysis.summary.conflicted} tone="conflicted" />
            <SummaryCard title="근거 부족" value={analysis.summary.insufficient} tone="insufficient" />
            <SummaryCard title="과장" value={analysis.summary.exaggerated} tone="exaggerated" />
          </section>

          <section className="result-layout">
            <div className="claim-list" aria-label="claim 결과 목록">
              <div className="section-heading">
                <h2>검증 결과</h2>
                <span>{analysis.analysisId}</span>
              </div>
              {analysis.claims.map((claim, index) => {
                const percent = Math.round(claim.confidence * 100);
                return (
                  <button
                    type="button"
                    key={getClaimKey(claim, index)}
                    data-tone={getLabelMeta(claim.label).tone}
                    className={`claim-item ${
                      getClaimKey(claim, index) === selectedClaimKey ? "active" : ""
                    }`}
                    onClick={() => setSelectedClaimKey(getClaimKey(claim, index))}
                  >
                    <div className="claim-item-top">
                      <ClaimBadge label={claim.label} />
                      <span className="confidence">신뢰도 {percent}%</span>
                    </div>
                    <span className="claim-text">{getClaimText(claim)}</span>
                    <div className="confidence-bar">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>

            <aside
              className="detail-panel"
              data-tone={selectedClaim ? getLabelMeta(selectedClaim.label).tone : undefined}
              aria-label="선택 claim 상세 정보"
            >
              {selectedClaim ? (
                <>
                  <div className="detail-head">
                    <ClaimBadge label={selectedClaim.label} />
                    <span className="detail-confidence">
                      신뢰도 {Math.round(selectedClaim.confidence * 100)}%
                    </span>
                  </div>
                  <h2>{getClaimText(selectedClaim)}</h2>
                  <div className="confidence-bar">
                    <span style={{ width: `${Math.round(selectedClaim.confidence * 100)}%` }} />
                  </div>
                  <div className="detail-block">
                    <h3>판정 이유</h3>
                    <p>{selectedClaim.reason}</p>
                  </div>
                  <div className="detail-block">
                    <h3>수정 제안</h3>
                    <p>{selectedClaim.correctedText}</p>
                  </div>
                  <div className="detail-block">
                    <h3>근거 출처</h3>
                    <ul className="source-list">
                      {getSources(selectedClaim).map((source) => (
                        <li key={`${getClaimText(selectedClaim)}-${getSourceTarget(source)}`}>
                          {isExternalLink(getSourceTarget(source)) ? (
                            <a href={getSourceTarget(source)} target="_blank" rel="noreferrer">
                              {source.title || getSourceTarget(source)}
                            </a>
                          ) : (
                            <span className="source-uri">{source.title || getSourceTarget(source)}</span>
                          )}
                          {!isExternalLink(getSourceTarget(source)) && getSourceTarget(source) && (
                            <code>{getSourceTarget(source)}</code>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p>왼쪽에서 claim을 선택하세요.</p>
              )}
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
