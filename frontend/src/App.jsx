import React from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Loader2, Search, UploadCloud, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  getClaimKey,
  getClaimText,
  getSourceTarget,
  normalizeAnalysisResult,
} from "./normalizers.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_MB = 12;
const UPLOAD_ACCEPT_TYPES = ".txt,.md,.json,.csv,.pdf,.ppt,.pptx";

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
      text: "Amazon Bedrock uses customer data to train the base model by default.",
      label: "Conflicts with official sources",
      confidence: 0.91,
      reason: "Official documentation says Amazon Bedrock does not use customer content to train a base model by default.",
      correctedText: "Amazon Bedrock does not use customer content to train the base model by default.",
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
      text: "AWS Lambda functions can run up to 15 minutes.",
      label: "Supported",
      confidence: 0.94,
      reason: "AWS service limits confirm the runtime configuration for Lambda functions.",
      correctedText: "No correction needed.",
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
      text: "Amazon S3 is designed for high durability but does not explicitly guarantee SLA in the public docs.",
      label: "Insufficient evidence",
      confidence: 0.73,
      reason: "No direct evidence in the indexed sources confirms the claim's SLA guarantee statement.",
      correctedText: "SLA and durability details should be verified directly in the official documentation.",
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
      text: "Amazon Bedrock guarantees perfect, identical results for every customer 100% of the time.",
      label: "Exaggerated",
      confidence: 0.85,
      reason: "Absolute wording like 'guarantees' and '100% consistent' overstates the product capability.",
      correctedText: "Amazon Bedrock improves consistency, but the service does not state a 100% guarantee of identical results.",
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
  Supported: {
    className: "label-supported",
    tone: "supported",
    icon: CheckCircle2,
  },
  "Conflicts with official sources": {
    className: "label-conflicted",
    tone: "conflicted",
    icon: AlertTriangle,
  },
  "Insufficient evidence": {
    className: "label-insufficient",
    tone: "insufficient",
    icon: Search,
  },
  Exaggerated: {
    className: "label-exaggerated",
    tone: "exaggerated",
    icon: AlertTriangle,
  },
};

function getLabelMeta(label) {
  return labelMeta[label] || labelMeta["Insufficient evidence"];
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
  const [analysis, setAnalysis] = useState(fallbackResult);
  const [selectedClaimKey, setSelectedClaimKey] = useState(getClaimKey(fallbackResult.claims[0], 0));
  const [lookupId, setLookupId] = useState(fallbackResult.analysisId);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedText, setUploadedText] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleUploadFile = async (file) => {
    setErrorMessage("");

    if (!file) {
      setUploadedFile(null);
      setUploadedText("");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMessage(`Upload size is limited to ${MAX_UPLOAD_MB}MB.`);
      return;
    }

    try {
      const text = await file.text();
      setUploadedFile(file);
      setUploadedText(text);
    } catch (error) {
      console.error("[FactLens] Failed to parse uploaded file.", error);
      setErrorMessage("Unable to read this file. Upload a text-based document.");
      setUploadedFile(file);
      setUploadedText("");
    }
  };

  const onUploadChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    void handleUploadFile(file);
  };

  const onDragOver = (event) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }
    void handleUploadFile(file);
  };

  const onDragLeave = () => {
    setIsDragActive(false);
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setUploadedText("");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analyzeUploadedFile = async () => {
    if (!uploadedFile) {
      setErrorMessage("Select a file first.");
      return;
    }

    if (!uploadedText.trim()) {
      setErrorMessage("No readable text found in the uploaded file.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

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
        body: JSON.stringify({ documentText: uploadedText, maxClaims: 10, searchMode: "fallback" }),
      });

      if (!response.ok) {
        throw new Error(`Analysis API error: HTTP ${response.status}`);
      }

      const result = await response.json();
      applyAnalysis(result);
    } catch (error) {
      console.error("[FactLens] POST /analyze with uploaded file failed. Rendering fallback result.", error);
      applyAnalysis(fallbackResult);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalysis = async () => {
    setIsLoading(true);
    setErrorMessage("");

    if (!lookupId.trim()) {
      setErrorMessage("Enter analysisId to look up.");
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
        throw new Error(`Lookup API error: HTTP ${response.status}`);
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
      <section className="top-brand-bar">
        <div className="brand-mark">
          <FileSearch size={22} aria-hidden="true" />
          <span>FactLens</span>
        </div>
      </section>

      <section className="hero-panel">
        <label
          htmlFor="presentation-upload-input"
          className={`upload-panel ${isDragActive ? "drag-active" : ""} ${uploadedFile ? "has-file" : ""}`}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragLeave={onDragLeave}
        >
          <p className="upload-kicker">발표자료 업로드</p>
          <h1>발표자료를 올리고 AI 팩트체크를 시작하세요</h1>
          <p className="hero-sub">
            발표자료 파일을 여기로 끌어다 두거나 아래 버튼으로 선택하면 텍스트를 추출해 분석을 시작합니다.
          </p>
          <input
            id="presentation-upload-input"
            ref={fileInputRef}
            type="file"
            className="upload-input"
            accept={UPLOAD_ACCEPT_TYPES}
            onChange={onUploadChange}
          />
          <div className="upload-dropzone">
            <UploadCloud size={30} aria-hidden="true" />
            <div>영역 위에 끌어 놓거나 버튼으로 선택하세요.</div>
            <button
              type="button"
              className="button-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              파일 선택
            </button>
            <small>지원 형식: txt / md / json / csv / pdf / ppt / pptx</small>
            <small>최대 용량: {MAX_UPLOAD_MB}MB</small>
          </div>
          {uploadedFile && (
            <div className="uploaded-file-row">
              <span className="uploaded-file-name">{uploadedFile.name}</span>
              <button type="button" className="uploaded-file-clear" onClick={clearUploadedFile}>
                <X size={14} aria-hidden="true" />
                삭제
              </button>
            </div>
          )}
          <div className="input-actions">
            <button type="button" onClick={analyzeUploadedFile} disabled={isLoading || !uploadedFile}>
              {isLoading ? <Loader2 className="spin" size={18} /> : <UploadCloud size={18} />}
              업로드 파일 분석
            </button>
            <span>POST /analyze</span>
          </div>
          <div className="lookup-row">
            <input
              type="text"
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Lookup by analysisId"
            />
            <button type="button" onClick={loadAnalysis} disabled={isLoading}>
              Load result
            </button>
            <span>GET /analyses/&#123;analysisId&#125;</span>
          </div>
          {errorMessage && <p className="error-text">{errorMessage}</p>}
        </label>
      </section>

      {analysis && (
        <>
          <section className="summary-grid">
            <SummaryCard title="Total claims" value={analysis.summary.totalClaims} tone="total" />
            <SummaryCard title="Supported" value={analysis.summary.supported} tone="supported" />
            <SummaryCard title="Conflicts" value={analysis.summary.conflicted} tone="conflicted" />
            <SummaryCard title="Insufficient" value={analysis.summary.insufficient} tone="insufficient" />
            <SummaryCard title="Exaggerated" value={analysis.summary.exaggerated} tone="exaggerated" />
          </section>

          <section className="result-layout">
            <div className="claim-list">
              <div className="section-heading">
                <h2>Analysis result</h2>
                <span>{analysis.analysisId}</span>
              </div>
              {analysis.claims.map((claim, index) => {
                const percent = Math.round(claim.confidence * 100);
                return (
                  <button
                    type="button"
                    key={getClaimKey(claim, index)}
                    data-tone={getLabelMeta(claim.label).tone}
                    className={`claim-item ${getClaimKey(claim, index) === selectedClaimKey ? "active" : ""}`}
                    onClick={() => setSelectedClaimKey(getClaimKey(claim, index))}
                  >
                    <div className="claim-item-top">
                      <ClaimBadge label={claim.label} />
                      <span className="confidence">Confidence {percent}%</span>
                    </div>
                    <span className="claim-text">{getClaimText(claim)}</span>
                    <div className="confidence-bar">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>

            <aside className="detail-panel" data-tone={selectedClaim ? getLabelMeta(selectedClaim.label).tone : undefined}>
              {selectedClaim ? (
                <>
                  <div className="detail-head">
                    <ClaimBadge label={selectedClaim.label} />
                    <span className="detail-confidence">
                      Confidence {Math.round(selectedClaim.confidence * 100)}%
                    </span>
                  </div>
                  <h2>{getClaimText(selectedClaim)}</h2>
                  <div className="confidence-bar">
                    <span style={{ width: `${Math.round(selectedClaim.confidence * 100)}%` }} />
                  </div>
                  <div className="detail-block">
                    <h3>Reason</h3>
                    <p>{selectedClaim.reason}</p>
                  </div>
                  <div className="detail-block">
                    <h3>Correction</h3>
                    <p>{selectedClaim.correctedText}</p>
                  </div>
                  <div className="detail-block">
                    <h3>Sources</h3>
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
                <p>Select a claim on the left.</p>
              )}
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
