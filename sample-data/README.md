# Sample Data

데모와 테스트에 사용할 문서를 관리하는 영역입니다.

## Planned Contents

- `source-docs/`: Knowledge Base에 넣을 공식 근거 문서
- `demo-inputs/`: 사용자가 업로드할 샘플 PDF/텍스트
- `expected-results/`: 예상 분석 결과 JSON
- `evidence_docs.json`: Knowledge Bases 연결이 지연될 때 사용할 fallback 근거 데이터

## Current RAG MVP Files

- `evidence_docs.json`: AWS 공식문서 URL, 키워드, 요약, evidence snippet
- `demo-inputs/sample_wrong_aws_deck.md`: 일부러 틀린 AWS/AI 발표자료 샘플
- `expected-results/rag_judgment_sample.json`: Backend/Frontend 연결용 예상 응답 예시

## Demo Input Guidelines

데모 문서에는 다음 claim 유형을 섞습니다.

- 근거 있음
- 공식 근거와 충돌
- 근거 부족
- 과장 표현

실제 AWS 계정 키, 개인정보, 교육 계정 정보는 포함하지 않습니다.

## RAG Fallback Rule

Bedrock Knowledge Bases 연결 또는 인덱싱이 지연되면 `evidence_docs.json`을 사용해 간단 키워드 검색 기반 RAG로 데모를 진행합니다.
