# Rehearsal Checklist

## Before Demo

- [ ] 현재 브랜치가 발표용 브랜치인지 확인합니다.
- [ ] `sample-data/sample_wrong_aws_deck.md`를 열어 입력 내용을 확인합니다.
- [ ] `sample-data/expected_analysis.json`을 열어 mock 결과를 확인합니다.
- [ ] 결과 화면에서 최소 3가지 색상 라벨이 보이는지 확인합니다.
- [ ] Lambda timeout claim과 Guardrails 100% claim을 설명할 수 있는지 확인합니다.

## Failure Fallback Lines

### Bedrock 실패

"현재 데모 환경에서는 Bedrock 호출이 불안정해서, 같은 응답 스키마의 mock 결과로 판정 화면을 보여드리겠습니다. 실제 아키텍처에서는 Bedrock 모델이 이 JSON 판정을 생성합니다."

### Knowledge Bases 지연

"Knowledge Bases 구성 시간이 지연될 수 있어서, MVP에서는 같은 근거 문서를 `evidence_docs.json`에 넣어 fallback RAG로 동작하게 했습니다. 확장 단계에서는 이 문서를 S3에 올리고 Knowledge Bases로 동기화합니다."

### API 연결 실패

"API 연결이 실패해도 프론트 결과 화면은 `expected_analysis.json`으로 시연 가능합니다. 이 JSON은 백엔드와 프론트가 합의한 동일한 응답 스키마입니다."

### PDF 파싱 실패

"PDF 업로드는 선택 기능이고, MVP 필수 입력은 텍스트입니다. 지금은 발표자료 텍스트를 직접 입력해 claim 검증 흐름을 보여드리겠습니다."

## After Demo

- [ ] 구현된 AWS 서비스와 발표자료의 아키텍처가 일치하는지 확인합니다.
- [ ] 실제 사용하지 못한 AWS 서비스는 fallback 또는 확장 항목으로 구분해 말합니다.
- [ ] README 실행 방법은 백엔드/프론트 구현 완료 후 최종 업데이트합니다.
