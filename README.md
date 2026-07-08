# FactLens

AWS/AI 발표자료 속 주장을 공식 근거와 대조해 오류, 과장, 근거 부족을 잡아내는 RAG 기반 검증 서비스입니다.

## MVP Agreement

- 프로젝트명은 `FactLens`로 고정합니다.
- MVP 입력은 `텍스트 입력`을 필수로 합니다.
- PDF 업로드는 시간이 되면 추가합니다.
- PPTX는 직접 지원하지 않고 PDF 또는 텍스트로 변환해서 넣는 방식으로 안내합니다.
- AWS 서비스는 `S3`, `Lambda`, `API Gateway`, `Bedrock`, `DynamoDB`를 중심으로 사용합니다.
- AWS 리전은 서울 리전 `ap-northeast-2`로 고정합니다.
- `Bedrock Knowledge Bases`가 지연되면 `sample-data/evidence_docs.json` 기반 간단 RAG로 대체합니다.
- `Guardrails`는 선택 기능으로 둡니다.

## Repository Structure

```text
factlens/
  frontend/
  backend/
  infra/
  sample-data/
    evidence_docs.json
    sample_wrong_aws_deck.md
  docs/
  README.md
```

## Main Documents

- [프로젝트 통합 문서](docs/팩트렌즈_프로젝트_통합_문서.md): Git 병합 기록, 체크리스트, AWS 기술, 사용 도구, 연결 흐름 정리
- [API Contract](docs/api-contract.md): Backend, Frontend, RAG 공통 입출력 스키마
- [Architecture](docs/architecture.md): 서비스 흐름과 AWS 아키텍처
- [RAG Contract](docs/rag-contract.md): RAG 담당과 Backend 담당의 연결 규칙

## Fixed Labels

프론트엔드 색상 처리와 백엔드/RAG 판정 결과는 아래 문자열을 그대로 사용합니다.

```text
근거 있음
공식 근거와 충돌
근거 부족
과장 표현
```

## Planned AWS Stack

- Frontend hosting: S3
- API: API Gateway
- Compute: Lambda
- Model/RAG: Bedrock, Bedrock Knowledge Bases
- Region: `ap-northeast-2`
- Fallback RAG data: `sample-data/evidence_docs.json`
- Result storage: DynamoDB
- Optional: Guardrails

## Current Backend API

CloudFormation stack `factlens-backend-api` is deployed in `ap-northeast-2`.

```text
Base URL: https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
POST /analyze
GET /analyses/{analysisId}
```

Selected backend hardening from `feature/backend-api` is reflected in code:

- CORS `OPTIONS` preflight handling
- `MAX_CLAIMS_DEFAULT` environment default
- `GET /analyses/{analysisId}` path parameter handling
- Failed analysis persistence with `status: "FAILED"`
- Raw input archive support through `InputArchiveBucket`

Internet official-source search is available through request body `searchMode: "internet"` when a search API key is configured on Lambda.

```json
{
  "documentText": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
  "maxClaims": 3,
  "searchMode": "internet"
}
```

## Current Integration Notes

1. `origin/main` now contains the backend/RAG baseline and the React frontend MVP.
2. Presentation/demo notes live on `feature/demo-docs` and should describe implemented fallback RAG separately from Bedrock/Knowledge Bases extension work.
3. Bedrock Knowledge Bases and Bedrock model judging remain extension points unless a later branch documents a completed sync/model smoke test.

## Demo Assets

- Demo input: `sample-data/sample_wrong_aws_deck.md`
- Expected result/mock response: `sample-data/expected-results/analyze-success.json`
- Bedrock failure fallback response: `sample-data/expected-results/bedrock-fallback.json`
- Fallback evidence data: `sample-data/evidence_docs.json`
- Demo flow: `docs/demo-scenario.md`
- Presentation outline: `docs/presentation-outline.md`
- Presentation script: `docs/presentation-script.md`
- Q&A: `docs/qna.md`
- Git workflow: `docs/git-workflow.md`
