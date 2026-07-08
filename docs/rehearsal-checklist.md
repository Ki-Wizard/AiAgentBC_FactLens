# Rehearsal Checklist

## Before Demo

- [ ] 현재 브랜치가 발표용 브랜치인지 확인합니다.
- [ ] `sample-data/sample_wrong_aws_deck.md`를 열어 입력 내용을 확인합니다.
- [ ] `sample-data/expected-results/analyze-success.json`을 열어 mock 결과를 확인합니다.
- [ ] `sample-data/expected-results/bedrock-fallback.json`을 열어 fallback 결과를 확인합니다.
- [ ] mock JSON의 claim이 `claimId`, `text`, `label`, `confidence`, `reason`, `correctedText`, `sources`, `evidence`를 포함하는지 확인합니다.
- [ ] 결과 화면에서 최소 3가지 색상 라벨이 보이는지 확인합니다.
- [ ] Lambda timeout claim과 Guardrails 100% claim을 설명할 수 있는지 확인합니다.
- [ ] `feature/frontend-ui`가 최종 브랜치에 병합됐는지 확인하고, 미병합이면 별도 브랜치 화면 또는 JSON 데모로 설명합니다.
- [ ] Bedrock Knowledge Bases와 Bedrock 모델 호출은 완료 여부를 확인한 뒤, 미완료면 확장 항목으로만 말합니다.

## Failure Fallback Lines

### Bedrock 실패

"현재 MVP에서는 Bedrock 모델 호출 대신 같은 응답 스키마의 fallback judge 결과로 판정 화면을 보여드립니다. 이후 확장 단계에서는 Bedrock 모델이 이 판정 JSON을 생성하도록 연결할 수 있습니다."

### Knowledge Bases 지연

"Knowledge Bases 구성 시간이 지연될 수 있어서, MVP에서는 같은 근거 문서를 `evidence_docs.json`에 넣어 fallback RAG로 동작하게 했습니다. 확장 단계에서는 S3 근거 문서를 Knowledge Bases data source로 연결하고 sync job을 실행합니다."

### API 연결 실패

"API 연결이 실패해도 프론트 결과 화면은 `sample-data/expected-results/analyze-success.json`으로 시연 가능합니다. 이 JSON은 백엔드와 프론트가 합의한 동일한 응답 스키마입니다."

### PDF 파싱 실패

"PDF 업로드는 선택 기능이고, MVP 필수 입력은 텍스트입니다. 지금은 발표자료 텍스트를 직접 입력해 claim 검증 흐름을 보여드리겠습니다."

## After Demo

- [ ] 구현된 AWS 서비스와 발표자료의 아키텍처가 일치하는지 확인합니다.
- [ ] 실제 사용하지 못한 AWS 서비스는 fallback 또는 확장 항목으로 구분해 말합니다.
- [ ] README 실행 방법은 최종 브랜치 병합 상태에 맞게 업데이트합니다.
