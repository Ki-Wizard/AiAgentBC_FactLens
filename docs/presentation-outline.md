# Presentation Outline

## Core Sentence

FactLens는 AWS/AI 발표자료 속 기술 주장을 문장 단위로 추출하고, 공식 근거와 비교해 틀린 문장과 과장 표현을 색상으로 찾아주는 근거 충돌 탐지 RAG 서비스입니다.

## Slide Plan

1. **Problem**
   - AWS/AI 발표자료는 기술 용어와 수치가 많아 작은 오류를 놓치기 쉽습니다.
   - 일반 챗봇은 "질문에 답하기"는 잘하지만, 문서 전체의 주장 검증은 직관적으로 보여주기 어렵습니다.

2. **Solution**
   - 발표자료 텍스트에서 핵심 claim을 추출합니다.
   - AWS 공식 근거와 비교해 라벨을 붙입니다.
   - 결과를 색상과 출처로 보여줍니다.

3. **AWS Architecture**
   - React on S3
   - API Gateway
   - Lambda
   - Bedrock / Bedrock Knowledge Bases
   - DynamoDB
   - fallback: `sample-data/evidence_docs.json`

4. **Team Roles**
   - RAG & Bedrock: claim 추출/판정 프롬프트, Knowledge Bases
   - Backend & AWS API: Lambda, API Gateway, DynamoDB
   - Frontend & UX: 입력/결과 화면
   - Data, Demo & Presentation: 데모 입력, 근거 데이터, 발표자료

5. **Demo**
   - `sample-data/sample_wrong_aws_deck.md` 입력
   - Lambda timeout 오류 claim 확인
   - Guardrails 100% 차단 과장 claim 확인
   - 근거 부족 claim 확인

6. **Fallback Strategy**
   - Bedrock 실패: mock JSON 사용
   - Knowledge Bases 지연: `evidence_docs.json` 기반 fallback RAG
   - API 실패: `sample-data/expected-results/analyze-success.json`으로 결과 화면 시연

7. **Result**
   - FactLens는 기술 발표자료 검토 시간을 줄이고, 공식 근거 기반 피드백을 제공합니다.
