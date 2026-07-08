# FactLens Demo Input: AWS AI Agent 발표자료 초안

아래 문서는 FactLens 시연을 위해 일부러 맞는 문장, 틀린 문장, 근거 부족 문장, 과장 문장을 섞은 발표자료 입력 예시입니다.

## Slide 1. 프로젝트 개요

FactLens는 AWS/AI 발표자료 속 기술 주장을 문장 단위로 추출하고, 공식 근거와 비교해 틀린 문장과 과장 표현을 색상으로 찾아주는 근거 충돌 탐지 RAG 서비스입니다.

## Slide 2. AWS 구성

1. Amazon S3는 객체 저장 서비스이며, 정적 웹 사이트 호스팅에 사용할 수 있다.
2. Amazon API Gateway는 Lambda 같은 백엔드 서비스 앞에서 API를 생성하고 운영하는 데 사용할 수 있다.
3. AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.
4. DynamoDB는 관계형 데이터베이스라서 SQL JOIN 기반 분석 결과 저장에 가장 적합하다.

## Slide 3. Bedrock/RAG 설명

5. Bedrock Knowledge Bases는 S3 같은 데이터 소스를 연결하거나 동기화하지 않아도 RAG 근거 검색을 자동으로 수행한다.
6. Guardrails를 적용하면 모든 잘못된 답변과 환각을 100% 차단할 수 있다.
7. Bedrock Knowledge Bases는 어떤 리전에서도 별도 설정 없이 모든 Foundation Model을 자동으로 사용할 수 있다.

## Slide 4. 기대 효과

8. FactLens를 사용하면 발표자료의 모든 기술 오류를 완전히 자동으로 검증할 수 있다.
