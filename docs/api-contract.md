# API Contract

This is the backend-only contract for the smoke-testable FactLens MVP. It freezes the API shape used by AWS SAM, the backend Lambda, and the current Data/Demo fixtures.

## Runtime

- Runtime: Node.js 20.x Lambda
- Module format: ESM modules
- Region: `ap-northeast-2`
- Deployment tool: AWS SAM
- Content type: `application/json`
- MVP execution: synchronous request and response
- Queue status values `PENDING` and `RUNNING` are reserved for future work only. The backend MVP does not use queues, workers, or Step Functions.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/analyze` | Analyze one document synchronously |
| `GET` | `/analyses/{analysisId}` | Read a stored analysis result |

## Identifiers

- `analysisId` format: `analysis-<uuid4>`
- Use `analysisId` in stored results and URLs.

## POST /analyze

Request body:

```json
{
  "documentText": "AWS Lambda runs your code without provisioning servers.",
  "maxClaims": 10
}
```

Validation:

- `documentText` is required.
- `documentText` must be a trimmed non-empty string.
- `maxClaims` is optional.
- `maxClaims` defaults to `10`.
- `maxClaims` must be an integer from `1` through `20`.

Success response:

```json
{
  "analysisId": "analysis-00000000-0000-4000-8000-000000000000",
  "status": "COMPLETED",
  "summary": {
    "totalClaims": 1,
    "supported": 1,
    "conflicted": 0,
    "insufficient": 0,
    "exaggerated": 0
  },
  "claims": [
    {
      "claimId": "claim-001",
      "text": "AWS Lambda runs your code without provisioning servers.",
      "label": "근거 있음",
      "confidence": 0.95,
      "reason": "The evidence states that Lambda runs code without provisioning or managing servers.",
      "correctedText": null,
      "sources": [
        {
          "title": "AWS Lambda documentation",
          "uri": "s3://factlens-dev-evidence-docs-069423016509-ap-northeast-2/source-docs/aws-evidence-corpus.md",
          "excerpt": "Run code without provisioning or managing servers."
        }
      ],
      "evidence": [
        {
          "bucket": "factlens-dev-evidence-docs-069423016509-ap-northeast-2",
          "key": "source-docs/aws-evidence-corpus.md",
          "excerpt": "Run code without provisioning or managing servers."
        }
      ]
    }
  ]
}
```

On success, `POST /analyze` returns `status: "COMPLETED"`.

## GET /analyses/{analysisId}

Path parameter:

- `analysisId`: `analysis-<uuid4>`

Success response uses the same full analysis schema as `POST /analyze`.

## Analysis Schema

Top-level fields:

- `analysisId`: string using `analysis-<uuid4>` format
- `status`: `COMPLETED` for MVP success responses
- `summary`: aggregate counts
- `claims`: array of claim results

Shared claim fields:

- `claimId`: stable claim identifier within the analysis
- `text`: extracted claim text
- `label`: one of the exact Korean labels below
- `confidence`: numeric confidence from `0` through `1`
- `reason`: short explanation for the label
- `correctedText`: corrected wording when useful, otherwise `null`
- `sources`: evidence source list for display and traceability
- `evidence`: Data/Demo evidence snippets and storage pointers used by backend smoke checks

Labels:

- `근거 있음`
- `공식 근거와 충돌`
- `근거 부족`
- `과장 표현`

Summary counting rules:

- `summary.conflicted` counts claims where `label === "공식 근거와 충돌"`.
- The backend recomputes summary counts from `claims[]` and does not trust LLM-provided counts.

## Data/Demo Fixtures

Canonical backend smoke fixtures:

- Input document: `sample-data/sample_wrong_aws_deck.md`
- Success result: `sample-data/expected-results/analyze-success.json`
- Bedrock fallback result: `sample-data/expected-results/bedrock-fallback.json`

Both result fixtures must use the shared claim fields `claimId`, `text`, `label`, `confidence`, `reason`, `correctedText`, `sources`, and `evidence`.

## RAG Integration

- Backend calls `analyzeDocument(input)` from `backend/rag/lambdaHandler.mjs` after request validation.
- `FACTLENS_USE_FALLBACK=true` forces the same response schema through the fallback path.
- Bedrock or Knowledge Base errors also fall back to the same schema.

Current evidence data locations:

- Evidence bucket: `factlens-dev-evidence-docs-069423016509-ap-northeast-2`
- Evidence corpus key: `source-docs/aws-evidence-corpus.md`
- Fallback S3 key: `fallback/evidence_docs.json`

Warning: `factlens-rag-evidence-069423016509-ap-northeast-2` was created incorrectly. do not use it.

## Errors

Error body:

```json
{
  "error": {
    "code": "INVALID_DOCUMENT_TEXT",
    "message": "documentText must be a non-empty string."
  }
}
```

Error codes:

| Code | Meaning |
| --- | --- |
| `INVALID_DOCUMENT_TEXT` | `documentText` is missing, not a string, or empty after trimming |
| `INVALID_JSON` | Request body is not valid JSON |
| `INVALID_MAX_CLAIMS` | `maxClaims` is not an integer from `1` through `20` |
| `ANALYSIS_NOT_FOUND` | No analysis exists for the requested `analysisId` |

## Out of Scope

This backend contract does not define frontend implementation, RAG prompt work, demo asset implementation, PDF parsing, or PPTX parsing.
