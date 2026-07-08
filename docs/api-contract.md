# API Contract

프론트엔드, 백엔드, RAG 담당은 이 API 계약을 기준으로 개발합니다.

## Endpoints

```http
POST /analyze
GET /analyses/{analysisId}
```

사용하지 않는 이름:

- `POST /analyses`
- `jobId`

## Request Body

MVP는 PDF 파일 자체가 아니라 텍스트 기준으로 분석합니다. PDF 업로드 UI가 있어도 백엔드에는 추출된 `documentText`를 보냅니다.

```json
{
  "documentText": "전체 문서 텍스트",
  "maxClaims": 10
}
```

## Fixed Response Shape

```json
{
  "analysisId": "analysis-001",
  "status": "COMPLETED",
  "summary": {
    "totalClaims": 5,
    "supported": 1,
    "conflicted": 2,
    "insufficient": 1,
    "exaggerated": 1
  },
  "claims": [
    {
      "claimId": "claim-001",
      "text": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
      "label": "공식 근거와 충돌",
      "confidence": 0.91,
      "reason": "공식 근거와 제한 시간이 다르다.",
      "correctedText": "공식 quota 문서를 기준으로 실행 시간 제한을 다시 작성해야 한다.",
      "sources": [
        {
          "title": "AWS Lambda quotas",
          "url": "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html"
        }
      ],
      "evidence": []
    }
  ]
}
```

## Claim Rendering Fields

Frontend는 claim마다 아래 필드를 기대합니다.

- `claimId`
- `text`
- `label`
- `confidence`
- `reason`
- `correctedText`
- `sources[].title`
- `sources[].url`
- `evidence`

## Summary Keys

- `totalClaims`
- `supported`
- `conflicted`
- `insufficient`
- `exaggerated`

## Fixed Labels

아래 문자열은 프론트엔드 색상 처리와 연결되므로 임의로 바꾸지 않습니다.

```text
근거 있음
공식 근거와 충돌
근거 부족
과장 표현
```

## Label Colors

| Label | Color |
| --- | --- |
| `근거 있음` | Green |
| `공식 근거와 충돌` | Red |
| `근거 부족` | Gray |
| `과장 표현` | Yellow |

## Mock and Fallback Rule

- Frontend mock JSON도 실제 API 응답과 같은 schema를 사용합니다.
- Bedrock/Knowledge Bases fallback 결과도 같은 schema를 사용합니다.
- fallback 결과라고 UI에서 특별 취급하지 않고 정상 결과처럼 렌더링합니다.
- 성공 mock 파일은 `sample-data/expected-results/analyze-success.json`을 기준으로 합니다.

## Frontend Config

API 주소는 하드코딩하지 않고 환경변수 또는 config로 받습니다.

```text
API_BASE_URL
```

## Backend to RAG Contract

Backend가 RAG 모듈에 전달하는 입력:

```json
{
  "documentText": "전체 문서 텍스트",
  "maxClaims": 10
}
```

RAG가 Backend에 반환하는 출력:

- `claims` 배열
- 각 claim의 `claimId`, `text`, `label`, `confidence`, `reason`, `correctedText`, `sources`, `evidence`
- `label`은 고정 라벨 4개 중 하나
- `confidence`는 0~1 숫자
- `sources`는 `title`, `url` 필수
- Bedrock/Knowledge Bases 실패 시 `sample-data/evidence_docs.json` 기반 fallback 결과 반환 가능

## RAG Integration

- Branch: `feature/rag-bedrock`
- Entrypoint: `backend/rag/lambdaHandler.mjs`
- Function: `analyzeDocument(input)`
- Fallback RAG도 동일한 응답 schema를 반환합니다.
