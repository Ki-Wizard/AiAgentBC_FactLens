# Frontend 작업 정리

## 작업 위치

```text
/Users/baeseongchan/Workspace/chat/amazon/AiAgentBC_FactLens/frontend
```

현재 작업 브랜치:

```text
feature/frontend-ui
```

## 작업 목적

FactLens 프론트엔드 MVP 화면을 먼저 구성했다.

백엔드 API와 RAG 판정 로직이 아직 완성되지 않아도 발표 데모가 가능하도록, 실제 API 응답과 같은 schema의 fallback 분석 결과를 기반으로 다음 흐름을 화면에서 확인할 수 있게 했다.

```text
텍스트 입력
→ 분석 시작
→ claim 목록 표시
→ 라벨별 색상 표시
→ claim 상세 근거 확인
```

## 생성한 파일

```text
frontend/package.json
frontend/package-lock.json
frontend/index.html
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/styles.css
frontend/.env.example
frontend/INTEGRATION.md
frontend/CHECKLIST.md
frontend/docs/frontend-work-summary.md
```

## 수정한 파일

```text
frontend/README.md
```

## 주요 구현 내용

### 1. React/Vite 앱 구조 추가

`frontend/package.json`을 추가해 프론트엔드를 Vite 기반 React 앱으로 실행할 수 있게 했다.

실행 명령어:

```bash
cd frontend
npm install
npm run dev
```

빌드 명령어:

```bash
npm run build
```

### 2. Fallback 분석 결과 화면 구현

`frontend/src/App.jsx`에 fallback 분석 결과를 넣었다.

백엔드 API가 아직 없거나 실패해도 아래 라벨들이 화면에 표시된다.

```text
근거 있음
공식 근거와 충돌
근거 부족
과장 표현
```

현재 mock 데이터는 AWS/AI 주장 예시를 사용한다.

- Amazon Bedrock 고객 데이터 학습 관련 claim
- AWS Lambda 실행 시간 제한 관련 claim
- Amazon S3 근거 부족 claim
- Amazon Bedrock 절대 보장 표현 claim

### 3. 라벨별 색상 처리

프론트엔드 체크리스트 v1.1 기준 라벨 색상을 적용했다.

| 라벨 | 색상 |
|---|---|
| 근거 있음 | Green |
| 공식 근거와 충돌 | Red |
| 근거 부족 | Gray |
| 과장 표현 | Yellow |

### 4. 결과 요약 카드 구현

분석 결과 상단에 summary 값을 카드로 표시한다.

```text
전체 claim
근거 있음
충돌
근거 부족
과장
```

### 5. Claim 목록과 상세 패널 구현

왼쪽에는 claim 목록을 표시하고, 사용자가 claim을 클릭하면 오른쪽 상세 패널에 아래 정보를 보여준다.

```text
claim 문장
판정 라벨
신뢰도
판정 이유
수정 제안
근거 출처 링크
```

RAG 최신 응답 schema 기준으로 claim 본문은 `text`를 우선 사용한다. 이전 `claimText` 응답이 들어와도 화면이 깨지지 않도록 fallback 처리했다.

`claimId`는 있으면 선택 key로 사용하지만 필수 응답 필드로 의존하지 않는다. RAG 응답에 `claimId`가 없어도 배열 순서 기반 key로 렌더링한다.

### 6. API 연결 준비

백엔드 API가 준비되면 환경변수로 연결할 수 있게 했다.

```bash
VITE_API_BASE_URL=https://your-api-id.execute-api.ap-northeast-2.amazonaws.com
```

설정되면 프론트엔드는 다음 API를 호출한다.

```http
POST /analyze
GET /analyses/{analysisId}
```

`POST /analyze` 요청 body:

```json
{
  "documentText": "검증할 발표자료 전체 텍스트",
  "maxClaims": 10
}
```

`POST /analyses`, `jobId`는 사용하지 않는다.

응답은 claim마다 아래 필드를 기대한다.

```text
claimId
text
label
confidence
reason
correctedText
sources[].title
sources[].url
evidence
```

summary는 아래 key를 기대한다.

```text
totalClaims
supported
conflicted
insufficient
exaggerated
```

API URL이 없거나 API 호출에 실패하면 fallback 결과를 정상 결과처럼 렌더링한다. fallback 여부를 UI에서 별도 표시하지 않는다.

## README 수정 내용

`frontend/README.md`에 Quick Start 섹션을 추가했다.

추가된 내용:

- `npm install`
- `npm run dev`
- `VITE_API_BASE_URL` 설정 방법
- API 실패 시 fallback 결과 렌더링 안내

## 현재 상태

현재 프론트엔드는 백엔드 없이도 화면 확인이 가능한 상태다.

다음 단계는 아래 순서로 진행하면 된다.

1. `npm install`
2. `npm run dev`
3. 화면에서 fallback 결과 확인
4. Backend 담당에게 `/analyze` endpoint를 받으면 `VITE_API_BASE_URL` 설정
5. 실제 API 응답으로 claim 결과 표시 확인

## 남은 작업

- 실제 API endpoint 연결 테스트
- 파일 업로드 UI 추가 여부 결정
- API 실패 시 사용자 메시지 다듬기
- 발표 화면 기준으로 긴 문장 overflow 확인
- 팀 공통 JSON 스키마가 바뀌면 `App.jsx` 데이터 매핑 수정
