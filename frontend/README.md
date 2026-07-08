# Frontend

FactLens 사용자 화면 영역입니다.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

백엔드 API가 준비되면 `.env` 또는 실행 환경에 아래 값을 설정합니다.

```bash
VITE_API_BASE_URL=https://your-api-id.execute-api.ap-northeast-2.amazonaws.com
```

값이 없거나 API 호출이 실패하면 발표 데모가 끊기지 않도록 fallback 결과를 실제 응답과 같은 화면 구조로 렌더링합니다.

## Responsibilities

- 텍스트 직접 입력 UI
- PDF 업로드 UI는 시간이 되면 추가
- 분석 진행 상태 표시
- claim별 색상 판정 테이블
- 근거 출처, 충돌 이유, 수정 제안 표시
- `POST /analyze`, `GET /analyses/{analysisId}` 연동

## Planned Screens

- Text Input
- Analysis Progress
- Result Report

## Notes

초기 MVP는 텍스트 입력을 필수 플로우로 만들고, S3 정적 호스팅에 올릴 수 있는 React 앱으로 구성합니다. PDF/PPTX는 직접 지원 범위에서 제외합니다. 라벨 색상은 `docs/api-contract.md`의 고정 문자열을 기준으로 처리합니다.
