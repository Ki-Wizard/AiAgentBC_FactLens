# Frontend Smoke Test

## Purpose

이 문서는 FactLens 프론트엔드가 실제 Backend API와 연결되는지 빠르게 확인하는 절차입니다.

## Current Backend API

```text
https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
```

## Local Environment

`frontend/.env.local`:

```env
VITE_API_BASE_URL=https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
```

## Command Checks

### 1. Frontend Build

```bash
cd frontend
npm run build
```

Expected:

```text
✓ built
```

### 2. Frontend Unit Smoke

```bash
cd frontend
npm test
```

Expected:

```text
pass 5
fail 0
```

### 3. Backend POST

```bash
curl -i -sS --max-time 30 \
  -X POST https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com/analyze \
  -H 'Content-Type: application/json' \
  --data '{"documentText":"AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.","maxClaims":3,"searchMode":"internet"}'
```

Expected:

```text
HTTP/2 200
label: 공식 근거와 충돌
analysisId: analysis-...
```

### 4. Backend GET

POST 응답의 `analysisId`를 사용합니다.

```bash
curl -i -sS --max-time 20 \
  https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com/analyses/<analysisId>
```

Expected:

```text
HTTP/2 200
status: COMPLETED
```

## Browser Checks

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

If `5173` is already in use, Vite prints another port such as:

```text
http://localhost:5174
```

Check:

- 텍스트 입력 후 `분석 시작` 클릭
- 결과 목록과 상세 패널 표시
- `공식 근거와 충돌` label이 Red로 표시
- `analysisId`가 결과 목록 상단에 표시
- 표시된 `analysisId`로 `결과 조회` 클릭
- 브라우저 콘솔에 CORS 오류가 없음

## Known Remaining Gaps

- S3/CloudFront 배포 화면 검증은 아직 별도로 필요합니다.
- API 실패 시 fallback UI는 정상 결과처럼 렌더링됩니다. 실패 원인은 개발자 콘솔의 `console.error`로 확인합니다.
