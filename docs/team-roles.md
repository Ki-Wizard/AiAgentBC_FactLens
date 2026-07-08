# Team Roles

팀원 이름이 정해지면 `Owner` 칸을 채웁니다.

| Area | Owner | Responsibilities |
| --- | --- | --- |
| RAG & Bedrock | TBD | Knowledge Base 구성, fallback RAG 규칙, claim 판정 프롬프트 |
| Backend & AWS API | TBD | API Gateway, Lambda, DynamoDB, Bedrock 호출 연결 |
| Frontend & UX | TBD | 텍스트 입력 화면, 진행 상태, 결과 리포트 UI |
| Data, Demo & Presentation | msoo | 근거 자료 수집, 데모 입력 제작, 발표자료/시연 대본 |

## Branches

| 역할 | 브랜치 |
| --- | --- |
| RAG & Bedrock | `feature/rag-bedrock` |
| Backend & AWS API | `feature/backend-api` |
| Frontend & UX | `feature/frontend-ui` |
| Data, Demo & Presentation | `feature/demo-docs` |

## Folder Ownership

| 폴더 | 담당 |
| --- | --- |
| `frontend/` | Frontend & UX |
| `backend/` | Backend & AWS API |
| `infra/` | Backend & AWS API |
| `sample-data/` | Data, Demo & Presentation + RAG |
| `docs/` | Data, Demo & Presentation |
| RAG 프롬프트 파일 | RAG & Bedrock |

## Common Rules

- 기본 브랜치: `main`
- 각자 자기 역할 브랜치에서 작업합니다.
- 다른 담당 폴더는 직접 수정하지 않는 것을 원칙으로 합니다.
- PR에는 변경 내용, 테스트 방법, 스크린샷 또는 실행 결과를 남깁니다.
