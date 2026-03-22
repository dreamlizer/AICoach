import OpenAI from "openai";
import { COMMON_DEEPSEEK_KEY, COMMON_DOUBAO_KEY, ModelProvider } from "@/lib/stage_settings";

export type ReasoningEffort = "low" | "medium" | "high" | "minimal" | null;

export async function createAssessmentStream(params: {
  provider: ModelProvider;
  messages: any[];
  doubaoModel: string;
  deepseekModel: string;
  reasoningEffort?: ReasoningEffort;
}) {
  if (params.provider === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY || COMMON_DEEPSEEK_KEY;
    if (!apiKey) throw new Error("DeepSeek API Key missing");
    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey,
      timeout: 180000
    });
    return openai.chat.completions.create({
      messages: params.messages,
      model: params.deepseekModel,
      stream: true
    });
  }

  const apiKey = process.env.DOUBAO_API_KEY || COMMON_DOUBAO_KEY;
  if (!apiKey) throw new Error("Doubao API Key missing");
  const openai = new OpenAI({
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    apiKey,
    timeout: 180000
  });
  const requestOptions: any = {
    messages: params.messages,
    model: params.doubaoModel,
    stream: true
  };
  if (params.reasoningEffort) {
    requestOptions.reasoning_effort = params.reasoningEffort;
  }
  return openai.chat.completions.create(requestOptions);
}

const stripThinkingFromChunk = (input: string, state: { inThink: boolean; pending: string }) => {
  const thinkTag = "<think>";
  const endTag = "</think>";
  let text = state.pending + input;
  state.pending = "";
  let output = "";

  const partialIndex = text.lastIndexOf("<think");
  if (!state.inThink && partialIndex >= 0 && !text.slice(partialIndex).includes(">")) {
    state.pending = text.slice(partialIndex);
    text = text.slice(0, partialIndex);
  }

  while (text.length > 0) {
    if (state.inThink) {
      const endIndex = text.indexOf(endTag);
      if (endIndex === -1) {
        return output;
      }
      text = text.slice(endIndex + endTag.length);
      state.inThink = false;
      continue;
    }

    const startIndex = text.indexOf(thinkTag);
    if (startIndex === -1) {
      output += text;
      break;
    }
    output += text.slice(0, startIndex);
    text = text.slice(startIndex + thinkTag.length);
    state.inThink = true;
  }

  return output;
};

export function createSseResponse(stream: any) {
  const encoder = new TextEncoder();
  const thinkingState = { inThink: false, pending: "" };
  return new Response(new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta || {};
        const content = delta?.content || "";
        const cleaned = content ? stripThinkingFromChunk(content, thinkingState) : "";
        if (cleaned) {
          controller.enqueue(encoder.encode(cleaned));
        }
      }
      controller.close();
    }
  }), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
