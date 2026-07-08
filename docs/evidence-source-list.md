# Evidence Source List

Bedrock Knowledge Bases 또는 fallback RAG에 넣을 공식 근거 후보입니다.

| ID | Title | URL | Purpose |
| --- | --- | --- | --- |
| `aws-lambda-timeout` | Configure Lambda function timeout | https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html | Lambda timeout claim 검증 |
| `aws-lambda-quotas` | AWS Lambda quotas | https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html | Lambda quota claim 검증 |
| `amazon-s3-object-storage` | What is Amazon S3? | https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html | S3 object storage claim 검증 |
| `amazon-s3-static-website` | Hosting a static website using Amazon S3 | https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html | S3 static hosting claim 검증 |
| `bedrock-knowledge-bases` | Knowledge bases for Amazon Bedrock | https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html | RAG/Knowledge Bases claim 검증 |
| `bedrock-guardrails` | Guardrails for Amazon Bedrock | https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html | Guardrails 과장 표현 검증 |
| `amazon-dynamodb-introduction` | What is Amazon DynamoDB? | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html | DynamoDB database type claim 검증 |
| `api-gateway-overview` | What is Amazon API Gateway? | https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html | API Gateway role claim 검증 |

## Knowledge Base Notes

- 우선순위는 AWS 공식 문서입니다.
- 팀 강의자료를 넣을 경우, 공식 문서와 충돌하지 않는 보조 근거로만 사용합니다.
- Knowledge Bases가 지연되면 `sample-data/evidence_docs.json`의 `summary`와 `keywords`를 fallback 검색 컨텍스트로 사용합니다.
