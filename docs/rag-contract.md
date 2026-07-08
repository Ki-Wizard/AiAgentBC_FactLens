# RAG Contract

This contract records the handoff between the backend API and the RAG team branch `feature/rag-bedrock`. It is backend-only and freezes the Data/Demo schema expected by smoke tests.

## Entrypoint

- Branch: `feature/rag-bedrock`
- Lambda entrypoint: `backend/rag/lambdaHandler.mjs`
- Function: `analyzeDocument(input)`
- Runtime: Node.js 20.x Lambda with ESM modules
- Backend region: `ap-northeast-2`
- Deployment path: AWS SAM

## Input

`analyzeDocument(input)` receives the validated backend request shape:

```json
{
  "documentText": "AWS Lambda runs your code without provisioning servers.",
  "maxClaims": 10
}
```

Rules:

- `documentText` is a trimmed non-empty string.
- `maxClaims` is an integer from `1` through `20`.
- Backend validation applies the default `maxClaims: 10` before calling RAG.

## Output

`analyzeDocument(input)` returns the full analysis schema used by the backend API:

- `analysisId`
- `status`
- `summary`
- `claims[]`

Each claim contains the shared Data/Demo fields:

- `claimId`
- `text`
- `label`
- `confidence`
- `reason`
- `correctedText`
- `sources`
- `evidence`

Labels must be exactly:

- `근거 있음`
- `공식 근거와 충돌`
- `근거 부족`
- `과장 표현`

The backend recomputes `summary.conflicted` from claims where `label === "공식 근거와 충돌"`.

## RAG Data Locations

- Current evidence bucket: `factlens-dev-evidence-docs-069423016509-ap-northeast-2`
- Evidence corpus key: `source-docs/aws-evidence-corpus.md`
- Fallback S3 key: `fallback/evidence_docs.json`

Warning: `factlens-rag-evidence-069423016509-ap-northeast-2` was created incorrectly. do not use it.

## Data/Demo Fixtures

Canonical backend smoke fixtures:

- Input document: `sample-data/sample_wrong_aws_deck.md`
- Success result: `sample-data/expected-results/analyze-success.json`
- Bedrock fallback result: `sample-data/expected-results/bedrock-fallback.json`

The success and fallback results must use `claimId`, `text`, `label`, `confidence`, `reason`, `correctedText`, `sources`, and `evidence` for every claim.

## Fallback Behavior

Fallback RAG returns the same full analysis schema without Bedrock or Knowledge Base calls. This lets the backend API run local and deployed smoke checks before Bedrock access is ready.

`FACTLENS_USE_FALLBACK=true` forces fallback behavior. Bedrock and Knowledge Base exceptions also fall back to the same schema.

## API Coupling

- `POST /analyze` calls the RAG adapter synchronously.
- `GET /analyses/{analysisId}` reads the stored result created by the backend.
- `COMPLETED` is returned on successful synchronous analysis.
- `PENDING` and `RUNNING` are reserved for future async work.

The backend MVP has no queues, workers, or Step Functions.

## Out of Scope

This contract does not define frontend implementation, RAG prompt work, demo asset implementation, PDF parsing, or PPTX parsing.
