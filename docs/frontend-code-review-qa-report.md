# FactLens Frontend Code Review & QA Report

작성일: 2026-07-08  
대상 브랜치: `feature/frontend-ui`  
평가 기준: 기능 구현, 설계, 통합 배포, 코드 품질

## 결론

Frontend는 현재 발표 데모 기준으로는 동작 가능한 상태입니다. 텍스트 입력, 분석 요청, 결과 렌더링, 라벨 색상, fallback 결과 표시, 기존 결과 조회 UI까지 구현되어 있습니다.

다만 실제 Backend/API와의 end-to-end 검증은 아직 완료되지 않았고, 자동화 테스트가 없습니다. 통합 배포 관점에서는 `npm run build`는 통과했지만, 실제 API Gateway URL, CORS, S3 hosting 배포까지는 확인이 필요합니다.

## 평가 요약

| 평가 요소 | 현재 상태 | 점수 | 판단 |
|---|---:|---:|---|
| 기능 구현 | 데모 가능 | 80/100 | 핵심 UI와 schema 대응은 완료. 실제 API 검증 전 |
| 설계 | 양호 | 78/100 | 단순하고 이해 쉬움. API client 분리와 schema 검증은 부족 |
| 통합 배포 | 부분 완료 | 60/100 | build 성공. 실제 Backend, CORS, S3 배포 검증 필요 |
| 코드 품질 | 보통 이상 | 72/100 | 작고 명확함. 테스트, 에러 처리, 데이터 방어 로직 보강 필요 |

종합: 73/100

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

검증 결과:

```bash
cd frontend
npm run build
```

결과:

```text
✓ built in 597ms
```

샘플 응답 JSON 검증:

```bash
python3 -m json.tool sample-data/expected-results/analyze-success.json
```

결과: JSON 문법 정상

부족한 점:

- 실제 Backend endpoint로 `POST /analyze`, `GET /analyses/{analysisId}`를 호출한 통합 테스트는 아직 없음
- `evidence` 필드는 받도록 schema에 맞췄지만 UI에서는 아직 상세 표시하지 않음
- API 실패 시 fallback으로 전환되지만, 사용자나 개발자가 실패 원인을 화면에서 구분하기 어려움
- `summary`, `claims`, `confidence`, `sources`가 비정상 형태일 때 완전한 방어 렌더링은 아님

## 설계 리뷰

좋은 점:

- MVP 범위에 맞게 단일 React 화면으로 단순하게 구현되어 있음
- API 주소를 코드에 하드코딩하지 않고 `VITE_API_BASE_URL`로 분리함
- RAG schema 변경에 대응해 `text` 우선, `claimText` fallback 구조를 둠
- label 색상과 summary key가 명확하게 고정되어 있음
- sample-data와 integration 문서가 실제 UI schema와 맞춰져 있음

부족한 점:

- API 호출 로직이 `App.jsx` 내부에 있어 기능이 커지면 유지보수가 어려워짐
- 응답 schema validation 함수가 없어 Backend 응답이 조금만 깨져도 런타임 오류 가능성이 있음
- `VITE_API_TIMEOUT`은 문서에 있지만 실제 fetch timeout 구현은 없음
- fallback 데이터가 `App.jsx`에 직접 들어 있어 샘플 JSON과 중복 관리됨

권장 개선:

- `src/api.js`로 `analyzeText`, `loadAnalysis` API 호출 분리
- `src/schema.js` 또는 `src/normalizers.js`에 `normalizeAnalysisResult()` 추가
- `mockResult`를 `sample-data/expected-results/analyze-success.json`과 한 출처로 맞추는 구조 검토
- fetch timeout 또는 AbortController 적용

## 통합 배포 QA

확인한 것:

- Frontend production build 성공
- API base URL 환경변수 구조 존재
- `frontend/.env.example` 제공
- `infra/DEPLOYMENT.md`에 `ap-northeast-2`, AWS SAM, CORS 기준 문서화
- RAG to Backend handoff 문서에 실제 S3 evidence bucket 정리

부족한 점:

- 실제 API Gateway URL로 통합 호출 검증 전
- CORS가 실제 API Gateway에서 열렸는지 확인 전
- S3 static hosting 또는 CloudFront 배포 검증 전
- Backend/Infra 실제 SAM template 구현 여부는 확인되지 않음
- 배포 후 smoke test 절차가 자동화되어 있지 않음

필수 통합 테스트:

```bash
VITE_API_BASE_URL=https://<api-id>.execute-api.ap-northeast-2.amazonaws.com
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

리스크:

- 자동 테스트가 없음
- API 실패 catch가 오류를 삼키고 fallback만 표시함
- `analysis.summary.totalClaims`처럼 중첩 필드에 직접 접근하는 부분은 응답 누락 시 오류 가능
- `Math.round(claim.confidence * 100)`은 confidence가 없거나 문자열이면 잘못 표시될 수 있음
- 접근성 관점에서 로딩 상태, 오류 상태, 결과 갱신 알림이 충분하지 않음

권장 테스트:

- `npm run build`
- JSON schema 검증
- React Testing Library로 다음 테스트 추가:
  - fallback 결과 렌더링
  - label 4종 색상 class 적용
  - `text` 필드 렌더링
  - `claimText` fallback 렌더링
  - sources가 빈 배열일 때 오류 없음
  - source가 `url` 대신 `uri`를 내려줘도 표시됨
  - API 실패 시 fallback 적용

## 발견 사항

### High

없음. 현재 build가 통과하고, 데모 기준 핵심 화면은 동작 가능한 상태입니다.

### Medium

1. 실제 Backend 통합 검증 미완료

현재는 build와 mock/fallback 기준 검증입니다. 실제 API Gateway 또는 local backend와 연결해 `POST /analyze`, `GET /analyses/{analysisId}`가 같은 schema로 동작하는지 확인해야 합니다.

2. API 오류 원인 확인 어려움

요구사항상 fallback 결과를 특별 취급하지 않는 것은 맞지만, 개발/QA 중에는 실패 원인을 추적할 방법이 필요합니다. 화면에는 노출하지 않더라도 `console.error` 또는 dev-only 로그가 필요합니다.

3. 응답 방어 로직 부족

`summary`나 `claims`가 누락되면 화면이 깨질 수 있습니다. Backend가 안정화되기 전까지는 normalize 단계가 필요합니다.

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

2. Backend local 또는 API Gateway URL을 받아 `.env.local` 설정 후 통합 테스트

```env
VITE_API_BASE_URL=http://localhost:8000
```

3. `normalizeAnalysisResult()` 추가

목표:

- summary 기본값 처리
- claims 빈 배열 처리
- confidence 기본값 처리
- sources 빈 배열 처리
- `text`/`claimText` 호환 처리 중앙화

4. 최소 테스트 추가

우선순위:

- schema 렌더링 테스트
- fallback 렌더링 테스트
- API 실패 테스트

5. 배포 전 smoke test 문서화

필수 확인:

- S3/CloudFront 또는 S3 static hosting에서 화면 로드
- API Gateway CORS 정상
- `POST /analyze` 정상
- `GET /analyses/{analysisId}` 정상
- 4개 label 색상 표시

## 현재 부족한 것 한 줄 정리

가장 부족한 부분은 실제 Backend와의 통합 검증, 자동화 테스트, 응답 schema 방어 로직입니다. 발표 데모는 가능한 상태지만, 평가에서 안정성과 완성도를 높이려면 이 세 가지를 먼저 보강해야 합니다.
