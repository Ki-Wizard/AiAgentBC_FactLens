# RAG & Bedrock Backend MVP

이 폴더는 RAG & Bedrock 담당자가 Backend 담당에게 넘길 수 있는 최소 실행 단위다.

## Files

- `retrieveEvidence.mjs`: `sample-data/evidence_docs.json` 기반 fallback 근거 검색
- `fallbackJudge.mjs`: Bedrock/Knowledge Bases가 지연될 때 사용할 deterministic 판정
- `lambdaHandler.mjs`: Lambda handler 형태의 분석 엔트리포인트

## AWS Region

프로젝트 리전은 서울이다.

```bash
aws configure set region ap-northeast-2
aws configure get region
```

## Local Smoke Test

```bash
node --input-type=module -e "import { analyzeDocument } from './backend/rag/lambdaHandler.mjs'; const input={ documentText: 'AWS Lambda 함수는 최대 5분까지만 실행할 수 있다.\\nAmazon Bedrock은 여러 foundation model을 API로 사용할 수 있게 해준다.\\nRAG를 사용하면 LLM의 환각이 완전히 사라진다.' }; console.log(JSON.stringify(await analyzeDocument(input), null, 2));"
```

## Backend Contract

Input:

```json
{
  "documentText": "AWS/AI 발표자료 전체 텍스트",
  "maxClaims": 10
}
```

Output:

```json
{
  "analysisId": "analysis-...",
  "status": "COMPLETED",
  "summary": {
    "totalClaims": 3,
    "supported": 1,
    "conflicted": 1,
    "insufficient": 0,
    "exaggerated": 1
  },
  "claims": []
}
```

## AWS Implementation Path

1. Backend 담당이 `lambdaHandler.mjs`를 Lambda handler로 연결한다.
2. Bedrock Runtime 권한이 준비되면 `fallbackJudgeClaim` 호출부를 Bedrock Judge 호출로 교체한다.
3. Bedrock Knowledge Bases가 준비되면 `retrieveEvidence` 호출부를 Knowledge Base retrieve API 호출로 교체한다.
4. 그래도 fallback은 유지해 데모 실패를 막는다.
