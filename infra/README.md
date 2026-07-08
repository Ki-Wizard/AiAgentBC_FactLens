# Infrastructure

AWS 리소스 정의와 배포 스크립트를 관리하는 영역입니다.

Backend-owned infrastructure lives in this `infra/` directory and uses AWS SAM for deployment to `ap-northeast-2`.

## Planned Resources

- DynamoDB table for analysis results
- Node.js 20.x Lambda function
- API Gateway HTTP API
- IAM roles and policies for backend execution
- Read access to the current evidence bucket

No frontend hosting, demo asset pipeline, RAG prompt work, PDF parser, or PPTX parser belongs in this backend-only infrastructure scope.

## Deployment

AWS SAM is the backend deployment path.

```powershell
sam validate --template-file infra/template.yaml --region ap-northeast-2
sam build --template-file infra/template.yaml --region ap-northeast-2
sam deploy --config-file infra/samconfig.toml --region ap-northeast-2 --no-confirm-changeset --no-fail-on-empty-changeset
```

Default stack settings live in `infra/samconfig.toml`: stack name `factlens-backend-api`, region `ap-northeast-2`, and `CAPABILITY_IAM` for the Lambda execution role.

Deployment parameters keep backend runtime configuration explicit: `ANALYSES_TABLE_NAME`, `FACTLENS_USE_FALLBACK`, `FACTLENS_STORAGE_MODE`, `MAX_CLAIMS_DEFAULT`, `CORS_ALLOW_ORIGIN`, `EVIDENCE_BUCKET_NAME`, `EVIDENCE_CORPUS_KEY`, and `FALLBACK_EVIDENCE_KEY`. Lambda provides reserved `AWS_REGION` automatically at runtime.

Use the deployed API URL for backend smoke checks after deployment.

## Backend API Contract

- Runtime: Node.js 20.x Lambda with ESM modules
- Region: `ap-northeast-2`
- Deployment tool: AWS SAM
- Content type: `application/json`
- Endpoint: `POST /analyze`
- Endpoint: `GET /analyses/{analysisId}`
- Analysis ID format: `analysis-<uuid4>`
- RAG entrypoint: `backend/rag/lambdaHandler.mjs`
- RAG function: `analyzeDocument(input)`

Full API details live in `../docs/api-contract.md`. RAG handoff details live in `../docs/rag-contract.md`.

## Shared Claim Schema

Every stored analysis and fixture claim uses these fields:

- `claimId`
- `text`
- `label`
- `confidence`
- `reason`
- `correctedText`
- `sources`
- `evidence`

## RAG Evidence Data

- Current evidence bucket: `factlens-dev-evidence-docs-069423016509-ap-northeast-2`
- Evidence corpus key: `source-docs/aws-evidence-corpus.md`
- Fallback S3 key: `fallback/evidence_docs.json`

Warning: `factlens-rag-evidence-069423016509-ap-northeast-2` was created incorrectly. do not use it.

## Data/Demo Fixtures

Canonical backend smoke fixtures:

- Input document: `sample-data/sample_wrong_aws_deck.md`
- Success result: `sample-data/expected-results/analyze-success.json`
- Bedrock fallback result: `sample-data/expected-results/bedrock-fallback.json`

## Smoke Commands

Run smoke scripts from the repository root after local build/deploy prerequisites are available:

```powershell
npm --prefix backend run smoke:local
npm --prefix backend run smoke:deployed -- -StackName factlens-backend-api -Region ap-northeast-2
npm --prefix backend run smoke:deployed -- -ApiUrl https://example.execute-api.ap-northeast-2.amazonaws.com
```

The smoke path exercises `POST /analyze`, `GET /analyses/{analysisId}`, fallback mode, schema validation, and current evidence bucket/key values.

## Notes

Keep backend deployment resources in this directory. Do not use the incorrectly created stale bucket listed above.
