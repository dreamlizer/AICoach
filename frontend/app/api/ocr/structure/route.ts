import OpenAI from "openai";
import { NextResponse } from "next/server";
import { COMMON_DEEPSEEK_KEY, MODEL_ID_DEEPSEEK_CHAT } from "@/lib/stage_settings";
import { defaultOcrStylePresetId, getOcrStylePreset, type OcrStylePresetId } from "@/lib/ocr_style_presets";
import { loadServerEnv } from "@/lib/server/chat/env";

type Payload = {
  content?: string;
  style?: OcrStylePresetId;
};

function getClient() {
  const { deepseek } = loadServerEnv();
  const apiKey = deepseek || COMMON_DEEPSEEK_KEY;
  if (!apiKey) {
    throw new Error("未检测到 DeepSeek API Key，请检查云端 .env.local 或 .env 中是否配置了 DEEPSEEK_API_KEY。");
  }

  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
    timeout: 180000,
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const content = payload.content?.trim();
    const stylePreset = getOcrStylePreset(payload.style || defaultOcrStylePresetId);

    if (!content) {
      return NextResponse.json({ error: "没有可整理的文本内容。" }, { status: 400 });
    }

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODEL_ID_DEEPSEEK_CHAT,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "你是 OCR 文稿整理助手。请保留原意，不要虚构内容，不要补充事实，只做轻度清洗：合并断行、去掉明显重复、保留段落、修正少量 OCR 噪声。输出纯文本，不要返回 JSON，不要包 Markdown 代码块。",
        },
        {
          role: "user",
          content: [
            "请整理下面这份 OCR 文本。",
            stylePreset.aiInstruction,
            "要求：",
            "1. 保留原意，不补充事实。",
            "2. 清理明显 OCR 噪声、断行和重复。",
            "3. 输出可直接阅读和继续编辑的中文文稿。",
            "",
            content,
          ].join("\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "模型没有返回整理内容。" }, { status: 502 });
    }

    return NextResponse.json({
      title: `OCR ${stylePreset.label}`,
      content: raw,
      usage: {
        totalTokens: completion.usage?.total_tokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR 整理接口失败。";
    const status = message.includes("DeepSeek API Key") || message.includes("DEEPSEEK_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
