import { NextRequest, NextResponse } from "next/server";
import { PDP_GENERATOR_PROMPT, PDP_REPORT_PROMPT } from "@/lib/pdp_prompts";
import { 
  MODEL_ID_DOUBAO_LITE, 
  MODEL_ID_DOUBAO_PRO, 
  MODEL_ID_DEEPSEEK_CHAT,
  MODEL_ID_DEEPSEEK_REASONER,
  ModelProvider
} from "@/lib/stage_settings";
import { createAssessmentStream, createSseResponse } from "@/app/api/assessment/shared";

type QuestionOption = {
  label: string;
  text: string;
  value: string;
};

type Question = {
  id: number;
  title: string;
  scenario: string;
  options: QuestionOption[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const modelProvider = (payload.modelProvider || "doubao") as ModelProvider;

    if (action === "generate_questions") {
      const { userProfile, selectedTags } = payload;
      const userContext = `
      User Profile:
      - Role/Position: ${userProfile?.role || "Unknown"}
      - Level/Seniority: ${userProfile?.level || "Unknown"}
      - Gender: ${userProfile?.gender || "Unknown"}
      - Industry/Background: ${userProfile?.background || "General"}
      - Self-Tags: ${JSON.stringify(selectedTags || [])}
      `;

      const messages = [
        { role: "system", content: PDP_GENERATOR_PROMPT },
        { role: "user", content: `Please generate 15 PDP assessment questions for this user.
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
    }

    if (action === "generate_report") {
      const { userProfile, selectedTags, questions, answers, stats, dominant, roleDominant, coreDominant } = payload;
      const summary = {
        userProfile,
        selectedTags,
        questions,
        answers,
        stats,
        dominant,
        roleDominant,
        coreDominant
      };

      const messages = [
        { role: "system", content: PDP_REPORT_PROMPT },
        { role: "user", content: JSON.stringify(summary) }
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
    console.error("PDP API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
