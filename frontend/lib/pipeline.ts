import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  STAGE1_MODEL,
  STAGE1_MODEL_NAME,
  STAGE1_API_KEY,
  STAGE1_PROMPT,
  STAGE3_MODEL,
  STAGE3_MODEL_NAME,
  STAGE3_API_KEY,
  STAGE3_PROMPT,
  STAGE4_MODEL,
  STAGE4_MODEL_NAME,
  STAGE4_API_KEY,
  STAGE4_PROMPT
} from "./stage_settings";
import { getMessagesFromDb } from "./db";
import { Stage1Analysis, UserProfile } from "./types";

// Helper function to call AI models (Gemini or DeepSeek)
async function callAIModel(
  modelType: string, 
  apiKey: string, 
  prompt: string, 
  modelName: string,
  errorMessage: string = "AI Service Error"
): Promise<string> {
  if (!apiKey) throw new Error(`${modelType} API Key is missing`);

  if (modelType === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else {
    // DeepSeek or other OpenAI-compatible
    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: apiKey,
    });
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: modelName,
    });
    return completion.choices[0].message.content || "";
  }
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
  history: string
): Promise<string | null> {
  // Logic Fix: Always call model, regardless of complexity.
  // The prompt handles LOW complexity or CHAT intent by generating specific simple strategies.
  
  const prompt = STAGE3_PROMPT
    .replace("{user_input}", userInput)
    .replace("{intent_json}", JSON.stringify(analysis))
    .replace("{history_context}", history || "无历史记录");

  try {
    const result = await callAIModel(STAGE3_MODEL, STAGE3_API_KEY, prompt, STAGE3_MODEL_NAME, "策略生成失败");
    return result || "策略生成失败";
  } catch (error) {
    console.error("Stage 3 Thinking Error:", error);
    return "策略生成出错";
  }
}

// Stage 4: Reply Generation
export async function stage4Reply(
  stage3Strategy: string,
  overridePrompt?: string
): Promise<string> {
  const prompt = overridePrompt || STAGE4_PROMPT.replace("{stage3_strategy}", stage3Strategy);

  try {
    const result = await callAIModel(STAGE4_MODEL, STAGE4_API_KEY, prompt, STAGE4_MODEL_NAME, "回复生成失败");
    return result || "回复生成失败";
  } catch (error) {
    console.error("Stage 4 Reply Error:", error);
    return "抱歉，我暂时无法生成回复。";
  }
}

// Stage 1: Intent Analysis
export async function stage1_analyze(userInput: string): Promise<Stage1Analysis> {
  const prompt = STAGE1_PROMPT.replace("{user_input}", userInput);

  try {
    const result = await callAIModel(STAGE1_MODEL, STAGE1_API_KEY, prompt, STAGE1_MODEL_NAME, "Intent Analysis Failed");
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
  history: string
): Promise<UserProfile | null> {
  console.log('Stage 5 is temporarily disabled by user request.');
  return null;
}

// Helper: Generate Conversation Title
export async function generateTitle(userMessage: string, aiReply: string): Promise<string> {
  const prompt = `
    Task: Generate a very short, concise title (max 10 chars) for this conversation.
    User: ${userMessage.slice(0, 200)}
    AI: ${aiReply.slice(0, 200)}
    Title (No quotes, just text):
  `.trim();

  try {
    // Use STAGE1 settings (usually faster/cheaper model) for this simple task
    const title = await callAIModel(STAGE1_MODEL, STAGE1_API_KEY, prompt, STAGE1_MODEL_NAME, "New Chat");
    return title.replace(/["《》]/g, "").trim().slice(0, 15);
  } catch (e) {
    console.error("Title Generation Failed:", e);
    return "";
  }
}

function parseJsonResult(text: string): any {
  try {
    let jsonStr = text;

    // 1. Try to extract JSON object from the text using regex
    // This looks for the first '{' and the last '}' to capture the full object
    // effectively ignoring any preamble or postscript text.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // 2. Parse the extracted string
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Stage 5 JSON Parse Error:", e);
    console.log("Raw Content:", text); // Log raw content for debugging
    
    // Return empty object instead of crashing, to allow pipeline to continue
    // but with a special flag/log if needed
    return { analysis_log: "JSON Parsing Failed. Check backend logs for Raw Content." };
  }
}
