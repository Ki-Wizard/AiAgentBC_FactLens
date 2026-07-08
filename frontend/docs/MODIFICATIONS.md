# FactLens Frontend 수정사항 정리

**작업 일시:** 2026-07-08  
**담당:** Frontend & UX  
**상태:** 요구사항 반영 및 빌드 검증 완료

## 반영한 요구사항

Frontend 요구사항 기준으로 아래 항목을 맞췄다.

```text
POST /analyze
GET /analyses/{analysisId}
request body: { documentText, maxClaims, searchMode }
response claim fields: claimId, text, label, confidence, reason, correctedText, sources[].title, sources[].url, evidence
summary fields: totalClaims, supported, conflicted, insufficient, exaggerated
label colors: Green, Red, Gray, Yellow
fallback result: 실제 API 응답과 같은 schema로 정상 렌더링
API base URL: 환경변수로 주입
claimId: 있으면 사용하지만 필수 의존하지 않음
claimText: 이전 응답 호환 fallback으로만 지원
```

## 주요 변경 파일

### Frontend

```text
frontend/package.json
frontend/package-lock.json
frontend/index.html
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/styles.css
frontend/.env.example
frontend/README.md
frontend/INTEGRATION.md
frontend/CHECKLIST.md
frontend/docs/frontend-work-summary.md
frontend/docs/MODIFICATIONS.md
```

### Sample Data

```text
sample-data/DATA-SCHEMA.md
sample-data/demo-inputs/test-claims.txt
sample-data/expected-results/analyze-success.json
```

### Infra 문서

```text
infra/DEPLOYMENT.md
```

## App.jsx 변경 내용

### 1. API endpoint 고정

분석 요청은 `POST /analyze`만 사용한다.

```javascript
await fetch(`${API_BASE_URL}/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ documentText: inputText, maxClaims: 10, searchMode }),
});
```

기존 분석 결과 조회는 `GET /analyses/{analysisId}`만 사용한다.

```javascript
await fetch(`${API_BASE_URL}/analyses/${encodeURIComponent(lookupId.trim())}`);
```

`POST /analyses`나 `jobId` 흐름은 사용하지 않는다.

### 2. 요청 body 통일

Backend에 보내는 body는 아래 형태로 고정했다.

```json
{
  "documentText": "전체 문서 텍스트",
  "maxClaims": 10
}
```

MVP는 PDF 파일 자체가 아니라 텍스트 분석 기준이다. PDF 업로드 UI가 추가되더라도 Frontend는 추출된 텍스트를 `documentText`로 보내는 방향을 유지한다.

### 3. 응답 렌더링 필드 통일

claim 렌더링은 최신 RAG 응답 필드인 `text`를 우선 사용한다.

```javascript
claim.text
claim.label
claim.confidence
claim.reason
claim.correctedText
claim.sources[].title
claim.sources[].url
```

이전 `claimText` 응답이 들어와도 화면이 깨지지 않도록 fallback 처리했다.

```javascript
function getClaimText(claim) {
  return claim.text || claim.claimText || "";
}
```

`claimId`는 Backend/RAG 필수 응답 필드가 아니므로 Frontend 선택 key에서 필수로 의존하지 않도록 수정했다. `claimId`가 없으면 배열 순서 기반 key를 사용한다.

```javascript
function getClaimKey(claim, index) {
  return claim.claimId || `claim-${index + 1}`;
}
```

### 4. summary key 통일

요약 카드는 아래 key를 그대로 사용한다.

```javascript
analysis.summary.totalClaims
analysis.summary.supported
analysis.summary.conflicted
analysis.summary.insufficient
analysis.summary.exaggerated
```

### 5. fallback 특별 표시 제거

요구사항에 따라 fallback 결과도 실제 API 응답과 같은 schema로 정상 결과처럼 렌더링한다.

따라서 화면에서 아래처럼 fallback 여부를 별도 표시하지 않는다.

```text
Mock 결과 표시 중
API 결과 표시 중
```

현재 화면에는 endpoint 안내만 표시한다.

```text
POST /analyze
GET /analyses/{analysisId}
```

### 6. 분석 결과 조회 UI 추가

분석 ID를 입력해 기존 결과를 조회하는 입력칸과 버튼을 추가했다.

```text
analysisId 입력
→ 결과 조회
→ GET /analyses/{analysisId}
→ POST /analyze와 동일한 schema로 렌더링
```

## 색상 매핑

`frontend/src/styles.css`에 라벨별 색상 처리를 고정했다.

| 라벨 | CSS Class | 색상 |
|---|---|---|
| 근거 있음 | `label-supported` | Green |
| 공식 근거와 충돌 | `label-conflicted` | Red |
| 근거 부족 | `label-insufficient` | Gray |
| 과장 표현 | `label-exaggerated` | Yellow |

## 환경변수

API 주소는 코드에 하드코딩하지 않고 Vite 환경변수로 받는다.

```env
VITE_API_BASE_URL=http://localhost:8000
```

개발용 템플릿:

```text
frontend/.env.example
```

환경변수가 없으면 Backend를 호출하지 않고 같은 schema의 fallback 데이터를 정상 결과처럼 렌더링한다.

## Sample Data 수정

### analyze-success.json

Backend 정상 응답 예제로 아래 schema를 맞췄다.

```json
{
  "analysisId": "analysis-demo-001",
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
      "text": "검증할 문장",
      "label": "근거 있음",
      "confidence": 0.94,
      "reason": "판정 이유",
      "correctedText": "수정 제안",
      "sources": [
        {
          "title": "출처 제목",
          "url": "https://example.com"
        }
      ],
      "evidence": []
    }
  ]
}
```

### test-claims.txt

데모 입력에는 4가지 라벨이 모두 나오도록 문장을 구성했다.

```text
근거 있음
공식 근거와 충돌
근거 부족
과장 표현
```

실제 AWS 키, 계정 정보, 개인정보는 포함하지 않았다.

## Infra 문서 수정

`infra/DEPLOYMENT.md`에 아래 기준을 맞췄다.

```text
Region: ap-northeast-2
Deploy: AWS SAM
API Gateway CORS: Frontend origin 허용
개발 Frontend origin: http://localhost:5173
```

## 검증 결과

production build를 실행해 통과를 확인했다.

```bash
cd frontend
npm run build
```

결과:

```text
✓ built
```

## 다음 단계

Backend 팀이 아래 endpoint를 구현하면 실제 통합 테스트를 진행한다.

```http
POST /analyze
GET /analyses/{analysisId}
```

Frontend는 `VITE_API_BASE_URL`만 설정하면 실제 API로 전환된다.

RAG 담당 전달사항 기준으로 Backend는 `backend/rag/lambdaHandler.mjs`의 `analyzeDocument(input)`을 연결하면 된다.
