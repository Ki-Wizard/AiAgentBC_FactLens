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

## Evidence Storage

실제 팀 내부 AWS 버킷명은 계정 ID를 포함하므로 공개 문서에는 그대로 커밋하지 않습니다.

- 실제 사용 버킷 패턴: `factlens-dev-evidence-docs-<account-id>-ap-northeast-2`
- 잘못 생성된 버킷 패턴: `factlens-rag-evidence-<account-id>-ap-northeast-2`
- source docs path: `s3://factlens-dev-evidence-docs-<account-id>-ap-northeast-2/source-docs/aws-evidence-corpus.md`
- fallback JSON path: `s3://factlens-dev-evidence-docs-<account-id>-ap-northeast-2/fallback/evidence_docs.json`

주의: 실제 AWS 계정 ID, 키, 개인정보는 레포에 커밋하지 않습니다.
