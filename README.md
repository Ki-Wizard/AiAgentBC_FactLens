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

## Next Steps

1. 역할별 브랜치에서 작업을 시작합니다.
2. 프론트엔드, 백엔드, RAG 담당은 `docs/api-contract.md`의 응답 스키마를 기준으로 개발합니다.
3. Data/Demo 담당은 `sample-data/evidence_docs.json`과 `sample-data/sample_wrong_aws_deck.md`를 먼저 채웁니다.
4. 다른 담당 폴더는 직접 수정하지 않는 것을 원칙으로 합니다.
