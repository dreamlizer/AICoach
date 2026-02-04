import OpenAI from "openai";
import { 
  STAGE1_PROMPT,
  STAGE3_PROMPT,
  STAGE4_PROMPT,
  PipelineConfig
} from "./stage_settings";
import { getMessagesFromDb } from "./db";
import { cleanJsonBlock, parseJsonResult } from "./utils";

import { Stage1Analysis, UserProfile } from "./types";

// Helper function to call AI models (Doubao or DeepSeek)
async function callAIModel(
  modelType: string, 
  apiKey: string, 
  prompt: string, 
  modelName: string,
  errorMessage: string = "AI Service Error",
  reasoningEffort: "low" | "medium" | "high" | "minimal" | null = null
): Promise<string> {
  if (!apiKey) throw new Error(`${modelType} API Key is missing`);

  let baseURL = "https://api.deepseek.com"; // Default to DeepSeek

  if (modelType === "doubao") {
    baseURL = "https://ark.cn-beijing.volces.com/api/v3";
  }

  const openai = new OpenAI({
    baseURL: baseURL,
    apiKey: apiKey,
  });

  const requestOptions: any = {
    messages: [{ role: "system", content: prompt }], // Doubao/DeepSeek support system role
    model: modelName,
  };

  // Add reasoning_effort if specified (For Doubao or O1 models)
  if (reasoningEffort) {
    requestOptions.reasoning_effort = reasoningEffort;
  }

  const completion = await openai.chat.completions.create(requestOptions);
  return completion.choices[0].message.content || "";
}

// Stage 2: Memory Retrieval
export function getRecentHistory(conversationId: string): string {
  try {
    // Reverted to Local History Mode: Fetch last 20 messages from CURRENT conversation only
    // User requested to disable global cross-conversation context for now.
    const messages = getMessagesFromDb(conversationId, 20); 
    
    if (messages.length === 0) return "";
    
    // Filter only text messages (user and ai replies), exclude 'analysis' or 'thinking'
    // Handle null/undefined kind for legacy messages
    const textMessages = messages.filter(m => !m.kind || m.kind === 'text' || m.role === 'user');
    
    // Take the last 10 turns
    const recentMessages = textMessages.slice(-10);

    return recentMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join("\n");
  } catch (error) {
    console.error("Failed to retrieve history:", error);
    return "";
  }
}

// Stage 3: Strategy Generation
export async function stage3Think(
  userInput: string, 
  analysis: Stage1Analysis, 
  history: string,
  config: PipelineConfig,
  toolContext?: string
): Promise<string | null> {
  // Pure Tool Mode: If toolContext is present, we bypass the generic STAGE3_PROMPT.
  // We want the strategy to be purely based on the Tool's specific methodology (e.g., GROW).
  
  let prompt = "";
  if (toolContext) {
    prompt = `
[Role & Methodology]
${toolContext}

[Current Context]
User Input: "${userInput}"
History Summary:
${history || "No history"}

[Task]
Based strictly on the methodology above (e.g., GROW), analyze the current conversation state.
Determine the immediate next step or question.
Output your internal reasoning/strategy (e.g., "User is at G stage, need to clarify goal").
Do NOT output the final reply yet. Only the strategy.
**IMPORTANT**: Please output your reasoning in CHINESE (简体中文).
    `.trim();
  } else {
    prompt = STAGE3_PROMPT
      .replace("{user_input}", userInput)
      .replace("{intent_json}", JSON.stringify(analysis))
      .replace("{history_context}", history || "无历史记录")
      .replace("{user_profile}", "暂无画像数据");
  }

  try {
    const { modelProvider, apiKey, modelName, reasoningEffort } = config.stage3;
    const result = await callAIModel(modelProvider, apiKey, prompt, modelName, "策略生成失败", reasoningEffort);
    return result || "策略生成失败";
  } catch (error) {
    console.error("Stage 3 Thinking Error:", error);
    return "策略生成出错";
  }
}

// Stage 4: Reply Generation
export async function stage4Reply(
  stage3Strategy: string,
  config: PipelineConfig,
  overridePrompt?: string,
  toolContext?: string
): Promise<string> {
  // Pure Tool Mode: If toolContext is present, we bypass the generic STAGE4_PROMPT.
  // This avoids tone/length conflicts (e.g., GROW needs short questions, not 200-word paragraphs).

  let prompt = "";
  
  if (overridePrompt) {
    // High priority override (used for specific tasks like JSON generation)
    prompt = overridePrompt;
  } else if (toolContext) {
    // Tool Mode
    prompt = `
[Role & Methodology]
${toolContext}

[Strategy]
${stage3Strategy}

[Task]
Generate the response to the user.
- Strictly follow the tone and constraints defined in [Role & Methodology].
- Use the [Strategy] as your guide.
- Output ONLY the response text.
    `.trim();
  } else {
    // Generic Mode
    prompt = STAGE4_PROMPT.replace("{stage3_strategy}", stage3Strategy);
  }

  try {
    const { modelProvider, apiKey, modelName, reasoningEffort } = config.stage4;
    const result = await callAIModel(modelProvider, apiKey, prompt, modelName, "回复生成失败", reasoningEffort);
    return result || "回复生成失败";
  } catch (error) {
    console.error("Stage 4 Reply Error:", error);
    return "抱歉，我暂时无法生成回复。";
  }
}

// Stage 1: Intent Analysis
export async function stage1_analyze(userInput: string, config: PipelineConfig): Promise<Stage1Analysis> {
  const prompt = STAGE1_PROMPT.replace("{user_input}", userInput);

  try {
    const { modelProvider, apiKey, modelName, reasoningEffort } = config.stage1;
    const result = await callAIModel(modelProvider, apiKey, prompt, modelName, "Intent Analysis Failed", reasoningEffort);
    return parseJsonResult(result);
  } catch (error) {
    console.error("Stage 1 Analysis Error:", error);
    return {
      intent: "CHAT",
      sentiment: "Unknown",
      complexity: "LOW",
      keywords: ["Error"],
    };
  }
}

// Stage 5: User Profiling (Profile Engine)
export async function stage5Profile(
  history: string,
  config: PipelineConfig
): Promise<UserProfile | null> {
  // Stage 5 is temporarily disabled by user request.
  // Kept for interface compatibility.
  return null;
}

// Helper: Generate Conversation Title
export async function generateTitle(userMessage: string, aiReply: string, config: PipelineConfig): Promise<string> {
  const prompt = `
    Task: Generate a very short, concise title (max 10 chars) for this conversation.
    User: ${userMessage.slice(0, 200)}
    AI: ${aiReply.slice(0, 200)}
    Title (No quotes, just text):
  `.trim();

  try {
    // Use STAGE1 settings (usually faster/cheaper model) for this simple task
    const { modelProvider, apiKey, modelName, reasoningEffort } = config.stage1;
    const title = await callAIModel(modelProvider, apiKey, prompt, modelName, "New Chat", reasoningEffort);
    return title.replace(/["《》]/g, "").trim().slice(0, 15);
  } catch (e) {
    console.error("Title Generation Failed:", e);
    return "";
  }
}
