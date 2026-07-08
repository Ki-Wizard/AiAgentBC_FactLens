# API Contract

프론트엔드, 백엔드, RAG 담당은 이 응답 스키마를 기준으로 개발합니다.

## Endpoints

```http
POST /analyze
GET /analyses/{analysisId}
```

## Fixed Response Shape

```json
{
  "analysisId": "analysis-001",
  "status": "COMPLETED",
  "summary": {
    "totalClaims": 5,
    "supported": 1,
    "conflicted": 2,
    "insufficient": 1,
    "exaggerated": 1
  },
  "claims": [
    {
      "claimId": "claim-001",
      "text": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
      "label": "공식 근거와 충돌",
      "confidence": 0.91,
      "reason": "공식 근거와 제한 시간이 다르다.",
      "correctedText": "공식 quota 문서를 기준으로 실행 시간 제한을 다시 작성해야 한다.",
      "sources": [
        {
          "title": "AWS Lambda quotas",
          "url": "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html"
        }
      ]
    }
  ]
}
```

## Fixed Labels

아래 문자열은 프론트엔드 색상 처리와 연결되므로 임의로 바꾸지 않습니다.

```text
근거 있음
공식 근거와 충돌
근거 부족
과장 표현
```

