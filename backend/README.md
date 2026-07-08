# Backend

Lambda와 API Gateway 기반 백엔드 영역입니다. This README covers only the backend API, RAG handoff, and smoke-test run path.

## Responsibilities

- Text input validation and synchronous analysis requests
- Backend API contract enforcement
- RAG handoff through `backend/rag/lambdaHandler.mjs`
- DynamoDB analysis result storage
- Local and deployed backend smoke checks

Out of scope here: frontend implementation, RAG prompt work, demo asset implementation, PDF parsing, and PPTX parsing.

## Runtime

- Node.js 20.x Lambda
- ESM modules
- AWS SAM deployment
- Region: `ap-northeast-2`
- `Content-Type: application/json`

## API

- `POST /analyze`: 문서 텍스트를 동기 분석하고 성공 시 `COMPLETED` 결과를 반환합니다.
- `GET /analyses/{analysisId}`: 저장된 분석 결과를 조회합니다.
- `analysisId` format: `analysis-<uuid4>`

Full request, response, label, and error contracts live in `../docs/api-contract.md`.

## Shared Claim Schema

Every backend, RAG, success fixture, and fallback fixture claim uses these fields:

- `claimId`
- `text`
- `label`
- `confidence`
- `reason`
- `correctedText`
- `sources`
- `evidence`

Labels are exactly `근거 있음`, `공식 근거와 충돌`, `근거 부족`, and `과장 표현`. The backend recomputes `summary.conflicted` from claims whose `label` is `공식 근거와 충돌`.

## RAG Handoff

- RAG team branch: `feature/rag-bedrock`
- Entrypoint: `backend/rag/lambdaHandler.mjs`
- Function: `analyzeDocument(input)`
- Input: `documentText` and `maxClaims`
- Output: full analysis schema using the shared claim fields
- Fallback RAG returns the same schema without Bedrock or Knowledge Base access.

Current evidence locations:

- Bucket: `factlens-dev-evidence-docs-069423016509-ap-northeast-2`
- Corpus key: `source-docs/aws-evidence-corpus.md`
- Fallback S3 key: `fallback/evidence_docs.json`

Warning: `factlens-rag-evidence-069423016509-ap-northeast-2` was created incorrectly. do not use it.

## Data/Demo Fixtures

Canonical backend smoke fixtures:

- Input document: `sample-data/sample_wrong_aws_deck.md`
- Success result: `sample-data/expected-results/analyze-success.json`
- Bedrock fallback result: `sample-data/expected-results/bedrock-fallback.json`

## Local Smoke

Run the backend-only local SAM smoke from this directory:

```powershell
npm install
npm run smoke:local
```

Expected local smoke behavior:

- Sends `POST /analyze` with JSON input.
- Verifies `status` is `COMPLETED`.
- Verifies `claims[]` uses the shared claim schema and one of the four Korean labels.
- Verifies `GET /analyses/{analysisId}` returns the stored result.
- Verifies fallback mode uses `sample-data/expected-results/bedrock-fallback.json` and the current evidence bucket/key values.

## Deployed Smoke

After AWS SAM deployment in `../infra`, run the deployed backend smoke from this directory:

```powershell
npm run smoke:deployed -- -ApiUrl https://example.execute-api.ap-northeast-2.amazonaws.com
```

If `-ApiUrl` is omitted, the script uses AWS CLI CloudFormation outputs from stack `factlens-backend-api` in `ap-northeast-2`.

Expected deployed smoke behavior:

- Uses `Content-Type: application/json`.
- Calls `POST /analyze`.
- Calls `GET /analyses/{analysisId}` with the returned `analysisId`.
- Fails if the response contains an unexpected status, label, fixture path, evidence bucket, or claim field.

## Notes

The backend MVP is synchronous. `PENDING` and `RUNNING` are reserved for future async work, and the MVP does not use queues, workers, or Step Functions.
