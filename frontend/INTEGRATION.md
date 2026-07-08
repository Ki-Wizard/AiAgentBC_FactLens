# Frontend API Integration Guide

## API Endpoint 명세

### POST /analyze
사용자가 입력한 텍스트를 분석하고 claims를 추출합니다.

**Request:**
```json
{
  "documentText": "전체 문서 텍스트",
  "maxClaims": 10,
  "searchMode": "fallback"
}
```

`searchMode`는 `fallback` 또는 `internet`을 보낼 수 있습니다. `internet`은 Lambda에 검색 API 키가 설정된 경우 공식 출처 웹 검색을 먼저 시도하고, 실패하면 저장 근거로 fallback합니다.

**Response:**
```json
{
  "analysisId": "analysis-001",
  "status": "COMPLETED",
  "summary": {
    "totalClaims": 4,
    "supported": 1,
    "conflicted": 1,
    "insufficient": 1,
    "exaggerated": 1
  },
  "claims": [
    {
      "claimId": "claim-001",
      "text": "검증할 문장 텍스트",
      "label": "근거 있음|공식 근거와 충돌|근거 부족|과장 표현",
      "confidence": 0.91,
      "reason": "판정 이유 설명",
      "correctedText": "수정 제안 텍스트",
      "sources": [
        {
          "title": "근거 출처 제목",
          "uri": "s3://factlens-dev-evidence-docs-069423016509-ap-northeast-2/source-docs/aws-evidence-corpus.md",
          "excerpt": "근거 문서 발췌"
        }
      ],
      "evidence": []
    }
  ]
}
```

**HTTP Status Codes:**
- 200: 분석 성공
- 400: 잘못된 요청 (documentText 누락 등)
- 500: 서버 오류 (Bedrock API 오류, 지식베이스 오류 등)

### GET /analyses/{analysisId}
이전 분석 결과를 조회합니다.

**Response:** POST /analyze와 동일한 분석 결과

---

## Environment Variables

### .env.local (개발 환경)

```env
# Backend API 주소
VITE_API_BASE_URL=https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com

# 선택 사항: API 타임아웃 (ms)
VITE_API_TIMEOUT=30000
```

현재 배포된 Backend API:

```text
https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
```

### .env.production (프로덕션)

```env
VITE_API_BASE_URL=https://api.factlens.aws.example.com
```

**주의:** 환경변수가 설정되지 않으면 같은 응답 스키마의 fallback 데이터를 정상 분석 결과처럼 렌더링합니다.

---

## Frontend Mock 데이터 구조

**파일:** `src/App.jsx` 내 `mockResult` 상수

```javascript
const mockResult = {
  analysisId: "analysis-mock-001",
  status: "COMPLETED",
  summary: { totalClaims, supported, conflicted, insufficient, exaggerated },
  claims: [
    {
      claimId,
      text,           // ← RAG와 동일한 필드명
      label,
      confidence,
      reason,
      correctedText,
      sources: [{ title, url, uri, excerpt }],
      evidence
    }
  ]
};
```

**중요:** Mock 데이터는 `/sample-data/expected-results/analyze-success.json`과 정확히 동일한 스키마를 유지합니다.

Frontend는 `text`, `label`, `reason`, `correctedText`, `sources[].title`을 우선 표시합니다. source target은 `sources[].url`과 `sources[].uri`를 모두 지원합니다. `claimText`가 들어오는 이전 응답도 렌더링되도록 fallback 처리되어 있습니다.

`claimId`는 있으면 목록 key로 사용합니다. Backend/RAG 응답에 `claimId`가 없어도 Frontend는 배열 순서 기반 key로 렌더링합니다.

`evidence`는 RAG 내부 근거 상세 필드로 받을 수 있지만, MVP UI에서는 `sources`를 우선 표시합니다.

Backend `feature/backend-api` 브랜치 기준으로 source는 `url` 대신 `uri`와 `excerpt`가 내려올 수 있습니다. HTTP URL이면 링크로 렌더링하고, S3 URI면 텍스트로 표시합니다.

---

## Backend/RAG 전달사항

RAG 담당 브랜치:

```text
feature/rag-bedrock
```

RAG 엔트리포인트:

```text
backend/rag/lambdaHandler.mjs
```

Backend에서 호출할 함수:

```javascript
analyzeDocument(input)
```

입력은 Frontend가 `POST /analyze`로 보내는 body와 동일합니다.

```json
{
  "documentText": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
  "maxClaims": 10,
  "searchMode": "fallback"
}
```

Bedrock/Knowledge Bases가 아직 연결되지 않아도 fallback RAG가 같은 응답 schema를 반환합니다.

실제 사용할 S3 근거 문서 버킷:

```text
factlens-dev-evidence-docs-069423016509-ap-northeast-2
```

근거 문서:

```text
s3://factlens-dev-evidence-docs-069423016509-ap-northeast-2/source-docs/aws-evidence-corpus.md
```

Fallback JSON:

```text
s3://factlens-dev-evidence-docs-069423016509-ap-northeast-2/fallback/evidence_docs.json
```

사용하지 않을 버킷:

```text
factlens-rag-evidence-069423016509-ap-northeast-2
```

---

## Label 색상 매핑

| Label | CSS Class | Color (Hex) | Background |
|-------|-----------|-------------|------------|
| 근거 있음 | label-supported | #075e38 (Green) | #dff8eb |
| 공식 근거와 충돌 | label-conflicted | #912018 (Red) | #fee4e2 |
| 근거 부족 | label-insufficient | #344054 (Gray) | #eaecf0 |
| 과장 표현 | label-exaggerated | #93370d (Yellow) | #fef0c7 |

색상은 `src/styles.css`에서 정의되어 있습니다.

---

## Frontend 기능

### 입력 화면
- 텍스트 입력 영역: 사용자가 분석할 문서 텍스트 붙여넣기
- 근거 검색 모드: 저장 근거 또는 실시간 검색 선택
- "분석 시작" 버튼: POST /analyze 호출
- 로딩 상태 표시
- 에러 메시지 표시

### 결과 화면
- 5개 요약 카드: totalClaims, supported, conflicted, insufficient, exaggerated
- Claim 리스트: 좌측 패널에서 선택 가능
- 상세 패널: 우측에서 선택된 claim의 상세 정보 표시
  - 판정 이유
  - 수정 제안
  - 근거 출처 (링크)

---

## 환경별 동작

### 1. API 주소 설정 + Backend 정상 작동
```
사용자 입력 → POST /analyze → Backend 분석 → 결과 표시
```

### 2. API 주소 설정 + Backend 오류
```
사용자 입력 → POST /analyze (실패) → fallback 결과를 정상 결과 UI로 렌더링
```

### 3. API 주소 미설정 (VITE_API_BASE_URL 빈 문자열)
```
사용자 입력 → fallback 결과를 정상 결과 UI로 렌더링 (Backend 호출 안 함)
```

---

## 개발 시작

### 1. 의존성 설치
```bash
cd frontend
npm install
```

### 2. 개발 서버 시작 (Mock 모드)
```bash
npm run dev
```

브라우저: http://localhost:5173

### 3. Backend API 연결
Backend가 준비되면 `.env.local` 추가:
```env
VITE_API_BASE_URL=https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
```

서버 재시작 (`npm run dev`)

### 4. 프로덕션 빌드
```bash
npm run build
```

`dist/` 폴더가 생성되며, S3에 호스팅할 수 있습니다.

---

## 테스트 가이드

### Mock 데이터 검증
1. API 주소 미설정 상태에서 "분석 시작" 클릭
2. 4가지 판정 유형이 모두 표시되는지 확인
3. Claim 클릭 시 상세 정보가 정확히 표시되는지 확인

### Backend 통합 테스트
1. `.env.local` 설정: `VITE_API_BASE_URL=http://localhost:8000`
2. Backend 서버 시작
3. Frontend에서 "분석 시작" 클릭
4. `/sample-data/demo-inputs/test-claims.txt` 내용 입력
5. Backend 응답이 `/sample-data/expected-results/analyze-success.json`과 동일한 스키마인지 확인

### 기존 분석 결과 조회 테스트
1. 분석 완료 후 표시된 `analysisId`를 확인
2. 조회 입력칸에 `analysisId` 입력
3. "결과 조회" 클릭
4. `GET /analyses/{analysisId}` 응답이 POST 응답과 동일한 스키마로 렌더링되는지 확인
