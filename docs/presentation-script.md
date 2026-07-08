# Presentation Script

## Opening

FactLens는 AWS/AI 발표자료 속 기술 주장을 문장 단위로 추출하고, 공식 근거와 비교해 틀린 문장과 과장 표현을 색상으로 찾아주는 근거 충돌 탐지 RAG 서비스입니다.

## Problem

팀 프로젝트나 기술 발표자료를 만들다 보면 AWS 서비스 제한, 보안 기능, RAG 구성 방식처럼 정확해야 하는 내용이 자주 들어갑니다. 그런데 발표자는 익숙하다고 생각해서 틀린 수치나 과장 표현을 놓치기 쉽습니다. FactLens는 이 문제를 "문서 기반 질문 답변"이 아니라 "문서 속 주장 검증"으로 풀었습니다.

## Solution

사용자가 발표자료 텍스트를 넣으면 FactLens가 핵심 claim을 추출합니다. 각 claim은 AWS 공식 문서와 비교되고, 결과는 `근거 있음`, `공식 근거와 충돌`, `근거 부족`, `과장 표현` 중 하나로 표시됩니다. 사용자는 틀린 문장만 빠르게 확인하고, 공식 출처와 수정 제안까지 볼 수 있습니다.

## Current Scope

현재 구현은 배포된 Backend API, DynamoDB 저장, fallback evidence 기반 RAG, 그리고 선택적인 공식 출처 인터넷 검색 옵션까지입니다. Bedrock Knowledge Bases와 Bedrock 모델 판정은 같은 응답 스키마에 붙일 수 있는 확장 지점으로 설명합니다. React 화면 구현은 `feature/frontend-ui` 브랜치에 있으며, 최종 main 병합 전에는 별도 브랜치 구현 상태로 구분합니다.

## Demo Script

1. 데모 입력으로 `sample-data/sample_wrong_aws_deck.md`를 사용합니다.
2. "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다" claim을 보여줍니다.
3. FactLens가 이 문장을 `공식 근거와 충돌`로 판정하는 장면을 보여줍니다.
4. 공식 문서에 기반해 "최대 15분"으로 수정 제안하는 부분을 강조합니다.
5. "Guardrails를 적용하면 모든 잘못된 답변과 환각을 100% 차단할 수 있다" claim을 보여줍니다.
6. FactLens가 이 문장을 `과장 표현`으로 잡는 장면을 보여줍니다.
7. 근거가 부족한 리전/모델 자동 사용 claim을 보여주며, 근거가 없을 때 억지로 맞다고 하지 않는 점을 설명합니다.

## Closing

FactLens의 핵심은 RAG를 단순 챗봇에 쓰는 것이 아니라, 공식 근거와 사용자 문서의 주장을 비교해서 오류를 눈에 보이게 만드는 것입니다. 현재 MVP는 API Gateway, Lambda, DynamoDB, fallback evidence 데이터로 이 흐름을 검증했고, Bedrock Knowledge Bases와 Bedrock 모델 판정은 이후 같은 스키마에 연결할 수 있도록 분리해 두었습니다.
