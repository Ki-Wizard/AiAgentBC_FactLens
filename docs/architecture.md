# Architecture

## Service Flow

1. 사용자가 프론트엔드에서 텍스트를 입력합니다.
2. 시간이 되면 PDF 업로드를 추가하고, PPTX는 PDF 또는 텍스트 변환 방식으로 안내합니다.
3. 프론트엔드가 API Gateway의 `POST /analyze`로 분석 요청을 보냅니다.
4. Lambda가 요청을 검증하고 `backend/rag/lambdaHandler.mjs`의 `analyzeDocument(input)`을 호출합니다.
5. RAG 모듈이 핵심 claim을 분리합니다.
6. `searchMode: "internet"`이면 공식 출처 인터넷 검색을 시도하고, 기본값 또는 실패 시 `sample-data/evidence_docs.json` 기반 fallback evidence를 검색합니다.
7. 현재 MVP는 fallback judge가 claim과 evidence를 비교해 판정합니다.
8. 결과를 DynamoDB에 저장합니다.
9. 프론트엔드가 claim별 판정과 근거를 표시합니다.

## Verdict Types

아래 라벨 문자열은 임의로 변경하지 않습니다.

- `근거 있음`
- `공식 근거와 충돌`
- `근거 부족`
- `과장 표현`

## Current MVP Architecture

```text
User
  -> React on S3
  -> API Gateway
  -> Lambda
  -> official-source internet search or sample-data/evidence_docs.json fallback
  -> fallbackJudge
  -> DynamoDB
  -> React Result UI
```

## Extension Architecture

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

- 사용할 Foundation Model
- Knowledge Base 벡터 저장소 방식
- PDF 업로드 추가 여부
- Frontend 배포 URL과 Backend API URL을 연결한 최종 브라우저 E2E 검증 시점

## AWS Defaults

- Region: `ap-northeast-2`
- Deploy: AWS SAM
- API Gateway CORS: Frontend origin 허용
