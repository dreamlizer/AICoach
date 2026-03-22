
import { NextRequest, NextResponse } from "next/server";
import { FOUR_D_GENERATOR_PROMPT, FOUR_D_REPORT_PROMPT } from "@/lib/four_d_prompts";
import { 
  MODEL_ID_DOUBAO_LITE, 
  MODEL_ID_DOUBAO_PRO, 
  MODEL_ID_DEEPSEEK_CHAT,
  MODEL_ID_DEEPSEEK_REASONER,
  ModelProvider
} from "@/lib/stage_settings";
import { createAssessmentStream, createSseResponse } from "@/app/api/assessment/shared";

// Define response types
type QuestionOption = {
  label: string;
  text: string;
  color: string;
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
      // Phase 1: User Profile -> Generate 8 Questions
      const { userProfile } = payload;
      console.log(`[4D] Generating questions for role: ${userProfile.role} using ${modelProvider}`);
      
      const userContext = `
      User Profile:
      - Role/Position: ${userProfile.role}
      - Level/Seniority: ${userProfile.level}
      - Gender: ${userProfile.gender}
      - Industry/Background: ${userProfile.background || "General"}
      `;

      const messages = [
        { role: "system", content: FOUR_D_GENERATOR_PROMPT },
        { role: "user", content: `Please generate 8 4D Leadership assessment questions for this user. 
IMPORTANT: Make the scenarios DETAILED and RICH (approx. 80-120 words each). They should describe a complex, realistic workplace crisis or decision point.
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
      console.log(`[4D] Generating report for user... using ${modelProvider}`);

      // Construct a readable transcript of Q&A for the model
      // answers is a map of questionId -> selectedOptionColor (e.g. "Green")
      let transcript = `User Profile: ${JSON.stringify(userProfile)}\n\nAssessment Results (8 Questions):\n`;
      
      // Calculate color stats for the prompt context
      const stats = { Green: 0, Yellow: 0, Blue: 0, Orange: 0 };
      
      questions.forEach((q: Question) => {
        let selectedColor = answers[q.id]; // "Green", "Orange", etc.
        
        // Normalize color to title case to match stats keys
        if (selectedColor) {
            const lower = selectedColor.toLowerCase().trim();
            if (lower === 'green') selectedColor = 'Green';
            else if (lower === 'yellow') selectedColor = 'Yellow';
            else if (lower === 'blue') selectedColor = 'Blue';
            else if (lower === 'orange') selectedColor = 'Orange';
        }

        // Find the full option text (try matching by normalized color if possible, or label)
        const selectedOption = q.options.find(o => o.color === selectedColor || o.color?.toLowerCase() === selectedColor?.toLowerCase());
        
        if (selectedColor && stats.hasOwnProperty(selectedColor)) {
            // @ts-ignore
            stats[selectedColor]++;
        }

        transcript += `Q${q.id}: ${q.scenario}\nChoice: ${selectedOption?.text || "Unknown"} (Color: ${selectedColor})\n\n`;
      });
      
      // Explicitly prepend stats to ensure the model sees them
      const statsStr = JSON.stringify(stats);
      console.log(`[4D] Calculated Stats for Report: ${statsStr}`);
      transcript += `\n[CRITICAL DATA]\nSummary Stats: ${statsStr}\n(Please base the report STRICTLY on these stats.)`;

      const messages = [
        { role: "system", content: FOUR_D_REPORT_PROMPT },
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
    console.error("4D API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
