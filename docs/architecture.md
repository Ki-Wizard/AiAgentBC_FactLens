# Architecture

## Service Flow

1. 사용자가 프론트엔드에서 PDF 또는 텍스트를 입력합니다.
2. 프론트엔드가 API Gateway로 분석 요청을 보냅니다.
3. Lambda가 문서 텍스트를 추출하고 핵심 claim을 분리합니다.
4. 각 claim에 대해 Bedrock Knowledge Bases에서 관련 근거를 검색합니다.
5. Bedrock 모델이 claim과 근거를 비교해 판정합니다.
6. 결과를 DynamoDB에 저장합니다.
7. 프론트엔드가 분석 결과를 조회해 claim별 판정과 근거를 표시합니다.

## Verdict Types

- `supported`: 근거 있음
- `contradicted`: 공식 근거와 충돌
- `insufficient`: 근거 부족
- `exaggerated`: 과장 표현

## Initial Architecture

```text
User
  -> React on S3
  -> API Gateway
  -> Lambda
  -> Bedrock Knowledge Bases
  -> Bedrock Model
  -> DynamoDB
  -> React Result UI
```

## Open Decisions

- Bedrock 사용 리전
- 사용할 Foundation Model
- Knowledge Base 벡터 저장소 방식
- 인프라 배포 방식: CDK, SAM, CloudFormation, 콘솔 수동 구성

