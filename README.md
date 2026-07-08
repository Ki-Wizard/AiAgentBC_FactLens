# FactLens

AWS/AI 발표자료 속 주장을 공식 근거와 대조해 오류, 과장, 근거 부족을 잡아내는 RAG 기반 검증 서비스입니다.

## 핵심 아이디어

사용자가 PDF 또는 텍스트를 업로드하면 FactLens가 핵심 claim을 추출하고, Amazon Bedrock Knowledge Bases에 저장된 AWS 공식문서/강의자료/기술문서와 대조합니다. 결과는 `근거 있음`, `공식 근거와 충돌`, `근거 부족`, `과장 표현`으로 분류하고 출처와 함께 보여줍니다.

## MVP 범위

- 입력: PDF 업로드, 텍스트 직접 입력
- 도메인: AWS/AI 기술 주장 검증
- 출력: claim별 판정, 근거 출처, 충돌 이유, 수정 제안
- 제외: 뉴스/정치/법률/의료 팩트체크, 실시간 웹 검색, PPTX 직접 파싱

## 예상 AWS 스택

- Frontend: React, S3 Static Website Hosting
- API: Amazon API Gateway
- Compute: AWS Lambda
- RAG: Amazon Bedrock Knowledge Bases
- LLM: Amazon Bedrock
- Storage: Amazon S3
- Database: Amazon DynamoDB
- Optional: Amazon Bedrock Guardrails

## Repository Structure

```text
frontend/       # React UI
backend/        # Lambda/API application code
infra/          # AWS infrastructure templates
docs/           # architecture, role split, demo plan
sample-data/    # sample PDFs, source documents, expected outputs
```

## Next Steps

1. 팀원 4명 역할을 `docs/team-roles.md`에 확정합니다.
2. AWS 리전과 사용 가능한 Bedrock 모델/Knowledge Bases 권한을 확인합니다.
3. 근거 문서와 데모용 오류 발표자료를 `sample-data/` 기준으로 준비합니다.
4. API 계약과 결과 JSON 형식을 확정합니다.

