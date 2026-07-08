# Sample Data

데모와 fallback RAG에 사용할 문서를 관리하는 영역입니다.

## Files

- `evidence_docs.json`: Bedrock Knowledge Bases가 지연될 때 사용할 간단 RAG 근거 데이터
- `sample_wrong_aws_deck.md`: 발표 시연용 AWS/AI 오류 포함 입력 자료
- `expected_analysis.json`: 프론트/백엔드 mock과 리허설에 사용할 예상 분석 결과

## Ownership

- Primary: Data, Demo & Presentation
- Shared with: RAG & Bedrock

## Guidelines

- 실제 AWS 계정 키, 개인정보, 교육 계정 정보는 포함하지 않습니다.
- 샘플 입력에는 `근거 있음`, `공식 근거와 충돌`, `근거 부족`, `과장 표현` 유형을 섞습니다.
- 기본 라벨 분포는 `근거 있음 2개`, `공식 근거와 충돌 3개`, `근거 부족 1개`, `과장 표현 2개`입니다.
- 공식 근거는 가능하면 AWS 공식 문서 URL을 함께 기록합니다.
