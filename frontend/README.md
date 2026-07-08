# Frontend

FactLens 사용자 화면 영역입니다.

## Responsibilities

- 텍스트 직접 입력 UI
- PDF 업로드 UI는 시간이 되면 추가
- 분석 진행 상태 표시
- claim별 색상 판정 테이블
- 근거 출처, 충돌 이유, 수정 제안 표시
- `API_BASE_URL` 환경변수/config 기반 API 호출

## Planned Screens

- Text Input
- Analysis Progress
- Result Report

## Notes

초기 MVP는 텍스트 입력을 필수 플로우로 만들고, PDF/PPTX는 직접 지원 범위에서 제외합니다. 라벨 색상은 `docs/api-contract.md`의 고정 문자열을 기준으로 처리합니다.

React/Vite 구현은 `origin/feature/frontend-ui`에 있으며, 이 문서가 있는 `feature/demo-docs` 기준으로는 최종 `origin/main` 병합 여부를 별도로 확인해야 합니다.

## API Requirements

- 호출: `POST /analyze`
- 조회: `GET /analyses/{analysisId}`
- 금지: `POST /analyses`, `jobId`
- 선택: `searchMode`는 `fallback` 또는 `internet`
- 요청 body:

```json
{
  "documentText": "전체 문서 텍스트",
  "maxClaims": 10,
  "searchMode": "fallback"
}
```

- 렌더링 필드: `text`, `label`, `reason`, `correctedText`, `sources[].title`, `sources[].url`
- claim 식별자는 `claimId`를 사용합니다.
- `evidence`는 선택적으로 상세 패널에서 사용할 수 있습니다.
- mock/fallback도 실제 API 응답과 같은 schema로 렌더링합니다.
