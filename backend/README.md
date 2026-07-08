# Backend

Lambda와 API Gateway 기반 백엔드 영역입니다.

## Responsibilities

- PDF/텍스트 입력 처리
- 분석 job 생성 및 상태 조회
- claim 추출
- Bedrock Knowledge Bases 검색 호출
- Bedrock 판정 호출
- DynamoDB 분석 결과 저장

## Planned API

- `POST /analyses`: 분석 job 생성
- `GET /analyses/{jobId}`: 분석 상태 및 결과 조회

## Notes

구현 전 `docs/architecture.md`와 API 응답 형식을 먼저 맞춘 뒤 작업합니다.

