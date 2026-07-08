# Git Workflow

## Branches

| 역할 | 브랜치 |
| --- | --- |
| RAG & Bedrock | `feature/rag-bedrock` |
| Backend & AWS API | `feature/backend-api` |
| Frontend & UX | `feature/frontend-ui` |
| Data, Demo & Presentation | `feature/demo-docs` |

## Current Integration Status

- `origin/main`: Backend/RAG/API deployment baseline and React frontend MVP.
- `origin/feature/frontend-ui`: React MVP source branch; merged into `origin/main`.
- `feature/demo-docs`: Presentation/demo notes only; do not carry backend/RAG/infra deletions.

## Common Flow

```bash
git checkout main
git pull origin main
git checkout feature/your-branch
git merge main
git status
```

작업 후:

```bash
git add <changed-files>
git commit -m "<type>: <summary>"
git push origin feature/your-branch
```

## Commit Message Examples

- `docs: add demo input and evidence dataset`
- `docs: add presentation script and Q&A`
- `feat: add analyze api with mock response`
- `feat: render claim labels and evidence detail panel`
- `fix: resolve merge conflicts`

## Ownership Rules

- `frontend/`: Frontend & UX 담당
- `backend/`, `infra/`: Backend & AWS API 담당
- `sample-data/`: Data, Demo & Presentation + RAG 담당
- `docs/`: Data, Demo & Presentation 담당 중심, 공통 문서는 협의 후 수정

다른 담당 폴더를 직접 수정해야 하면 먼저 팀 채팅에 이유를 남깁니다.

`feature/demo-docs`를 갱신할 때는 충돌 파일 중 backend, RAG, infra 구현 파일은 `origin/main` 기준을 유지하고, 발표 전용 문서만 추가 diff로 남깁니다.
