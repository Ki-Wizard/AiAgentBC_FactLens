# Demo Scenario

## Demo Goal

틀린 AWS/AI 발표자료 텍스트를 입력했을 때 FactLens가 공식 근거와 충돌하는 claim을 찾아내는 장면을 보여줍니다.

## Demo Input

- 입력 파일: `sample-data/sample_wrong_aws_deck.md`
- 예상 결과: `sample-data/expected-results/analyze-success.json`
- fallback 근거: `sample-data/evidence_docs.json`

데모 입력은 아래 라벨 분포를 목표로 합니다.

| 라벨 | 개수 | 발표 포인트 |
| --- | ---: | --- |
| 근거 있음 | 2 | FactLens가 맞는 문장은 그대로 통과시킨다는 점 |
| 공식 근거와 충돌 | 3 | 공식 문서와 다른 설명을 빨간색으로 잡는 핵심 장면 |
| 근거 부족 | 1 | 근거가 없을 때 억지로 맞다고 하지 않는 장면 |
| 과장 표현 | 2 | 100% 보장 같은 표현을 노란색으로 잡는 장면 |

## Demo Flow

1. FactLens 화면에 데모 발표자료 텍스트를 입력합니다.
2. 분석 버튼을 누르고 진행 상태를 보여줍니다.
3. 결과 화면에서 summary 카운트를 먼저 확인합니다.
4. 빨간 claim인 Lambda timeout 문장을 선택합니다.
5. 공식 근거 URL과 수정 제안 문장을 보여줍니다.
6. 노란 claim인 Guardrails 100% 차단 문장을 선택합니다.
7. FactLens가 "오류 단정"뿐 아니라 "과장 표현"도 잡는다고 설명합니다.
8. 근거 부족 claim을 보여주며, 근거가 없을 때 억지 답변하지 않는다는 점을 설명합니다.

## Backup Plan

실시간 시연이 실패할 경우를 대비해 다음 자료를 사용합니다.

- `sample-data/expected-results/analyze-success.json`
- `sample-data/expected-results/bedrock-fallback.json`
- 결과 화면 스크린샷
- AWS 아키텍처 슬라이드
- 실패 상황별 대체 멘트: `docs/rehearsal-checklist.md`
