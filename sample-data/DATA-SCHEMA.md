# Sample Data Structure

## 파일 구조 및 용도

### `demo-inputs/`
사용자 입력 예제 문서

- **test-claims.txt**: 4가지 판정 유형을 포함한 테스트 문장
  - 근거 있음: Lambda 실행 시간 관련 주장
  - 공식 근거와 충돌: Bedrock 데이터 학습 관련 주장
  - 근거 부족: S3 SLA 관련 주장
  - 과장 표현: 절대적 보장 관련 주장

### `expected-results/`
Backend API 응답 스키마 예제

- **analyze-success.json**: `/analyze` endpoint의 정상 응답 예제
  - Response Schema:
    ```json
    {
      "analysisId": "string",
      "status": "COMPLETED",
      "summary": {
        "totalClaims": number,
        "supported": number,
        "conflicted": number,
        "insufficient": number,
        "exaggerated": number
      },
      "claims": [
        {
          "claimId": "string",
          "text": "string",
          "label": "근거 있음|공식 근거와 충돌|근거 부족|과장 표현",
          "confidence": 0.0-1.0,
          "reason": "string",
          "correctedText": "string",
          "sources": [
            {
              "title": "string",
              "url": "string"
            }
          ],
          "evidence": []
        }
      ]
    }
    ```

### `source-docs/`
Knowledge Base에 포함될 근거 문서 (추후 구성)

- AWS 공식 문서 요약본
- Bedrock 정책 및 한계
- Lambda 제약사항
- S3 내구성 및 SLA

## 스키마 규칙

1. **label**: 정확히 4가지 중 하나
   - "근거 있음" → Green (#dff8eb)
   - "공식 근거와 충돌" → Red (#fee4e2)
   - "근거 부족" → Gray (#eaecf0)
   - "과장 표현" → Yellow (#fef0c7)

2. **confidence**: 0.0 ~ 1.0 사이의 float (소수점 2자리)

3. **sources**: title과 url은 필수, 최소 1개 필요

4. **text**: 검증하는 실제 텍스트이며 필수입니다.

5. **claimId**: 선택 필드입니다. Backend/RAG가 내려주면 Frontend가 목록 key로 사용할 수 있지만, 없어도 렌더링됩니다.

6. **evidence**: 선택 필드입니다. RAG 내부 근거 상세 배열이며, UI는 우선 `sources[].title`, `sources[].url`을 표시합니다.

## 보안 및 규칙

- ❌ 실제 AWS 액세스 키, 시크릿 키 포함 금지
- ❌ 교육 계정 정보 및 개인정보 포함 금지
- ✅ Mock/Sample 성격의 데이터만 포함
- ✅ 공개된 AWS 문서 링크만 사용
