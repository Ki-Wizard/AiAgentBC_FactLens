# RAG Integration Notes

RAG 파트에서 공유한 실제 연결 기준입니다.

## Branch and Entrypoint

- Branch: `feature/rag-bedrock`
- Entrypoint: `backend/rag/lambdaHandler.mjs`
- Function: `analyzeDocument(input)`

## Backend to RAG Input

```json
{
  "documentText": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
  "maxClaims": 10
}
```

## RAG Output

RAG는 fallback 상태에서도 `docs/api-contract.md`의 공통 응답 schema를 반환합니다.

Claim 객체는 아래 필드를 포함합니다.

- `claimId`
- `text`
- `label`
- `confidence`
- `reason`
- `correctedText`
- `sources`
- `evidence`

## Team Handoff

- Backend는 RAG 실제 응답과 fallback 응답 모두에서 위 claim 필드를 동일하게 유지합니다.
- Frontend는 `claimId`를 결과 카드 key로 사용하고, `label`, `confidence`, `reason`, `correctedText`, `sources`, `evidence`를 그대로 렌더링합니다.
- RAG는 Bedrock 응답 실패 시에도 `sample-data/expected-results/bedrock-fallback.json`과 같은 shape을 반환합니다.
- Demo 자료는 `sample-data/expected-results/analyze-success.json`을 정상 응답 fixture로 사용합니다.
- 최신 Backend 계약은 `searchMode`를 지원합니다. 기본 또는 `fallback`은 packaged evidence를 사용하고, `internet`은 공식 출처 검색을 먼저 시도한 뒤 실패하면 fallback evidence로 돌아갑니다.

## Current Status

- Backend/RAG MVP: `origin/main`에 병합됨
- Deployed Backend API: `origin/main` 문서 기준 준비됨
- Frontend React MVP: `origin/feature/frontend-ui`에 구현됨, `origin/main` 미병합
- Bedrock Knowledge Bases sync 및 Bedrock 모델 판정: 확장 또는 연결 예정

## Evidence Storage

실제 팀 내부 AWS 버킷명은 계정 ID를 포함하므로 공개 문서에는 그대로 커밋하지 않습니다.

- 실제 사용 버킷 패턴: `factlens-dev-evidence-docs-<account-id>-ap-northeast-2`
- 잘못 생성된 버킷 패턴: `factlens-rag-evidence-<account-id>-ap-northeast-2`
- source docs path: `s3://factlens-dev-evidence-docs-<account-id>-ap-northeast-2/source-docs/aws-evidence-corpus.md`
- fallback JSON path: `s3://factlens-dev-evidence-docs-<account-id>-ap-northeast-2/fallback/evidence_docs.json`

주의: 실제 AWS 계정 ID, 키, 개인정보는 레포에 커밋하지 않습니다.
