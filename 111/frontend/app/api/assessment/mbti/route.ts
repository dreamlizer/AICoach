
import { NextRequest, NextResponse } from "next/server";
import { MBTI_GENERATOR_PROMPT, MBTI_REPORT_PROMPT } from "@/lib/mbti_prompts";
import { 
  MODEL_ID_DOUBAO_LITE, 
  MODEL_ID_DOUBAO_PRO, 
  MODEL_ID_DEEPSEEK_CHAT,
  MODEL_ID_DEEPSEEK_REASONER,
  ModelProvider
} from "@/lib/stage_settings";
import { createAssessmentStream, createSseResponse } from "@/app/api/assessment/shared";

// Define response types
type Question = {
  id: number;
  scenario: string;
  optionA: { text: string; dimension: string; value: string };
  optionB: { text: string; dimension: string; value: string };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const modelProvider = (payload.modelProvider || "doubao") as ModelProvider;

    if (action === "generate_questions") {
      // Phase 1: User Profile -> Generate 16 Questions
      const { userProfile } = payload;
      console.log(`[MBTI] Generating questions for role: ${userProfile.role} using ${modelProvider}`);
      
      const userContext = `
      User Profile:
      - Role/Position: ${userProfile.role}
      - Level/Seniority: ${userProfile.level}
      - Gender: ${userProfile.gender}
      - Industry/Background: ${userProfile.background || "General"}
      `;

      const messages = [
        { role: "system", content: MBTI_GENERATOR_PROMPT },
        { role: "user", content: `Please generate 16 MBTI assessment questions for this user. 
IMPORTANT: Make the scenarios DETAILED and RICH (approx. 80-120 words each). They should describe a complex, realistic workplace situation that forces a trade-off.
${userContext}` }
      ];

      const stream = await createAssessmentStream({
        provider: modelProvider,
        messages,
        doubaoModel: MODEL_ID_DOUBAO_LITE,
        deepseekModel: MODEL_ID_DEEPSEEK_CHAT,
        reasoningEffort: "minimal"
      });
      return createSseResponse(stream);

    } else if (action === "generate_report") {
      // Phase 2: Answers -> Deep Report
      const { userProfile, questions, answers } = payload;
      console.log(`[MBTI] Generating report for user... using ${modelProvider}`);

      // Construct a readable transcript of Q&A for the model
      let transcript = `User Profile: ${JSON.stringify(userProfile)}\n\nAssessment Results:\n`;
      questions.forEach((q: Question) => {
        const answerVal = answers[q.id];
        const selectedOption = answerVal === q.optionA.value ? q.optionA : q.optionB;
        transcript += `Q${q.id}: ${q.scenario}\nChoice: ${selectedOption.text} (${selectedOption.dimension})\n\n`;
      });

      const messages = [
        { role: "system", content: MBTI_REPORT_PROMPT },
        { role: "user", content: transcript }
      ];

      const stream = await createAssessmentStream({
        provider: modelProvider,
        messages,
        doubaoModel: MODEL_ID_DOUBAO_PRO,
        deepseekModel: MODEL_ID_DEEPSEEK_REASONER,
        reasoningEffort: "high"
      });
      return createSseResponse(stream);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("MBTI API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
