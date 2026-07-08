# Backend

Lambda와 API Gateway 기반 백엔드 영역입니다.

## Responsibilities

- PDF/텍스트 입력 처리
- 텍스트 분석 요청 처리
- 기존 분석 결과 조회
- claim 추출
- Bedrock Knowledge Bases 검색 호출
- Bedrock 판정 호출
- DynamoDB 분석 결과 저장

## API

- `POST /analyze`: 문서 텍스트 분석
- `GET /analyses/{analysisId}`: 기존 분석 결과 조회

`POST /analyze` 요청 body:

```json
{
  "documentText": "AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.",
  "maxClaims": 10
}
```

응답은 Frontend의 `frontend/INTEGRATION.md`와 같은 schema를 사용합니다.

## RAG Integration

RAG 담당 브랜치:

```text
feature/rag-bedrock
```

RAG 엔트리포인트:

```text
backend/rag/lambdaHandler.mjs
```

사용 함수:

```javascript
analyzeDocument(input)
```

Bedrock/Knowledge Bases가 아직 연결되지 않아도 fallback RAG가 같은 응답 schema를 반환합니다.

현재 실제로 사용할 근거 문서 버킷:

```text
factlens-dev-evidence-docs-069423016509-ap-northeast-2
```

S3 근거 문서:

```text
s3://factlens-dev-evidence-docs-069423016509-ap-northeast-2/source-docs/aws-evidence-corpus.md
```

Fallback JSON:

```text
s3://factlens-dev-evidence-docs-069423016509-ap-northeast-2/fallback/evidence_docs.json
```

주의: `factlens-rag-evidence-069423016509-ap-northeast-2`는 초기에 잘못 생성된 버킷이므로 사용하지 않습니다.

## Notes

구현 전 `docs/architecture.md`, `frontend/INTEGRATION.md`, `docs/rag-backend-handoff.md`의 API 응답 형식을 먼저 맞춘 뒤 작업합니다.
