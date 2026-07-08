# FactLens Frontend Code Review & QA Report

작성일: 2026-07-08  
대상 브랜치: `feature/frontend-ui`  
평가 기준: 기능 구현, 설계, 통합 배포, 코드 품질

## 결론

Frontend는 현재 발표 데모 기준으로 동작 가능한 상태입니다. 텍스트 입력, 분석 요청, 결과 렌더링, 라벨 색상, fallback 결과 표시, 기존 결과 조회 UI까지 구현되어 있습니다.

실제 Backend API Gateway와 `POST /analyze`, `GET /analyses/{analysisId}` 통합 호출을 확인했습니다. 응답 schema 방어 로직과 최소 Node 테스트도 추가했습니다. 통합 배포 관점에서는 `npm run build`, `npm test`, API Gateway smoke check는 통과했지만, 브라우저 클릭 검증과 S3 hosting 또는 CloudFront 배포 확인은 아직 필요합니다.

## 평가 요약

| 평가 요소 | 현재 상태 | 점수 | 판단 |
|---|---:|---:|---|
| 기능 구현 | 통합 가능 | 88/100 | 핵심 UI와 실제 Backend API 연동 확인 |
| 설계 | 양호 | 84/100 | 응답 정규화 분리 완료. API client 분리는 아직 필요 |
| 통합 배포 | 부분 완료 | 80/100 | build, test, API Gateway smoke check 성공. S3/CloudFront 검증 필요 |
| 코드 품질 | 보통 이상 | 82/100 | 정규화 테스트와 실패 로그 추가. UI 테스트는 아직 필요 |

종합: 84/100

## 기능 구현 QA

확인한 기능:

- `POST /analyze` 호출 구현
- 요청 body `{ documentText, maxClaims }` 사용
- `GET /analyses/{analysisId}` 조회 UI 구현
- RAG 최신 claim schema인 `text`, `label`, `confidence`, `reason`, `correctedText`, `sources[].title`, `sources[].url` 또는 `sources[].uri`, `evidence` 반영
- 이전 `claimText` 응답도 fallback 렌더링
- 4개 label 색상 매핑 적용
- fallback/mock 결과도 정상 결과처럼 렌더링
- `VITE_API_BASE_URL` 환경변수 사용
- 실제 Backend API endpoint 연결 확인
- `normalizeAnalysisResult()`로 응답 schema 방어 처리
- API 실패 시 `console.error` 로그 출력

검증 결과:

```bash
cd frontend
npm run build
```

결과:

```text
✓ built
```

실제 Backend API:

```text
https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
```

`POST /analyze` 통합 테스트:

```text
HTTP 200
analysisId: analysis-964aade2-1533-4b27-9940-10187bf5b110
label: 공식 근거와 충돌
```

`GET /analyses/{analysisId}` 통합 테스트:

```text
HTTP 200
analysisId: analysis-964aade2-1533-4b27-9940-10187bf5b110
```

샘플 응답 JSON 검증:

```bash
python3 -m json.tool sample-data/expected-results/analyze-success.json
```

결과: JSON 문법 정상

자동 테스트:

```bash
cd frontend
npm test
```

결과:

```text
tests 5
pass 5
fail 0
```

부족한 점:

- `evidence` 필드는 받도록 schema에 맞췄지만 UI에서는 아직 상세 표시하지 않음
- API 실패 시 화면에는 fallback 결과가 정상 결과처럼 표시되므로, 사용자는 실패 여부를 구분하지 못함
- 브라우저 클릭 기반 CORS 검증은 아직 직접 확인 전

## 설계 리뷰

좋은 점:

- MVP 범위에 맞게 단일 React 화면으로 단순하게 구현되어 있음
- API 주소를 코드에 하드코딩하지 않고 `VITE_API_BASE_URL`로 분리함
- RAG schema 변경에 대응해 `text` 우선, `claimText` fallback 구조를 둠
- label 색상과 summary key가 명확하게 고정되어 있음
- sample-data와 integration 문서가 실제 UI schema와 맞춰져 있음
- `src/normalizers.js`로 schema 방어 로직을 중앙화함

부족한 점:

- API 호출 로직이 `App.jsx` 내부에 있어 기능이 커지면 유지보수가 어려워짐
- `VITE_API_TIMEOUT`은 문서에 있지만 실제 fetch timeout 구현은 없음
- fallback 데이터가 `App.jsx`에 직접 들어 있어 샘플 JSON과 중복 관리됨

권장 개선:

- `src/api.js`로 `analyzeText`, `loadAnalysis` API 호출 분리
- `mockResult`를 `sample-data/expected-results/analyze-success.json`과 한 출처로 맞추는 구조 검토
- fetch timeout 또는 AbortController 적용

## 통합 배포 QA

확인한 것:

- Frontend production build 성공
- API Gateway `POST /analyze` 실제 호출 성공
- API Gateway `GET /analyses/{analysisId}` 실제 조회 성공
- `npm test` 기반 schema 방어 테스트 성공
- API base URL 환경변수 구조 존재
- `frontend/.env.example` 제공
- `infra/DEPLOYMENT.md`에 `ap-northeast-2`, AWS SAM, CORS 기준 문서화
- RAG to Backend handoff 문서에 실제 S3 evidence bucket 정리
- `docs/frontend-smoke-test.md` 작성

부족한 점:

- 브라우저에서 실제 버튼 클릭 및 CORS 동작 확인 전
- S3 static hosting 또는 CloudFront 배포 검증 전
- 배포 후 smoke test 절차는 문서화됐지만 CI 자동화는 아직 없음

필수 통합 테스트:

```bash
VITE_API_BASE_URL=https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
npm run build
```

브라우저에서 확인:

- 텍스트 입력 후 `POST /analyze` 결과 표시
- analysisId 입력 후 `GET /analyses/{analysisId}` 결과 표시
- CORS 오류 없음
- label 색상 4종 표시
- sources 링크 클릭 가능

## 코드 품질 리뷰

좋은 점:

- 컴포넌트 구조가 작고 읽기 쉬움
- CSS가 별도 파일로 분리되어 있고 responsive media query가 있음
- label별 색상 class가 명확함
- `getClaimText`, `getSources`, `getClaimKey` helper로 일부 응답 변형을 흡수함
- `normalizeAnalysisResult()`로 summary, claims, confidence, sources 기본값을 처리함
- API 실패 시 `console.error`로 원인 추적 가능

리스크:

- React Testing Library 기반 UI 테스트는 아직 없음
- API 실패 시 사용자 화면에는 실패 여부를 별도 표시하지 않음
- 접근성 관점에서 로딩 상태, 오류 상태, 결과 갱신 알림이 충분하지 않음

권장 테스트:

- `npm run build`
- `npm test`
- JSON fixture 검증
- React Testing Library로 다음 테스트 추가:
  - fallback 결과 렌더링
  - label 4종 색상 class 적용
  - API 실패 시 fallback 적용

## 발견 사항

### High

없음. 현재 build가 통과하고, 데모 기준 핵심 화면은 동작 가능한 상태입니다.

### Medium

1. UI 자동화 테스트 미완료

정규화 로직은 `npm test`로 검증하지만, 실제 React 화면 렌더링과 클릭 흐름을 검증하는 테스트는 아직 없습니다.

2. 브라우저 클릭/CORS 검증 미완료

명령 기반 API Gateway smoke check는 성공했습니다. 다만 실제 브라우저에서 `분석 시작`, `결과 조회` 버튼을 누르는 CORS 검증은 아직 별도 확인이 필요합니다.

3. API 호출 모듈 분리 필요

API 호출 로직이 아직 `App.jsx`에 남아 있습니다. 규모가 커지면 `src/api.js`로 분리하는 것이 좋습니다.

### Low

1. `evidence` 미표시

현재 MVP는 `sources` 우선 표시라 문제는 아니지만, RAG 품질을 보여주려면 evidence 일부를 접이식 상세 영역으로 보여주는 개선 여지가 있습니다.

2. API timeout 미구현

문서에는 `VITE_API_TIMEOUT`이 있지만 코드에는 timeout 처리가 없습니다. Bedrock 호출 지연 가능성을 고려하면 필요합니다.

3. 긴 analysisId와 긴 source title 표시 확인 필요

CSS는 responsive 대응이 되어 있으나 실제 긴 데이터로 visual QA가 필요합니다.

## 다음 액션

1. Backend 담당에게 최신 schema 확인:

```text
claimId
text
label
confidence
reason
correctedText
sources[].title
sources[].url
sources[].uri
sources[].excerpt
evidence
```

2. Backend API Gateway URL을 `.env.local`에 설정

```env
VITE_API_BASE_URL=https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
```

3. 브라우저 클릭 기반 smoke test 수행

확인:

- `분석 시작` 클릭
- `결과 조회` 클릭
- CORS 오류 없음

4. UI 테스트 추가

우선순위:

- fallback 결과 렌더링
- label 4종 색상 class 적용
- API 실패 시 fallback 적용

5. S3/CloudFront 배포 검증

필수 확인:

- S3/CloudFront 또는 S3 static hosting에서 화면 로드
- API Gateway CORS 정상
- `POST /analyze` 정상
- `GET /analyses/{analysisId}` 정상
- 4개 label 색상 표시

## 현재 부족한 것 한 줄 정리

가장 부족한 부분은 브라우저 클릭 기반 CORS 검증, UI 자동화 테스트, S3/CloudFront 배포 검증입니다. 실제 Backend API 연동, schema 방어 로직, 실패 로그, 최소 Node 테스트, smoke test 문서화는 완료됐습니다.
