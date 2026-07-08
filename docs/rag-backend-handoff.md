# RAG to Backend Handoff

## Current Branch

```text
feature/rag-bedrock
```

## Entry Point

```text
backend/rag/lambdaHandler.mjs
```

## Function

```javascript
analyzeDocument(input)
```

## Input

Backend는 Frontend의 `POST /analyze` 요청 body를 그대로 RAG 함수에 넘기면 됩니다.

```json
{
  "documentText": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
  "maxClaims": 10
}
```

## Output

RAG 함수는 아래 형태의 분석 결과를 반환합니다.

```json
{
  "analysisId": "analysis-...",
  "status": "COMPLETED",
  "summary": {
    "totalClaims": 8,
    "supported": 2,
    "conflicted": 4,
    "insufficient": 0,
    "exaggerated": 2
  },
  "claims": []
}
```

`claims` 내부 필드는 RAG 전달 schema와 맞춥니다.

```text
claimId
text
label
confidence
reason
correctedText
sources[].title
sources[].url
sources[].uri
sources[].excerpt
evidence
```

Frontend는 `text`, `label`, `reason`, `correctedText`, `sources[].title`을 우선 표시합니다. source target은 `sources[].url`과 `sources[].uri`를 모두 지원합니다. `evidence`는 받아도 MVP UI에서는 우선 표시하지 않습니다.

`claimId`는 있으면 목록 key로 사용합니다. Frontend는 `claimId`가 없어도 렌더링됩니다.

## Fallback Behavior

Bedrock/Knowledge Bases가 아직 연결되지 않아도 fallback RAG가 같은 응답 schema를 반환합니다.

Frontend도 API 실패 또는 API 주소 미설정 시 같은 schema의 fallback 결과를 정상 결과처럼 렌더링합니다.

## Evidence Documents

현재 실제로 사용할 버킷:

```text
factlens-dev-evidence-docs-069423016509-ap-northeast-2
```

S3 근거 문서:

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

이 버킷은 초기 생성 실수로 만들어진 버킷이므로 Backend/Infra에서 참조하지 않습니다.
