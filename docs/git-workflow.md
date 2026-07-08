# Git Workflow

## Branches

| 역할 | 브랜치 |
| --- | --- |
| RAG & Bedrock | `feature/rag-bedrock` |
| Backend & AWS API | `feature/backend-api` |
| Frontend & UX | `feature/frontend-ui` |
| Data, Demo & Presentation | `feature/demo-docs` |

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
