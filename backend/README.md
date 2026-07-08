# Backend

Lambda와 API Gateway 기반 백엔드 영역입니다.

## Responsibilities

- 텍스트 입력 처리
- PDF 입력은 시간이 되면 추가
- 분석 job 생성 및 상태 조회
- claim 추출
- Bedrock Knowledge Bases 검색 호출
- `sample-data/evidence_docs.json` 기반 fallback RAG 처리
- Bedrock 판정 호출
- DynamoDB 분석 결과 저장

## AWS Defaults

- Region: `ap-northeast-2`

## Planned API

- `POST /analyze`: 분석 실행
- `GET /analyses/{analysisId}`: 분석 상태 및 결과 조회
- 사용하지 않음: `POST /analyses`, `jobId`

## Request Body

```json
{
  "documentText": "전체 문서 텍스트",
  "maxClaims": 10
}
```

## Notes

구현 전 `docs/api-contract.md`의 응답 스키마와 라벨 문자열을 먼저 맞춘 뒤 작업합니다.

## RAG Integration

- Branch: `feature/rag-bedrock`
- Entrypoint: `backend/rag/lambdaHandler.mjs`
- Function: `analyzeDocument(input)`
- Input: `documentText`, `maxClaims`
- Output: common analysis response schema in `docs/api-contract.md`
