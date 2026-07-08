# Sample Data

데모와 fallback RAG에 사용할 문서를 관리하는 영역입니다.

## Files

- `evidence_docs.json`: Knowledge Bases 연결이 지연될 때 사용할 fallback 근거 데이터
- `sample_wrong_aws_deck.md`: 백엔드 smoke와 API 계약 검증용 AWS/AI 오류 포함 입력 자료
- `source-docs/`: Knowledge Base에 넣을 공식 근거 문서
- `demo-inputs/`: 사용자가 업로드할 샘플 PDF/텍스트
- `expected-results/`: 예상 분석 결과 JSON

## Current RAG MVP Files

- `evidence_docs.json`: AWS 공식문서 URL, 키워드, 요약, evidence snippet
- `demo-inputs/sample_wrong_aws_deck.md`: 일부러 틀린 AWS/AI 발표자료 샘플
- `expected-results/rag_judgment_sample.json`: Backend/Frontend 연결용 예상 응답 예시
- `expected-results/analyze-success.json`: 백엔드 `POST /analyze` 성공 fixture
- `expected-results/bedrock-fallback.json`: Bedrock 또는 Knowledge Base 지연 시 fallback fixture

## Ownership

- Primary: Data, Demo & Presentation
- Shared with: RAG & Bedrock

## Guidelines

- 실제 AWS 계정 키, 개인정보, 교육 계정 정보는 포함하지 않습니다.
- 샘플 입력에는 `근거 있음`, `공식 근거와 충돌`, `근거 부족`, `과장 표현` 유형을 섞습니다.
- 공식 근거는 가능하면 AWS 공식 문서 URL을 함께 기록합니다.

## RAG Fallback Rule

Bedrock Knowledge Bases 연결 또는 인덱싱이 지연되면 `evidence_docs.json`을 사용해 간단 키워드 검색 기반 RAG로 데모를 진행합니다.
