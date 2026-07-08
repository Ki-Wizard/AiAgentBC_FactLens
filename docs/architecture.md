# Architecture

## Service Flow

1. 사용자가 프론트엔드에서 텍스트를 입력합니다.
2. 시간이 되면 PDF 업로드를 추가하고, PPTX는 PDF 또는 텍스트 변환 방식으로 안내합니다.
3. 프론트엔드가 API Gateway의 `POST /analyze`로 분석 요청을 보냅니다.
4. Lambda가 문서 텍스트를 추출하고 핵심 claim을 분리합니다.
5. 각 claim에 대해 Bedrock Knowledge Bases에서 관련 근거를 검색합니다.
6. Bedrock Knowledge Bases가 지연되면 `sample-data/evidence_docs.json` 기반 간단 RAG로 대체합니다.
7. Bedrock 모델이 claim과 근거를 비교해 판정합니다.
8. 결과를 DynamoDB에 저장합니다.
9. 프론트엔드가 claim별 판정과 근거를 표시합니다.

## Verdict Types

아래 라벨 문자열은 임의로 변경하지 않습니다.

- `근거 있음`
- `공식 근거와 충돌`
- `근거 부족`
- `과장 표현`

## Initial Architecture

```text
User
  -> React on S3
  -> API Gateway
  -> Lambda
  -> Bedrock Knowledge Bases or sample-data/evidence_docs.json fallback
  -> Bedrock Model
  -> DynamoDB
  -> React Result UI
```

## Open Decisions

- 사용할 Foundation Model
- Knowledge Base 벡터 저장소 방식
- PDF 업로드 추가 여부

## AWS Defaults

- Region: `ap-northeast-2`
