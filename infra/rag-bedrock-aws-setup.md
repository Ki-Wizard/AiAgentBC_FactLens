# RAG & Bedrock AWS Setup

## Region

FactLens uses Seoul region.

```bash
aws configure set region ap-northeast-2
aws configure get region
```

## MVP AWS Implementation

RAG 담당 파트의 AWS 구현은 두 단계로 진행한다.

1. S3에 Knowledge Base source document와 fallback evidence JSON 업로드
2. Backend Lambda에서 `backend/rag/lambdaHandler.mjs`를 호출해 claim 판정 응답 생성

Bedrock Knowledge Bases 권한과 인덱싱이 준비되기 전까지는 `sample-data/evidence_docs.json` 기반 fallback RAG를 사용한다.

## Upload Evidence Documents To S3

```bash
chmod +x infra/scripts/upload-rag-evidence.sh
AWS_REGION=ap-northeast-2 ./infra/scripts/upload-rag-evidence.sh
```

업로드 결과:

```text
s3://<bucket>/source-docs/
s3://<bucket>/fallback/evidence_docs.json
```

## Lambda Handler

Backend 담당에게 아래 handler를 연결하도록 전달한다.

```text
backend/rag/lambdaHandler.handler
```

요청 예시:

```json
{
  "documentText": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
  "maxClaims": 10
}
```

## Bedrock Knowledge Bases Extension

시간이 되면 다음 순서로 확장한다.

1. S3 source prefix를 Bedrock Knowledge Bases data source로 연결한다.
2. Knowledge Base sync job을 실행한다.
3. Backend에서 claim별 retrieve API를 호출한다.
4. 검색된 evidence를 `evidence_judge_prompt.md`에 넣어 Bedrock Runtime으로 판정한다.
5. Knowledge Bases 또는 Bedrock이 실패하면 fallback RAG를 그대로 사용한다.

## Required IAM Direction

Lambda 실행 역할에는 최소한 다음 권한이 필요하다.

```text
bedrock:InvokeModel
bedrock:Retrieve
s3:GetObject
dynamodb:PutItem
dynamodb:GetItem
dynamodb:UpdateItem
logs:CreateLogGroup
logs:CreateLogStream
logs:PutLogEvents
```

교육 계정 권한에 따라 일부 Bedrock Knowledge Bases 권한은 제한될 수 있다.
