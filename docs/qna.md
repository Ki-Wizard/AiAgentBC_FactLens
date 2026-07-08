# Expected Q&A

## Q1. 일반 RAG 챗봇과 뭐가 다른가요?

일반 RAG 챗봇은 사용자의 질문에 답하는 형태입니다. FactLens는 사용자가 올린 문서 안의 claim을 먼저 추출하고, 각 claim을 공식 근거와 비교해 라벨링합니다. 그래서 결과가 "답변"이 아니라 "문서 검증 리포트"에 가깝습니다.

## Q2. 왜 AWS/AI 발표자료로 도메인을 제한했나요?

팀 프로젝트 시간 안에 정확한 검증을 보여주려면 근거 문서 범위를 좁혀야 합니다. AWS/AI 도메인은 수업 내용과 맞고, 공식 문서 URL을 근거로 제시하기 좋습니다.

## Q3. Bedrock Knowledge Bases가 안 되면 어떻게 하나요?

`sample-data/evidence_docs.json` 기반 fallback RAG로 대체합니다. 발표에서는 Knowledge Bases를 확장 아키텍처로 설명하고, 현재 MVP에서는 같은 evidence 구조로 검색과 판정 흐름을 유지합니다.

## Q4. Guardrails가 모든 오류를 막아주나요?

아닙니다. Guardrails는 안전장치로 사용할 수 있지만 모든 잘못된 답변이나 환각을 100% 차단한다고 단정하면 과장입니다. 그래서 데모 입력에도 이 문장을 과장 표현 예시로 넣었습니다.

## Q5. 실시간 웹 검색은 어떻게 쓰나요?

기본 데모는 재현성을 위해 fallback evidence를 사용합니다. 최신 구현에는 `searchMode: "internet"` 옵션이 있으며, 검색 API 키가 Lambda에 설정된 경우 `docs.aws.amazon.com`, `aws.amazon.com`, `repost.aws` 같은 허용 도메인의 공식 출처 검색을 먼저 시도합니다. 키가 없거나 검색 결과가 없으면 fallback evidence로 돌아갑니다.

## Q6. PDF 업로드는 왜 선택 기능인가요?

핵심 기능은 claim 추출, 근거 검색, 판정입니다. PDF 파싱은 시간이 부족하면 데모 안정성을 떨어뜨릴 수 있으므로 텍스트 입력을 필수 MVP로 두고, PDF는 시간이 되면 추가합니다.

## Q7. FactLens가 틀릴 수도 있나요?

가능합니다. FactLens는 자동 검증을 보조하는 도구이고, 최종 판단은 출처와 함께 사람이 확인해야 합니다. 그래서 모든 판정에는 reason, correctedText, sources를 함께 표시합니다.
