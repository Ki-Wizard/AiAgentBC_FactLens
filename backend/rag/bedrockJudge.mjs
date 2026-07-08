import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const MODEL_ID = "global.anthropic.claude-haiku-4-5-20251001-v1:0";
const REGION = process.env.AWS_REGION ?? "ap-northeast-2";

const client = new BedrockRuntimeClient({ region: REGION });

function buildPrompt(claim, evidenceTexts) {
  return `당신은 팩트체크 판정관입니다. 아래 claim과 근거를 비교하여 JSON으로 판정하세요.

## Claim
"${claim}"

## 검색된 근거
${evidenceTexts}

## 판정 기준
- "근거 있음": 근거가 claim을 직접 또는 간접적으로 지지함
- "공식 근거와 충돌": 근거가 claim과 모순됨
- "근거 부족": 근거에 관련 정보가 전혀 없음
- "과장 표현": claim이 절대적 표현을 사용했지만 근거는 제한적임

## 중요
- 근거에서 claim의 주제에 대한 정보를 유추할 수 있으면 "근거 있음" 또는 "공식 근거와 충돌"로 판정하세요
- 예: 순천대학교 문서가 있으면 순천이 전남에 있다는 것을 유추 가능 → 근거 있음

반드시 아래 JSON 형식만 출력하세요:
{"label":"판정결과","confidence":0.0~1.0,"reason":"판정 이유","correctedText":"수정 제안 또는 수정 불필요"}`;
}

export async function bedrockJudgeClaim(claim, evidence) {
  const claimText = claim.text ?? "";
  const evidenceTexts = evidence
    .map((e, i) => `[${i + 1}] ${e.title ?? ""}: ${e.evidenceText ?? ""}`)
    .join("\n\n");

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 512,
    messages: [{ role: "user", content: buildPrompt(claimText, evidenceTexts) }],
  });

  try {
    const command = new InvokeModelCommand({ modelId: MODEL_ID, body });
    const response = await client.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.body));
    const text = payload.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    return {
      claimId: claim.claimId,
      text: claimText,
      label: result.label,
      confidence: result.confidence ?? 0.75,
      reason: result.reason ?? "",
      correctedText: result.correctedText ?? "",
      sources: evidence.slice(0, 3).map((e) => ({ title: e.title, url: e.url })),
    };
  } catch (error) {
    console.error(`[bedrockJudge] ${error.name}: ${error.message}`);
    return null;
  }
}
